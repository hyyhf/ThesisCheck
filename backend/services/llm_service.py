"""LLM service for thesis review using OpenAI SDK."""

import json
import logging
from collections.abc import AsyncGenerator

from openai import AsyncOpenAI

from models.schemas import ParagraphData, ReviewComment, ReviewResponse
from prompts.thesis_review import (
    build_review_messages,
    build_section_review_messages,
    build_comment_messages,
    detect_sections,
    generate_outline,
)

logger = logging.getLogger(__name__)


def extract_comments_from_json(
    json_str: str,
) -> list[ReviewComment]:
    """Parse JSON string and extract review comments.

    Args:
        json_str: JSON string from LLM response.

    Returns:
        List of ReviewComment objects.
    """
    try:
        data = json.loads(json_str)
        comments = []
        raw_comments = data.get("comments", [])
        for c in raw_comments:
            try:
                comments.append(
                    ReviewComment(
                        paragraph_index=c.get("paragraph_index", 0),
                        target_text=c.get("target_text", ""),
                        comment=c.get("comment", ""),
                        severity=c.get("severity", "suggestion"),
                    )
                )
            except Exception:
                logger.warning("Skipping malformed comment: %s", c)
                continue
        return comments
    except json.JSONDecodeError as e:
        logger.error("Failed to parse LLM JSON response: %s", e)
        return []


def try_extract_single_comment(json_str: str) -> ReviewComment | None:
    """Try to parse a single comment object from a JSON string fragment.

    Args:
        json_str: A potential JSON object string.

    Returns:
        ReviewComment if valid, None otherwise.
    """
    try:
        c = json.loads(json_str)
        if isinstance(c, dict) and "target_text" in c and "comment" in c:
            return ReviewComment(
                paragraph_index=c.get("paragraph_index", 0),
                target_text=c.get("target_text", ""),
                comment=c.get("comment", ""),
                severity=c.get("severity", "suggestion"),
            )
    except (json.JSONDecodeError, Exception):
        pass
    return None


async def check_api_health(
    api_key: str,
    base_url: str,
    model_name: str,
) -> tuple[bool, str]:
    """Verify API key and base URL by making a simple test request.

    Args:
        api_key: The API key to test.
        base_url: The base URL for the API.
        model_name: The model to test with.

    Returns:
        Tuple of (success: bool, message: str).
    """
    try:
        client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        response = await client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": "test"}],
            max_tokens=5,
        )
        if response.choices:
            return True, "API 连接成功"
        return False, "API 返回了空响应"
    except Exception as e:
        error_msg = str(e)
        logger.error("API health check failed: %s", error_msg)
        return False, f"API 连接失败: {error_msg}"


