"""Review API router with standard and streaming endpoints."""

import logging

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from models.schemas import (
    HealthCheckRequest,
    HealthCheckResponse,
    ReviewRequest,
    ReviewResponse,
)
from services import llm_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["review"])


@router.post("/health", response_model=HealthCheckResponse)
async def health_check(request: HealthCheckRequest) -> HealthCheckResponse:
    """Verify API key and base URL connectivity."""
    success, message = await llm_service.check_api_health(
        api_key=request.api_key,
        base_url=request.base_url,
        model_name=request.model_name,
    )
    return HealthCheckResponse(
        status="ok" if success else "error",
        message=message,
    )


@router.post("/review", response_model=ReviewResponse)
async def review(request: ReviewRequest) -> ReviewResponse:
    """Review paragraphs and return full response at once."""
    result = await llm_service.review_paragraphs(
        paragraphs=request.paragraphs,
        api_key=request.api_key,
        base_url=request.base_url,
        model_name=request.model_name,
    )
    return result


@router.post("/review/stream")
async def review_stream(request: ReviewRequest):
    """Review paragraphs with SSE streaming output.

    Events:
        - progress: {"current_batch": int, "total_batches": int, "message": str}
        - text: {"content": str}
        - comment: ReviewComment JSON
        - error: {"message": str}
        - done: {}
    """

    async def event_generator():
        async for event in llm_service.review_paragraphs_stream(
            paragraphs=request.paragraphs,
            api_key=request.api_key,
            base_url=request.base_url,
            model_name=request.model_name,
        ):
            yield event

    return EventSourceResponse(event_generator())


@router.post("/review/comment/stream")
async def overall_comment_stream(request: ReviewRequest):
    """Generate overall thesis comment with SSE streaming output.

    Events:
        - text: {"content": str}
        - error: {"message": str}
        - done: {}
    """

    async def event_generator():
        async for event in llm_service.generate_overall_comment_stream(
            paragraphs=request.paragraphs,
            api_key=request.api_key,
            base_url=request.base_url,
            model_name=request.model_name,
        ):
            yield event

    return EventSourceResponse(event_generator())
