import base64
from functools import lru_cache

from cryptography.hazmat.primitives.asymmetric.ec import EllipticCurvePublicKey
from cryptography.hazmat.primitives.serialization import load_pem_public_key

from app.core.config import settings


def _b64url(n: int, byte_length: int = 32) -> str:
    """Кодирует целое число в base64url без padding (RFC 7518 §2)."""
    return base64.urlsafe_b64encode(n.to_bytes(byte_length, "big")).rstrip(b"=").decode()


@lru_cache(maxsize=1)
def build_jwks() -> dict:
    """Строит JWKS из текущего публичного ключа.

    Результат кешируется через lru_cache — ключ не меняется в runtime,
    повторные вызовы бесплатны. Кеш сбрасывается только при перезапуске сервиса,
    что совпадает с единственным сценарием смены ключа (ротация → деплой).
    """
    key = load_pem_public_key(settings.jwt_public_key.encode())

    if not isinstance(key, EllipticCurvePublicKey):
        raise TypeError(f"Ожидается EC ключ (ES256/ES384), получен {type(key).__name__}")

    nums = key.public_numbers()

    return {
        "keys": [
            {
                "kty": "EC",
                "use": "sig",
                "alg": settings.jwt_algorithm,
                "kid": settings.jwt_key_id,
                "crv": "P-256",
                "x": _b64url(nums.x),
                "y": _b64url(nums.y),
            }
        ]
    }