async def review_paragraphs(
    paragraphs: list[ParagraphData],
    api_key: str,
    base_url: str,
    model_name: str,
) -> ReviewResponse:
    """Review paragraphs using LLM (non-streaming, full response).

    Sends all paragraphs in a single request.

    Args:
        paragraphs: List of paragraphs to review.
        api_key: User's API key.
        base_url: Base URL for the API.
        model_name: Model name to use.

    Returns:
        ReviewResponse with all comments.
    """
    client = AsyncOpenAI(api_key=api_key, base_url=base_url)

    para_dicts = [{"index": p.index, "text": p.text} for p in paragraphs]
    messages = build_review_messages(para_dicts)

    try:
        response = await client.chat.completions.create(
            model=model_name,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        content = response.choices[0].message.content or ""
        comments = extract_comments_from_json(content)
    except Exception as e:
        logger.error("LLM review failed: %s", e)
        comments = []

    return ReviewResponse(comments=comments, summary="")


async def _stream_single_batch(
    client: AsyncOpenAI,
    model_name: str,
    messages: list[dict],
) -> AsyncGenerator[tuple[str, str | ReviewComment], None]:
    """Stream a single LLM call, yielding text chunks and parsed comments.

    Args:
        client: OpenAI async client.
        model_name: Model name.
        messages: Chat messages.

    Yields:
        Tuples of (event_type, data) where event_type is "text" or "comment".
    """
    response = await client.chat.completions.create(
        model=model_name,
        messages=messages,
        response_format={"type": "json_object"},
        temperature=0.3,
        stream=True,
    )

    buffer = ""
    in_comments_array = False
    brace_depth = 0
    current_object_start = -1
    emitted_count = 0

    async for chunk in response:
        delta = chunk.choices[0].delta
        if delta.content:
            buffer += delta.content

            # Yield raw text chunk
            yield ("text", delta.content)

            # Incremental parsing for comment objects
            i = len(buffer) - len(delta.content)
            if i < 0:
                i = 0

            while i < len(buffer):
                char = buffer[i]

                if not in_comments_array:
                    if char == "[" and '"comments"' in buffer[:i]:
                        in_comments_array = True
                else:
                    if char == "{":
                        if brace_depth == 0:
                            current_object_start = i
                        brace_depth += 1
                    elif char == "}":
                        brace_depth -= 1
                        if brace_depth == 0 and current_object_start >= 0:
                            obj_str = buffer[current_object_start : i + 1]
                            comment = try_extract_single_comment(obj_str)
                            if comment:
                                emitted_count += 1
                                yield ("comment", comment)
                            current_object_start = -1
                    elif char == "]":
                        in_comments_array = False

                i += 1

    # If no comments were emitted during streaming, try full parse
    if emitted_count == 0:
        comments = extract_comments_from_json(buffer)
        for comment in comments:
            yield ("comment", comment)


async def review_paragraphs_stream(
    paragraphs: list[ParagraphData],
    api_key: str,
    base_url: str,
    model_name: str,
) -> AsyncGenerator[dict, None]:
    """Review paragraphs with chapter-based batching and streaming.

    Detects thesis structure (chapters/sections), then reviews each
    section independently with context-rich prompts. Each batch streams
    comments incrementally via SSE events.

    Args:
        paragraphs: List of paragraphs to review.
        api_key: User's API key.
        base_url: Base URL for the API.
        model_name: Model name to use.

    Yields:
        Dict with 'event' and 'data' keys for SSE.
    """
    client = AsyncOpenAI(api_key=api_key, base_url=base_url)

    para_dicts = [{"index": p.index, "text": p.text} for p in paragraphs]

    # Step 1: Detect sections and create batches
    all_sections = detect_sections(para_dicts)
    outline = generate_outline(all_sections)

    # Skip cover and table-of-contents sections (no need to review)
    _SKIP_TYPES = {"cover", "toc"}
    sections = [s for s in all_sections if s.section_type not in _SKIP_TYPES]
    skipped = [s.name for s in all_sections if s.section_type in _SKIP_TYPES]
    total_batches = len(sections)

    logger.info(
        "Detected %d sections, reviewing %d (skipped: %s): %s",
        len(all_sections),
        total_batches,
        skipped,
        [s.name for s in sections],
    )

    # Signal that streaming has started with section info
    yield {
        "event": "progress",
        "data": json.dumps(
            {
                "current_batch": 0,
                "total_batches": total_batches,
                "message": f"已检测到 {len(all_sections)} 个章节，跳过封面/目录，评审 {total_batches} 个部分...",
            }
        ),
    }

    # Step 2: Review each section
    for batch_idx, section in enumerate(sections, 1):
        section_label = f"{batch_idx}/{total_batches}: {section.name}"
        logger.info("Reviewing section %s", section_label)

        # Send progress event for this batch
        yield {
            "event": "progress",
            "data": json.dumps(
                {
                    "current_batch": batch_idx,
                    "total_batches": total_batches,
                    "message": f"正在评审第 {section_label}",
                }
            ),
        }

        # Build context-rich messages for this section
        messages = build_section_review_messages(
            section=section,
            outline=outline,
            batch_index=batch_idx,
            total_batches=total_batches,
        )

        try:
            async for event_type, data in _stream_single_batch(
                client, model_name, messages
            ):
                if event_type == "text":
                    yield {
                        "event": "text",
                        "data": json.dumps({"content": data}),
                    }
                elif event_type == "comment":
                    yield {
                        "event": "comment",
                        "data": data.model_dump_json(),
                    }

        except Exception as e:
            logger.error(
                "LLM streaming review failed for section '%s': %s",
                section.name,
                e,
            )
            yield {
                "event": "error",
                "data": json.dumps(
                    {"message": f"评审 {section.name} 出错: {str(e)}"}
                ),
            }
            # Continue with next section rather than aborting entirely
            continue

    # Signal completion
    yield {"event": "done", "data": "{}"}


async def generate_overall_comment_stream(
    paragraphs: list[ParagraphData],
    api_key: str,
    base_url: str,
    model_name: str,
) -> AsyncGenerator[dict, None]:
    """Generate an overall comment for the thesis using streaming.

    Sends all paragraphs at once and streams the plain text response
    token by token.

    Args:
        paragraphs: List of paragraphs.
        api_key: User's API key.
        base_url: Base URL for the API.
        model_name: Model name to use.

    Yields:
        Dict with 'event' and 'data' keys for SSE.
    """
    client = AsyncOpenAI(api_key=api_key, base_url=base_url)

    para_dicts = [{"index": p.index, "text": p.text} for p in paragraphs]
    messages = build_comment_messages(para_dicts)

    try:
        response = await client.chat.completions.create(
            model=model_name,
            messages=messages,
            temperature=0.4,
            stream=True,
        )

        async for chunk in response:
            delta = chunk.choices[0].delta
            if delta.content:
                yield {
                    "event": "text",
                    "data": json.dumps({"content": delta.content}),
                }

    except Exception as e:
        logger.error("Overall comment generation failed: %s", e)
        yield {
            "event": "error",
            "data": json.dumps(
                {"message": f"全文评语生成出错: {str(e)}"}
            ),
        }

    # Signal completion
    yield {"event": "done", "data": "{}"}
