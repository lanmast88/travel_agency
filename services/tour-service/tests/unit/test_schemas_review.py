"""
Тесты валидации схем отзыва.
"""
import uuid

import pytest

from app.schemas.review import ReviewCreate, ReviewUpdate


class TestReviewCreateValidation:
    def _base(self, **overrides: object) -> dict:
        return {
            "tour_id": uuid.uuid4(),
            "rating": 5,
            **overrides,
        }

    def test_valid(self) -> None:
        ReviewCreate(**self._base())

    def test_rating_min(self) -> None:
        r = ReviewCreate(**self._base(rating=1))
        assert r.rating == 1

    def test_rating_max(self) -> None:
        r = ReviewCreate(**self._base(rating=5))
        assert r.rating == 5

    def test_rating_below_min_raises(self) -> None:
        with pytest.raises(Exception):
            ReviewCreate(**self._base(rating=0))

    def test_rating_above_max_raises(self) -> None:
        with pytest.raises(Exception):
            ReviewCreate(**self._base(rating=6))

    def test_empty_comment_becomes_none(self) -> None:
        r = ReviewCreate(**self._base(comment=""))
        assert r.comment is None

    def test_whitespace_comment_becomes_none(self) -> None:
        r = ReviewCreate(**self._base(comment="   "))
        assert r.comment is None

    def test_comment_stripped(self) -> None:
        r = ReviewCreate(**self._base(comment="  хороший тур  "))
        assert r.comment == "хороший тур"

    def test_none_comment_stays_none(self) -> None:
        r = ReviewCreate(**self._base(comment=None))
        assert r.comment is None


class TestReviewUpdateValidation:
    def test_no_fields_no_changes(self) -> None:
        assert ReviewUpdate().has_changes() is False

    def test_rating_has_changes(self) -> None:
        assert ReviewUpdate(rating=4).has_changes() is True

    def test_comment_has_changes(self) -> None:
        assert ReviewUpdate(comment="отличный тур").has_changes() is True

    def test_empty_comment_becomes_none(self) -> None:
        u = ReviewUpdate(comment="")
        assert u.comment is None

    def test_whitespace_comment_becomes_none(self) -> None:
        u = ReviewUpdate(comment="  ")
        assert u.comment is None

    def test_rating_below_min_raises(self) -> None:
        with pytest.raises(Exception):
            ReviewUpdate(rating=0)

    def test_rating_above_max_raises(self) -> None:
        with pytest.raises(Exception):
            ReviewUpdate(rating=6)
