from enum import Enum as PyEnum


class UserRole(str, PyEnum):
    user = "user"
    employee = "employee"
    admin = "admin"


class TokenType(str, PyEnum):
    access = "access"
    refresh = "refresh"
