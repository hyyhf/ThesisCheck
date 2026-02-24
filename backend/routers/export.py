"""Export API router for generating review reports."""

import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from models.schemas import ExportRequest, OverallCommentExportRequest
from services.export_service import generate_review_report, generate_comment_report

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["export"])


@router.post("/export/docx")
async def export_docx(request: ExportRequest):
    """Export review comments as a Word document (.docx)."""
    buffer = generate_review_report(
        comments=request.comments,
        summary=request.summary,
        document_title=request.document_title,
    )

    filename = f"{request.document_title}_review_report.docx"

    return StreamingResponse(
        buffer,
        media_type=(
            "application/vnd.openxmlformats-officedocument"
            ".wordprocessingml.document"
        ),
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.post("/export/comment/docx")
async def export_comment_docx(request: OverallCommentExportRequest):
    """Export overall comment as a Word document (.docx)."""
    buffer = generate_comment_report(
        comment_text=request.comment_text,
        document_title=request.document_title,
    )

    filename = f"{request.document_title}_overall_comment.docx"

    return StreamingResponse(
        buffer,
        media_type=(
            "application/vnd.openxmlformats-officedocument"
            ".wordprocessingml.document"
        ),
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
