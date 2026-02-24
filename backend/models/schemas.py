"""Pydantic schemas for request/response models."""

from pydantic import BaseModel


class ParagraphData(BaseModel):
    """Single paragraph from the document."""

    index: int
    text: str


class ReviewRequest(BaseModel):
    """Request body for review endpoints."""

    paragraphs: list[ParagraphData]
    api_key: str
    base_url: str
    model_name: str


class ReviewComment(BaseModel):
    """A single review comment from LLM."""

    paragraph_index: int
    target_text: str
    comment: str
    severity: str  # "error" | "warning" | "suggestion"


class ReviewResponse(BaseModel):
    """Full review response."""

    comments: list[ReviewComment]
    summary: str


class HealthCheckRequest(BaseModel):
    """Request body for health check."""

    api_key: str
    base_url: str
    model_name: str


class HealthCheckResponse(BaseModel):
    """Response for health check."""

    status: str
    message: str


class ExportRequest(BaseModel):
    """Request body for export endpoint."""

    comments: list[ReviewComment]
    summary: str
    document_title: str


class OverallCommentExportRequest(BaseModel):
    """Request body for overall comment export endpoint."""

    comment_text: str
    document_title: str
