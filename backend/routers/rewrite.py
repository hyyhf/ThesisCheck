"""Rewrite API router with streaming endpoint."""

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from models.schemas import RewriteRequest
from services import llm_service

router = APIRouter(prefix="/api", tags=["rewrite"])


@router.post("/rewrite/stream")
async def rewrite_stream(request: RewriteRequest):
    """Rewrite selected text in academic style with SSE streaming output.

    Events:
        - text: {"content": str}
        - error: {"message": str}
        - done: {}
    """

    async def event_generator():
        async for event in llm_service.rewrite_text_stream(
            original_text=request.original_text,
            requirement=request.requirement,
            api_key=request.api_key,
            base_url=request.base_url,
            model_name=request.model_name,
        ):
            yield event

    return EventSourceResponse(event_generator())
