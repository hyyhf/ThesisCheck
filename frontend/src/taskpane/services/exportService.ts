/**
 * Export service for downloading review reports as .docx files.
 */

import type { ReviewComment } from "./api";

/**
 * Export review comments as a .docx file via the backend.
 */
export async function exportReviewReport(
    comments: ReviewComment[],
    summary: string,
    documentTitle: string,
    backendUrl: string,
): Promise<void> {
    const response = await fetch(`${backendUrl}/api/export/docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            comments,
            summary,
            document_title: documentTitle,
        }),
    });

    if (!response.ok) {
        throw new Error(`Export failed: HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${documentTitle}_review_report.docx`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

/**
 * Export overall comment as a .docx file via the backend.
 */
export async function exportCommentReport(
    commentText: string,
    documentTitle: string,
    backendUrl: string,
): Promise<void> {
    const response = await fetch(`${backendUrl}/api/export/comment/docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            comment_text: commentText,
            document_title: documentTitle,
        }),
    });

    if (!response.ok) {
        throw new Error(`Export failed: HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${documentTitle}_overall_comment.docx`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}
