from fastapi import APIRouter

from app.routers.auth import router as auth_router
from app.routers.users import router as users_router

router = APIRouter()
router.include_router(auth_router)
router.include_router(users_router)
