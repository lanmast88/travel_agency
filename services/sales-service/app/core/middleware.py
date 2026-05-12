import uuid

from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.logging_config import set_trace_id


class TraceIDMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self._app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self._app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        trace_id = headers.get(b"x-request-id", b"").decode() or str(uuid.uuid4())
        set_trace_id(trace_id)

        async def _send_with_trace_header(message: dict) -> None:
            if message["type"] == "http.response.start":
                existing = list(message.get("headers", []))
                existing.append((b"x-request-id", trace_id.encode()))
                message = {**message, "headers": existing}
            await send(message)

        await self._app(scope, receive, _send_with_trace_header)
