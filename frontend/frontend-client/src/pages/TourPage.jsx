import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert, CircularProgress, Rating } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { fetchSimilarTours, fetchTour } from "../features/tours/toursSlice";
import {
  clearCreateState,
  clearMutateState,
  createReview,
  deleteReview,
  fetchReviews,
  updateReview,
} from "../features/reviews/reviewsSlice";
import { openAuthDialog } from "../features/auth/authSlice";

const MEAL_LABELS = {
  none: "Без питания",
  breakfast: "Завтраки",
  half_board: "Полупансион",
  full_board: "Полный пансион",
  all_inclusive: "Всё включено",
};

function formatDate(d) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(d));
}

function formatPrice(p) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(p));
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M19 12H5M5 12l7 7M5 12l7-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4 text-amber-400"
      aria-hidden="true"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function ReviewItem({
  review,
  currentUserId,
  onEdit,
  onDelete,
  deleteLoading,
}) {
  const isOwn = review.client_id === currentUserId;
  const date = new Intl.DateTimeFormat("ru-RU").format(
    new Date(review.created_at),
  );
  const edited = review.updated_at !== review.created_at;

  return (
    <div className="flex gap-4 py-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-extrabold text-brand-500">
        {isOwn ? "Я" : "?"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-sm font-bold text-slate-800">
              {isOwn ? "Вы" : "Путешественник"}
            </span>
            <span className="ml-2 text-xs text-slate-400">
              {date}
              {edited ? " · изменено" : ""}
            </span>
          </div>
          <Rating value={review.rating} readOnly size="small" />
        </div>
        {review.comment && (
          <p className="mt-1.5 text-sm font-medium text-slate-600 leading-relaxed">
            {review.comment}
          </p>
        )}
        {isOwn && (
          <div className="mt-2 flex gap-3">
            <button
              onClick={() => onEdit(review)}
              className="text-xs font-bold text-brand-500 hover:underline"
            >
              Изменить
            </button>
            <button
              onClick={() => onDelete(review.id)}
              disabled={deleteLoading}
              className="text-xs font-bold text-rose-500 hover:underline disabled:opacity-50"
            >
              Удалить
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewForm({ tourId, existingReview, onCancel }) {
  const dispatch = useDispatch();
  const { createStatus, createError, mutateStatus, mutateError } = useSelector(
    (s) => s.reviews,
  );
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [comment, setComment] = useState(existingReview?.comment ?? "");

  const isEdit = Boolean(existingReview);
  const loading = isEdit
    ? mutateStatus === "loading"
    : createStatus === "loading";
  const error = isEdit ? mutateError : createError;

  useEffect(() => {
    if (createStatus === "succeeded") {
      dispatch(clearCreateState());
      setRating(0);
      setComment("");
    }
  }, [createStatus, dispatch]);

  useEffect(() => {
    if (mutateStatus === "succeeded") {
      dispatch(clearMutateState());
      onCancel?.();
    }
  }, [mutateStatus, dispatch, onCancel]);

  function handleSubmit(e) {
    e.preventDefault();
    if (rating === 0) return;
    if (isEdit)
      dispatch(
        updateReview({
          id: existingReview.id,
          rating,
          comment: comment || null,
        }),
      );
    else
      dispatch(
        createReview({ tour_id: tourId, rating, comment: comment || null }),
      );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[20px] border border-brand-100 bg-brand-50/50 p-5 space-y-4"
    >
      <p className="text-sm font-bold text-slate-700">
        {isEdit ? "Редактировать отзыв" : "Ваш отзыв"}
      </p>
      {error && (
        <Alert severity="error" className="!rounded-2xl !text-sm">
          {error}
        </Alert>
      )}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-slate-500">Оценка</span>
        <Rating value={rating} onChange={(_, v) => setRating(v ?? 0)} />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">
          Комментарий · <span className="normal-case">необязательно</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={2000}
          rows={3}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none resize-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={loading || rating === 0}
          className="rounded-2xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <CircularProgress size={14} color="inherit" />}
          {isEdit ? "Сохранить" : "Отправить"}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Отмена
          </button>
        )}
      </div>
    </form>
  );
}

export default function TourPage() {
  const { tourId } = useParams();
  const dispatch = useDispatch();
  const {
    currentTour: t,
    currentTourStatus,
    currentTourError,
    similarTours,
    similarToursStatus,
  } = useSelector((s) => s.tours);
  const {
    items: reviews,
    total: reviewTotal,
    status: reviewStatus,
    mutateStatus,
  } = useSelector((s) => s.reviews);
  const { currentUser, accessToken } = useSelector((s) => s.auth);
  const [editingReview, setEditingReview] = useState(null);

  useEffect(() => {
    dispatch(fetchTour(tourId));
    dispatch(fetchReviews({ tourId, page: 1, pageSize: 50 }));
    dispatch(fetchSimilarTours(tourId));
  }, [dispatch, tourId]);

  const myReview = reviews.find((r) => r.client_id === currentUser?.id);
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  function handleDelete(reviewId) {
    dispatch(deleteReview(reviewId));
  }

  if (currentTourStatus === "loading") {
    return (
      <div className="flex justify-center py-32">
        <CircularProgress />
      </div>
    );
  }
  if (currentTourStatus === "failed") {
    return (
      <div className="px-6 py-5">
        <Alert severity="error" className="!rounded-2xl">
          {currentTourError}
        </Alert>
      </div>
    );
  }
  if (!t) return null;

  const gradients = [
    "from-blue-400 to-indigo-500",
    "from-teal-400 to-cyan-500",
    "from-violet-400 to-purple-500",
    "from-orange-400 to-rose-500",
  ];
  const gradient = gradients[t.name.charCodeAt(0) % gradients.length];

  return (
    <div className="space-y-6">
      {/* Назад */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-600 transition no-underline"
      >
        <BackIcon /> Назад к каталогу
      </Link>

      {/* Шапка */}
      <section
        className={`overflow-hidden rounded-[28px] p-8 text-white relative ${t.photo_url ? "" : `bg-gradient-to-br ${gradient}`}`}
      >
        {t.photo_url && (
          <img
            src={t.photo_url}
            alt={t.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className={`absolute inset-0 ${t.photo_url ? "bg-black/45" : "bg-black/15"}`} />
        <div className="relative space-y-3">
          <div className="flex flex-wrap gap-2">
            {t.is_hot && (
              <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-sm">
                🔥 Горящий тур
              </span>
            )}
            {t.available === 0 && (
              <span className="inline-flex items-center rounded-full bg-rose-500/80 px-3 py-1 text-xs font-bold">
                Мест нет
              </span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">{t.name}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/80 text-sm font-semibold">
            <span>
              📍 {t.city.name}, {t.city.country}
            </span>
            <span>
              🏨 {t.hotel.name} {t.hotel.stars}★
            </span>
            <span>
              📅 {formatDate(t.start_date)} — {formatDate(t.end_date)}
            </span>
            <span>🌙 {t.duration_nights} ночей</span>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Левая колонка */}
        <div className="space-y-5">
          {/* Описание */}
          {t.description && (
            <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900 mb-3">
                Описание
              </h2>
              <p className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-line">
                {t.description}
              </p>
            </section>
          )}

          {/* Отзывы */}
          <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                Отзывы
                {reviewTotal > 0 && (
                  <span className="ml-2 text-base font-semibold text-slate-400">
                    ({reviewTotal})
                  </span>
                )}
              </h2>
              {avgRating && (
                <div className="flex items-center gap-1.5">
                  <StarIcon />
                  <span className="text-lg font-extrabold text-slate-900">
                    {avgRating}
                  </span>
                </div>
              )}
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* CTA для авторизации */}
              {!accessToken && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-sm font-semibold text-slate-500">
                    <button
                      onClick={() =>
                        dispatch(openAuthDialog({ mode: "login" }))
                      }
                      className="font-bold text-brand-500 hover:underline"
                    >
                      Войдите
                    </button>{" "}
                    чтобы оставить отзыв
                  </p>
                </div>
              )}

              {/* Форма нового отзыва */}
              {accessToken && !myReview && !editingReview && (
                <ReviewForm tourId={tourId} />
              )}

              {/* Список отзывов */}
              {reviewStatus === "loading" && (
                <div className="flex justify-center py-8">
                  <CircularProgress size={28} />
                </div>
              )}
              {reviewStatus === "succeeded" && reviews.length === 0 && (
                <p className="py-6 text-center text-sm font-semibold text-slate-400">
                  Отзывов пока нет — будьте первым!
                </p>
              )}

              <div className="divide-y divide-slate-100">
                {reviews.map((r) =>
                  editingReview?.id === r.id ? (
                    <div key={r.id} className="py-5">
                      <ReviewForm
                        tourId={tourId}
                        existingReview={r}
                        onCancel={() => setEditingReview(null)}
                      />
                    </div>
                  ) : (
                    <ReviewItem
                      key={r.id}
                      review={r}
                      currentUserId={currentUser?.id}
                      onEdit={setEditingReview}
                      onDelete={handleDelete}
                      deleteLoading={mutateStatus === "loading"}
                    />
                  ),
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Правая колонка — карточка бронирования */}
        <div className="space-y-4">
          <div className="sticky top-6 rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60 space-y-5">
            <div>
              <p className="text-3xl font-black text-slate-900">
                {formatPrice(t.price)}
              </p>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                за человека
              </p>
            </div>

            <div className="space-y-2.5 text-sm">
              {[
                ["Питание", MEAL_LABELS[t.meal_type]],
                ["Длительность", `${t.duration_nights} ночей`],
                ["Отель", `${t.hotel.name} ${t.hotel.stars}★`],
                ["Город", `${t.city.name}, ${t.city.country}`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-slate-400 font-semibold">{label}</span>
                  <span className="text-slate-800 font-bold text-right">
                    {value}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold">
                  Мест осталось
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${t.available === 0 ? "bg-rose-500" : t.available <= 5 ? "bg-amber-400" : "bg-emerald-500"}`}
                  />
                  <span
                    className={`font-bold ${t.available === 0 ? "text-rose-500" : t.available <= 5 ? "text-amber-600" : "text-slate-800"}`}
                  >
                    {t.available === 0 ? "Нет мест" : t.available}
                  </span>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {t.available > 0 ? (
              <>
                <button
                  onClick={() => {
                    if (!accessToken)
                      dispatch(
                        openAuthDialog({
                          mode: "login",
                          message: "Войдите, чтобы оставить заявку на тур",
                        }),
                      );
                  }}
                  className="w-full rounded-2xl bg-brand-500 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-600 active:scale-[.98]"
                >
                  Оставить заявку
                </button>
                <p className="text-xs text-center text-slate-400 font-medium">
                  Менеджер свяжется с вами в течение дня
                </p>
              </>
            ) : (
              <button
                disabled
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 text-sm font-bold text-slate-400 cursor-not-allowed"
              >
                Мест нет
              </button>
            )}
          </div>
        </div>
      </div>

      {similarToursStatus === "loading" && (
        <div className="flex justify-center py-4">
          <CircularProgress size={24} />
        </div>
      )}
      {similarToursStatus === "succeeded" && similarTours.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            Похожие туры
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {similarTours.map((s) => {
              const cardGradients = [
                "from-blue-400 to-indigo-500",
                "from-teal-400 to-cyan-500",
                "from-violet-400 to-purple-500",
                "from-orange-400 to-rose-500",
              ];
              const cardGradient =
                cardGradients[s.name.charCodeAt(0) % cardGradients.length];
              return (
                <Link
                  key={s.id}
                  to={`/tours/${s.id}`}
                  className="group flex flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60 transition hover:-translate-y-0.5 hover:shadow-md no-underline"
                >
                  <div
                    className={`relative p-5 text-white ${s.photo_url ? "" : `bg-gradient-to-br ${cardGradient}`}`}
                  >
                    {s.photo_url && (
                      <img
                        src={s.photo_url}
                        alt={s.name}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )}
                    <div className={`absolute inset-0 ${s.photo_url ? "bg-black/40" : ""}`} />
                    <div className="relative">
                      {s.is_hot && (
                        <span className="mb-2 inline-block rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold backdrop-blur-sm">
                          🔥 Горящий
                        </span>
                      )}
                      <div className="line-clamp-2 text-sm font-extrabold leading-snug">
                        {s.name}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-white/75">
                        {s.duration_nights} ночей ·{" "}
                        {MEAL_LABELS[s.meal_type] ?? s.meal_type}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-5 py-3.5">
                    <span className="text-base font-black text-slate-900">
                      {formatPrice(s.price)}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {Math.round(s.similarity * 100)}% схожесть
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
