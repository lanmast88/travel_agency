"""Рекомендательная система похожих туров.

Content-based подход: структурные признаки (город, питание, звёзды,
длительность, цена) с весом 0.7 + TF-IDF по описаниям с весом 0.3.
Веса подобраны по метрикам CHR@5, Coverage и ILD@5.

Матрица строится один раз при старте сервиса из активных туров в БД
и хранится в памяти. При изменении каталога требуется перезапуск.
"""

import logging
from uuid import UUID

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler, OneHotEncoder
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.enums import TourStatus
from app.models.tour import Tour

logger = logging.getLogger(__name__)

_STRUCT_WEIGHT = 0.7
_TEXT_WEIGHT = 0.3

_tour_ids: list[UUID] = []
_idx_map: dict[UUID, int] = {}
_sim_matrix: np.ndarray | None = None


async def build(session: AsyncSession) -> None:
    """Загружает активные туры из БД и строит матрицу косинусной схожести."""
    global _tour_ids, _idx_map, _sim_matrix

    result = await session.scalars(
        select(Tour)
        .where(Tour.status == TourStatus.active)
        .options(selectinload(Tour.hotel))
    )
    tours = list(result.all())

    if len(tours) < 2:
        logger.warning(
            "Недостаточно активных туров (%d) для построения матрицы рекомендаций",
            len(tours),
        )
        return

    new_ids = [t.id for t in tours]

    city_enc = OneHotEncoder(sparse_output=False, handle_unknown="ignore")
    meal_enc = OneHotEncoder(sparse_output=False, handle_unknown="ignore")
    cat_enc = OneHotEncoder(sparse_output=False, handle_unknown="ignore")

    city_matrix = city_enc.fit_transform([[str(t.city_id)] for t in tours])
    meal_matrix = meal_enc.fit_transform([[t.meal_type.value] for t in tours])
    cat_matrix = cat_enc.fit_transform([[t.category.value] for t in tours])

    num_raw = np.array(
        [[t.hotel.stars, t.duration_nights, float(np.log1p(float(t.price)))] for t in tours],
        dtype=np.float64,
    )
    num_matrix = MinMaxScaler().fit_transform(num_raw)

    struct_matrix = np.hstack([city_matrix, meal_matrix, cat_matrix, num_matrix])

    descriptions = [t.description or "" for t in tours]
    tfidf_matrix = (
        TfidfVectorizer(max_features=200, ngram_range=(1, 2))
        .fit_transform(descriptions)
        .toarray()
    )

    sim_struct = cosine_similarity(struct_matrix)
    sim_text = cosine_similarity(tfidf_matrix)
    new_matrix = _STRUCT_WEIGHT * sim_struct + _TEXT_WEIGHT * sim_text

    # Атомарно обновляем состояние — только после успешного вычисления
    _tour_ids = new_ids
    _idx_map = {tid: i for i, tid in enumerate(new_ids)}
    _sim_matrix = new_matrix

    logger.info("Матрица рекомендаций построена: %d активных туров", len(tours))


def get_similar(tour_id: UUID, top_k: int = 5) -> list[tuple[UUID, float]]:
    """Возвращает до top_k идентификаторов похожих туров с оценкой схожести."""
    if _sim_matrix is None:
        return []
    idx = _idx_map.get(tour_id)
    if idx is None:
        return []

    scores = _sim_matrix[idx]
    top_idx = np.argsort(scores)[::-1][1 : top_k + 1]
    return [(_tour_ids[i], round(float(scores[i]), 4)) for i in top_idx]


def is_ready() -> bool:
    return _sim_matrix is not None
