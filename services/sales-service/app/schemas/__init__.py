# Импорт всех схем для удобного использования в роутерах и сервисах
from app.schemas.common import (
    BaseUpdateSchema,
    PaginatedResponse,
    PaginationParams,
    normalize_optional_str,
    normalize_str,
)
from app.schemas.sale import (
    SaleCreate,
    SaleFilters,
    SaleListItemResponse,
    SaleResponse,
)

__all__ = [
    "normalize_str",
    "normalize_optional_str",
    "BaseUpdateSchema",
    "PaginationParams",
    "PaginatedResponse",
    "SaleCreate",
    "SaleResponse",
    "SaleListItemResponse",
    "SaleFilters",
]
