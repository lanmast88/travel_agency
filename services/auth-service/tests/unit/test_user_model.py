"""
Тесты User model — только mutation guards для методов бизнес-логики.
Эти тесты ломаются при замене >= на > или при перестановке условий.
"""
from datetime import datetime, timedelta, timezone

import pytest

from tests.factories import make_user


class TestIsLocked:
    def test_not_locked_when_locked_until_is_none(self) -> None:
        assert make_user(locked_until=None).is_locked is False

    def test_locked_when_future(self) -> None:
        future = datetime.now(timezone.utc) + timedelta(minutes=10)
        assert make_user(locked_until=future).is_locked is True

    def test_not_locked_when_past(self) -> None:
        """Граничный случай: lock истёк — пользователь должен быть разблокирован."""
        past = datetime.now(timezone.utc) - timedelta(seconds=1)
        assert make_user(locked_until=past).is_locked is False


class TestRecordFailedAttempt:
    def test_no_lock_one_below_threshold(self) -> None:
        """Mutation guard: при 4/5 попытках блокировки ещё нет (>= не >)."""
        user = make_user(failed_login_attempts=3)
        user.record_failed_attempt(max_attempts=5, lock_minutes=5)
        assert user.failed_login_attempts == 4
        assert user.is_locked is False

    def test_locks_at_exactly_max_attempts(self) -> None:
        """Mutation guard: ровно на max_attempts — блокировка наступает."""
        user = make_user(failed_login_attempts=4)
        user.record_failed_attempt(max_attempts=5, lock_minutes=10)
        assert user.is_locked is True


class TestResetLoginAttempts:
    def test_resets_counter_and_removes_lock(self) -> None:
        """Mutation guard: успешный логин должен полностью снять блокировку."""
        future = datetime.now(timezone.utc) + timedelta(hours=1)
        user = make_user(failed_login_attempts=5, locked_until=future)
        user.reset_login_attempts()
        assert user.failed_login_attempts == 0
        assert user.locked_until is None
        assert not user.is_locked
