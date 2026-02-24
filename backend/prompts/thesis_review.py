"""Prompt templates for thesis review.

Contains three sets of prompts:
1. THESIS_REVIEW - for detailed per-issue review (outputs JSON) -- used for selection review
2. SECTION_REVIEW - for chapter-based batch review (outputs JSON) -- used for full-text review
3. THESIS_COMMENT - for overall thesis evaluation (outputs plain text)
"""

import re
from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# Data structures for chapter detection and batching
# ---------------------------------------------------------------------------


@dataclass
class Section:
    """Represents a detected section/chapter in the thesis."""

    name: str
    section_type: str  # "cover", "abstract", "chapter", "references", "appendix"
    start_para_idx: int  # index into the original paragraph list
    end_para_idx: int  # inclusive
    paragraphs: list[dict] = field(default_factory=list)


# Regex patterns for detecting section headers in Chinese theses
_SECTION_PATTERNS = [
    # Cover / title area -- very first paragraphs, handled by position
    # Chinese abstract
    (r"^(\u6458\s*\u8981)$", "abstract"),
    # English abstract
    (r"^(ABSTRACT|Abstract)$", "abstract"),
    # Chapter headers: "第一章", "第二章", etc.
    # Require whitespace or end-of-string after 章 to avoid matching
    # thesis-outline descriptions like "第一章，绪论。介绍..."
    (r"^(\u7b2c[一二三四五六七八九十\d]+\u7ae0)(?:\s|$)", "chapter"),
    # Chapter headers: "一、", "二、", etc.
    (r"^([一二三四五六七八九十]+)\u3001", "chapter"),
    # Chapter headers: "1 ", "2 " at beginning of paragraph (top-level numbered)
    (r"^(\d+)\s+\S", "chapter"),
    # Standalone chapter titles without numbering prefix
    # (Word auto-numbering separates the number from paragraph text)
    (r"^(\u7eea\s*\u8bba)$", "chapter"),       # 绪论
    (r"^(\u5f15\s*\u8a00)$", "chapter"),       # 引言
    (r"^(\u5bfc\s*\u8bba)$", "chapter"),       # 导论
    (r"^(\u7ed3\s*\u8bba)$", "chapter"),       # 结论
    (r"^(\u603b\s*\u7ed3)$", "chapter"),       # 总结
    (r"^(\u7eea\s*\u8bba.{0,20})$", "chapter"),  # 绪论+副标题 (e.g. "绪论与研究背景")
    # References
    (r"^(\u53c2\u8003\u6587\u732e)$", "references"),
    # Acknowledgements
    (r"^(\u81f4\s*\u8c22)$", "appendix"),
    # Appendix
    (r"^(\u9644\s*\u5f55)", "appendix"),
    # Table of contents
    (r"^(\u76ee\s*\u5f55)$", "toc"),
]

# Review focus by section type
SECTION_REVIEW_FOCUS: dict[str, str] = {
    "cover": (
        "评审重点：封面信息的准确性和完整性。\n"
        "- 论文题目是否准确反映研究内容，是否简洁明了\n"
        "- 中英文题目含义是否一致，英文翻译是否准确\n"
        "- 注意：不要评审字体、字号等排版格式问题"
    ),
    "toc": (
        "评审重点：目录结构的合理性。\n"
        "- 章节结构是否完整（是否包含必要的部分如摘要、各章节、参考文献等）\n"
        "- 章节标题是否明确具体，能否反映该部分核心内容\n"
        "- 注意：不要评审字体、字号、页码等排版格式问题"
    ),
    "abstract": (
        "评审重点：摘要的学术质量。\n"
        "- 摘要是否完整概括了研究目的、研究方法、主要结果和结论\n"
        "- 摘要表述是否简洁准确，有无冗余或遗漏关键信息\n"
        "- 关键词选取是否准确、是否覆盖论文核心概念\n"
        "- 英文摘要翻译是否准确，有无语法错误或表意不清\n"
        "- 注意：不要评审字体、字号等排版格式问题"
    ),
    "chapter": (
        "评审重点：章节内容的学术质量（不要关注格式、排版问题）。\n"
        "- 论证逻辑是否连贯，有无因果倒置、跳跃论证或自相矛盾\n"
        "- 是否存在事实错误、数据引用错误或概念混淆\n"
        "- 术语使用是否准确一致，有无前后不统一的情况\n"
        "- 是否有口语化表述（如'我觉得''可能''应该是''其实'等不严谨用语）\n"
        "- 研究方法是否合理，实验/分析过程是否严谨\n"
        "- 数据/案例支撑是否充分，结论是否有足够依据\n"
        "- 文献引用是否恰当，是否存在引而不用或用而不引\n"
        "- 段落之间过渡是否自然，章节内部结构是否合理\n"
        "- 研究问题是否明确，结论是否回应了研究问题\n"
        "- 注意：不要评审字体、字号、编号格式、图表标题格式等排版问题"
    ),
    "references": (
        "评审重点：参考文献的规范性和质量（此部分需要重点关注格式）。\n"
        "- 是否严格按照GB/T 7714格式：[序号] 作者.标题[类型标识].出处,年份\n"
        "- 类型标识是否正确：M(专著) J(期刊) D(学位论文) C(论文集) N(报纸) R(报告)\n"
        "- 英文文献作者是否姓在前名在后\n"
        "- 近五年文献占比是否不低于30%\n"
        "- 文献数量是否充足\n"
        "- 各条文献格式是否统一\n"
        "- 是否有格式明显错误的条目（如缺少年份、缺少出版社、标点错误等）"
    ),
    "appendix": (
        "评审重点：致谢和附录的内容质量。\n"
        "- 致谢内容表述是否得体、语言是否规范\n"
        "- 附录内容是否与正文研究相关，是否有必要\n"
        "- 注意：不要评审字体、字号等排版格式问题"
    ),
}


def _is_toc_entry(text: str) -> bool:
    """Check if a paragraph looks like a table-of-contents entry.

    TOC entries typically have a tab character followed by a page number,
    e.g. "一、绪论\t3" or "二、文献综述\t5".
    Word-generated TOC entries may also contain field codes (control chars
    like \\x05, \\x13-\\x15) or PAGEREF/HYPERLINK markers.

    Args:
        text: Stripped paragraph text.

    Returns:
        True if this looks like a TOC entry.
    """
    # Contains tab + digits (page number) pattern
    if re.search(r"\t\s*\d+\s*$", text):
        return True
    # Contains multiple dots or dashes leading to page number (e.g. "一、绪论......3")
    if re.search(r"[.。]{3,}\s*\d+\s*$", text):
        return True
    # Word field codes: contains PAGEREF or HYPERLINK (auto-generated TOC)
    if "PAGEREF" in text or "HYPERLINK" in text:
        return True
    # Contains Word field separator chars (\x13 field start, \x14 separator,
    # \x15 field end) -- these appear in Word TOC entries
    if re.search(r"[\x13\x14\x15]", text):
        return True
    # Ends with a page number preceded by control char \x05 (Word bookmark)
    if re.search(r"\x05\s*\d+\s*$", text):
        return True
    return False


def _is_heading_paragraph(text: str) -> bool:
    """Check if a paragraph looks like a genuine section heading.

    Real chapter headings are short and do not contain sentence-ending
    punctuation. Thesis-outline descriptions like
    '第一章，绪论。介绍螃蟹年龄预测的研究背景及意义。'
    are longer and contain periods, so they should be rejected.

    Args:
        text: Stripped paragraph text.

    Returns:
        True if the text looks like a genuine section heading.
    """
    # Remove control characters before checking
    clean = re.sub(r"[\x00-\x1f]", "", text)
    # Real headings don't contain sentence-ending punctuation
    if "\u3002" in clean:  # Chinese period
        return False
    # Real headings are short
    return len(clean) <= 60


def _normalize_section_name(name: str) -> str:
    """Normalize a section name for deduplication comparison.

    Strips page numbers, whitespace, tabs, and common trailing markers.

    Args:
        name: Raw section name text.

    Returns:
        Normalized name string.
    """
    # Remove tab + page number suffix
    n = re.sub(r"\t.*$", "", name)
    # Remove trailing numbers (page numbers)
    n = re.sub(r"\s*\d+\s*$", "", n)
    # Remove control characters
    n = re.sub(r"[\x00-\x1f]", "", n)
    # Collapse whitespace
    n = re.sub(r"\s+", "", n)
    return n.strip()


def detect_sections(paragraphs: list[dict]) -> list[Section]:
    """Detect chapter/section boundaries from paragraph list.

    Applies filtering to avoid treating TOC entries, long paragraph
    descriptions, and duplicate chapter references as section boundaries.

    Args:
        paragraphs: List of paragraph dicts with 'index' and 'text' keys.

    Returns:
        List of Section objects representing detected document sections.
    """
    if not paragraphs:
        return []

    # Track whether we are inside a TOC region
    in_toc = False

    # First pass: find all section boundary indices
    boundaries: list[tuple[int, str, str]] = []  # (list_pos, name, type)

    for pos, p in enumerate(paragraphs):
        raw_text = p["text"].strip()
        if not raw_text:
            continue

        # Clean control characters for pattern matching, but keep
        # the raw text for TOC entry detection (which relies on them)
        clean_text = re.sub(r"[\x00-\x1f]", "", raw_text).strip()
        if not clean_text:
            continue

        # Check for TOC heading (目录)
        toc_match = re.match(r"^(目\s*录)$", clean_text)
        if toc_match:
            in_toc = True
            boundaries.append((pos, clean_text, "toc"))
            continue

        # If inside a TOC region, check if this is a TOC entry
        if in_toc:
            if _is_toc_entry(raw_text):
                # This is a TOC line, skip it (it stays in the toc section)
                continue
            else:
                # We've left the TOC region -- continue to process
                # this paragraph normally (it might be a real heading)
                in_toc = False

        # Skip paragraphs that look like TOC entries even outside
        # an explicit TOC region (e.g. no "目录" heading detected)
        if _is_toc_entry(raw_text):
            continue

        for pattern, section_type in _SECTION_PATTERNS:
            match = re.match(pattern, clean_text)
            if match:
                # Skip long paragraphs that start with chapter patterns --
                # these are thesis-structure descriptions, not headings
                if section_type == "chapter" and not _is_heading_paragraph(
                    clean_text
                ):
                    break
                boundaries.append((pos, clean_text, section_type))
                break

    # If no sections detected, use fallback chunking
    if not boundaries:
        return _fallback_chunking(paragraphs)

    # Build sections from boundaries
    sections: list[Section] = []

    # Handle cover: paragraphs before the first detected boundary
    first_boundary_pos = boundaries[0][0]
    if first_boundary_pos > 0:
        cover_paras = paragraphs[:first_boundary_pos]
        if cover_paras:
            sections.append(
                Section(
                    name="封面与题目",
                    section_type="cover",
                    start_para_idx=cover_paras[0]["index"],
                    end_para_idx=cover_paras[-1]["index"],
                    paragraphs=cover_paras,
                )
            )

    # Build each section from boundary to next boundary
    for i, (pos, name, sec_type) in enumerate(boundaries):
        # Determine end position
        if i + 1 < len(boundaries):
            end_pos = boundaries[i + 1][0]  # exclusive
        else:
            end_pos = len(paragraphs)  # until end

        section_paras = paragraphs[pos:end_pos]
        if section_paras:
            sections.append(
                Section(
                    name=name,
                    section_type=sec_type,
                    start_para_idx=section_paras[0]["index"],
                    end_para_idx=section_paras[-1]["index"],
                    paragraphs=section_paras,
                )
            )

    # Merge small adjacent sections of the same type
    sections = _merge_small_sections(sections)

    # Deduplicate sections with similar names (keep the one with more content)
    sections = _deduplicate_sections(sections)

    return sections


def _fallback_chunking(
    paragraphs: list[dict],
    max_paras_per_batch: int = 30,
) -> list[Section]:
    """Fallback: split paragraphs into fixed-size chunks when no chapters found.

    Args:
        paragraphs: All paragraphs.
        max_paras_per_batch: Max paragraphs per chunk.

    Returns:
        List of Section objects.
    """
    sections: list[Section] = []
    for i in range(0, len(paragraphs), max_paras_per_batch):
        chunk = paragraphs[i : i + max_paras_per_batch]
        batch_num = i // max_paras_per_batch + 1
        sections.append(
            Section(
                name=f"第{batch_num}部分",
                section_type="chapter",
                start_para_idx=chunk[0]["index"],
                end_para_idx=chunk[-1]["index"],
                paragraphs=chunk,
            )
        )
    return sections


def _merge_small_sections(
    sections: list[Section],
    min_paragraphs: int = 3,
) -> list[Section]:
    """Merge very small sections into their neighbors.

    Args:
        sections: List of sections.
        min_paragraphs: Minimum paragraphs for a section to stand alone.

    Returns:
        Merged list of sections.
    """
    if len(sections) <= 1:
        return sections

    merged: list[Section] = []
    for sec in sections:
        if (
            merged
            and len(sec.paragraphs) < min_paragraphs
            and sec.section_type == merged[-1].section_type
        ):
            # Merge into previous section
            merged[-1].paragraphs.extend(sec.paragraphs)
            merged[-1].end_para_idx = sec.end_para_idx
            merged[-1].name = f"{merged[-1].name} / {sec.name}"
        else:
            merged.append(sec)

    return merged


def _deduplicate_sections(sections: list[Section]) -> list[Section]:
    """Remove duplicate sections that have the same normalized name.

    When the same chapter appears both in the table of contents and in
    the main body, this keeps the version with more paragraphs (i.e. the
    actual chapter content rather than the TOC entry).

    Args:
        sections: List of sections (already merged).

    Returns:
        Deduplicated list of sections preserving original order.
    """
    if len(sections) <= 1:
        return sections

    # Group sections by normalized name
    from collections import defaultdict

    name_groups: dict[str, list[int]] = defaultdict(list)
    for idx, sec in enumerate(sections):
        norm = _normalize_section_name(sec.name)
        if norm:
            name_groups[norm].append(idx)

    # Determine which indices to remove
    remove_indices: set[int] = set()
    for norm_name, indices in name_groups.items():
        if len(indices) <= 1:
            continue
        # Keep the section with the most paragraphs, remove the rest
        best_idx = max(indices, key=lambda i: len(sections[i].paragraphs))
        for idx in indices:
            if idx != best_idx:
                remove_indices.add(idx)

    # Build filtered list
    return [sec for idx, sec in enumerate(sections) if idx not in remove_indices]

def generate_outline(sections: list[Section]) -> str:
    """Generate a text outline of the thesis structure.

    Args:
        sections: List of detected sections.

    Returns:
        Formatted outline string.
    """
    lines = []
    for i, sec in enumerate(sections, 1):
        para_count = len(sec.paragraphs)
        lines.append(f"{i}. {sec.name} ({para_count}段)")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Prompts for SECTION-based review (full-text, batch by chapter)
# ---------------------------------------------------------------------------

SECTION_REVIEW_SYSTEM_PROMPT = """你是一位经验丰富的本科毕业论文评审专家。你正在对论文进行逐章节深度评审，重点关注论文的学术质量和内容问题。

## 核心评审原则

**你的评审应当聚焦于学术内容和写作质量，而非排版格式。** 除非你评审的是"参考文献"部分，否则不要对字体、字号、编号格式、图表标题格式、页眉页脚等排版格式问题发表意见。

## 评审维度（按重要性排序）

### 1. 逻辑与论证
- 论证链条是否连贯，有无因果倒置、循环论证或跳跃论证
- 各段落、各部分之间逻辑关系是否清晰
- 结论是否有充分依据支撑，是否过度推广
- 假设是否合理，前提是否成立

### 2. 事实准确性
- 是否存在事实性错误、数据引用错误
- 概念定义是否准确，是否与学界通用定义一致
- 引用的研究结论是否被正确理解和转述

### 3. 学术表述规范
- 是否有口语化表述（如"我觉得""可能吧""应该是""其实""比较好"等不严谨用语）
- 术语使用是否准确一致，有无前后不统一
- 语言是否简洁清晰，有无冗余、歧义或语病
- 被动语态和主动语态使用是否恰当

### 4. 研究方法与理论
- 研究方法选择是否合理，是否适配研究问题
- 理论框架是否清晰，应用是否恰当
- 数据来源是否可靠，样本量是否足够
- 分析过程是否严谨，是否存在方法论缺陷

### 5. 内容完整性
- 文献引用是否恰当（引而不用或用而不引）
- 研究问题是否明确，结论是否回应研究问题
- 重要概念是否缺少必要解释
- 是否遗漏关键的讨论或分析

## 不要评审的内容

- 字体、字号、行距等排版格式
- 章节编号格式（如"一、"vs"1."）
- 图表标题的字体和位置格式
- 页眉、页脚、页码格式
- 封面的排版布局

## 评审要求

你当前正在评审论文的 **一个特定章节/部分**。请：
1. 深入审查该章节中每个段落的内容质量
2. 评审意见要具体、有建设性，指出问题并给出修改方向
3. 关注真正影响论文学术质量的实质性问题
4. 每个有问题的段落都应指出，但不要为了凑数而输出无意义的意见

## 输出格式

你必须以 JSON 格式输出评审结果。输出一个 JSON 对象，包含一个字段：
- `comments`: 评审意见数组

每条评审意见包含以下字段：
- `paragraph_index`: 所在段落的索引号（从输入中获取，必须使用原始段落索引）
- `target_text`: 需要标注的原文文本片段（必须是原文中能精确匹配的文本，不要修改或截断，长度控制在10-50个字符之间）
- `comment`: 评审意见的具体内容（要具体、有建设性，指出问题并给出修改方向）
- `severity`: 严重程度，取值为以下之一：
  - "error": 必须修改的严重问题（事实错误、逻辑矛盾、方法论严重缺陷等）
  - "warning": 建议修改的问题（表述不清、论证不充分、口语化表述等）
  - "suggestion": 可选改进的建议（优化建议、扩展方向、润色建议等）

## 重要规则

1. `target_text` 必须是原文中能精确匹配到的连续文本片段，不可自行编造
2. `paragraph_index` 必须使用输入中给出的原始段落索引号，不可自行编造
3. 评审意见要具体，避免笼统的评价如"这段写得不好"
4. **除参考文献部分外，不要输出任何关于排版格式的评审意见**
5. 按段落顺序逐段审查，确保无遗漏
6. 输出必须是合法的 JSON 格式
7. 不要输出 summary 字段，只需输出 comments 数组
"""


SECTION_REVIEW_USER_PROMPT_TEMPLATE = """## 论文全文大纲

{outline}

## 当前评审部分

你正在评审第 {batch_index}/{total_batches} 部分：**{section_name}**

{review_focus}

## 待评审内容

{paragraphs_text}

请仔细审查以上内容中的每一个段落，逐条指出所有问题。以 JSON 格式输出评审结果：
{{
  "comments": [
    {{
      "paragraph_index": 0,
      "target_text": "原文中的具体文本片段",
      "comment": "评审意见",
      "severity": "error|warning|suggestion"
    }}
  ]
}}
"""


# ---------------------------------------------------------------------------
# Original prompts for selection review (single-request, no batching)
# ---------------------------------------------------------------------------

THESIS_REVIEW_SYSTEM_PROMPT = """你是一位经验丰富的本科毕业论文评审专家，熟悉湖北经济学院本科毕业论文格式规范和文本规范。你的任务是仔细审阅论文全文，逐条指出问题，提供专业、具体、有建设性的评审意见。

## 评审依据

你需要基于以下学校规范进行评审：

### 格式规范
- 封面：题目使用黑体小初，日期使用宋体三号加黑
- 目录：需包含摘要、ABSTRACT、各章节、致谢、参考文献、附录
- 摘要：中文摘要后附3-5个关键词，英文ABSTRACT后附Keywords
- 章节编号：一级标题用"一、"，二级用"(一)"，三级用"1、"或"1."，四级用"1)"，五级用"(1)"
- 图表规范：图标题在图正下方居中，华文仿宋五号加粗；表标题在表正上方居中，华文仿宋五号加粗；表格为三线表，无竖线
- 参考文献：按GB/T 7714格式，类型标识为 M(专著) J(期刊) D(学位论文) C(论文集) N(报纸) R(报告)；英文作者姓在前名在后
- 注释：使用圈码标识

### 学术规范
- 避免口语化表述（如"我觉得""可能""应该是"等）
- 术语使用准确一致
- 引用规范，正文引用与参考文献列表对应
- 近五年文献占比应不低于30%

### 内容质量
- 研究问题明确具体
- 论证逻辑连贯，无因果倒置或跳跃论证
- 数据/案例支撑充分
- 结论回应研究问题

## 输出格式

你必须以 JSON 格式输出评审结果。输出一个 JSON 对象，包含一个字段：
- `comments`: 评审意见数组

每条评审意见包含以下字段：
- `paragraph_index`: 所在段落的索引号（从输入中获取）
- `target_text`: 需要标注的原文文本片段（必须是原文中能精确匹配的文本，不要修改或截断，长度控制在10-50个字符之间）
- `comment`: 评审意见的具体内容（要具体、有建设性，指出问题并给出修改方向）
- `severity`: 严重程度，取值为以下之一：
  - "error": 必须修改的严重问题（格式严重不符、事实错误、逻辑矛盾、学术不端等）
  - "warning": 建议修改的问题（表述不清、论证不充分、格式小问题等）
  - "suggestion": 可选改进的建议（优化建议、扩展方向、润色建议等）

## 重要规则

1. `target_text` 必须是原文中能精确匹配到的连续文本片段，不可自行编造
2. 评审意见要具体，避免笼统的评价如"这段写得不好"
3. 对于格式问题，请引用学校具体规范要求
4. 按段落顺序逐段审查，确保无遗漏
5. 意见数量根据论文实际问题多少而定，不必凑数也不要遗漏重要问题
6. 输出必须是合法的 JSON 格式
7. 不要输出 summary 字段，只需输出 comments 数组
"""


THESIS_REVIEW_USER_PROMPT_TEMPLATE = """请评审以下论文全文内容，按段落顺序逐条检查并给出评审意见：

{paragraphs_text}

请以 JSON 格式输出你的评审结果，格式如下：
{{
  "comments": [
    {{
      "paragraph_index": 0,
      "target_text": "原文中的具体文本片段",
      "comment": "评审意见",
      "severity": "error|warning|suggestion"
    }}
  ]
}}
"""


# ---------------------------------------------------------------------------
# Prompts for overall thesis comment
# ---------------------------------------------------------------------------

THESIS_COMMENT_SYSTEM_PROMPT = """你是一位经验丰富的本科毕业论文评审专家。你的任务是对论文进行全面的整体评价，撰写一段综合评语。

## 评价维度

请从以下维度综合评价论文质量：

1. **选题价值**：研究问题的理论意义与实践价值，选题的新颖性和针对性
2. **文献综述**：文献覆盖的广度与深度，对研究现状的把握程度，研究缺口的梳理
3. **研究方法**：方法选择的合理性与适配性，数据来源的可靠性，分析过程的严谨性
4. **逻辑结构**：章节安排是否合理，论证层次是否清晰，前后呼应是否到位
5. **创新性**：是否有独到见解或新的发现，对现有研究的贡献程度
6. **格式规范**：是否符合学校毕业论文格式要求，参考文献、图表等是否规范
7. **语言表达**：学术用语是否准确，行文是否流畅简洁，有无语病或口语化表述

## 输出要求

- 直接输出一段300-500字的综合评语，不要使用JSON格式
- 语气客观专业，既肯定优点也指出不足
- 先总体评价，再分维度点评，最后给出改进方向
- 评语应当有具体依据，避免空泛评价
- 不要使用任何emoji符号
"""

THESIS_COMMENT_USER_PROMPT_TEMPLATE = """请对以下论文全文进行整体评价，撰写一段综合评语：

{paragraphs_text}

请直接输出评语文本，不需要JSON格式。
"""


# ---------------------------------------------------------------------------
# Helper functions for building messages
# ---------------------------------------------------------------------------


def format_paragraphs_for_prompt(
    paragraphs: list[dict],
) -> str:
    """Format paragraph data into a string for the LLM prompt.

    Args:
        paragraphs: List of paragraph dicts with 'index' and 'text' keys.

    Returns:
        Formatted string representation of paragraphs.
    """
    lines = []
    for p in paragraphs:
        if p["text"].strip():
            lines.append(f"[段落 {p['index']}] {p['text']}")
    return "\n\n".join(lines)


def build_review_messages(
    paragraphs: list[dict],
) -> list[dict]:
    """Build the chat messages for selection review (single request).

    Args:
        paragraphs: List of paragraph dicts with 'index' and 'text' keys.

    Returns:
        List of message dicts for the OpenAI API.
    """
    paragraphs_text = format_paragraphs_for_prompt(paragraphs)
    user_prompt = THESIS_REVIEW_USER_PROMPT_TEMPLATE.format(
        paragraphs_text=paragraphs_text
    )
    return [
        {"role": "system", "content": THESIS_REVIEW_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]


def build_section_review_messages(
    section: Section,
    outline: str,
    batch_index: int,
    total_batches: int,
) -> list[dict]:
    """Build the chat messages for a single section/chapter review.

    Args:
        section: The section to review.
        outline: Full thesis outline string.
        batch_index: 1-based index of the current batch.
        total_batches: Total number of batches.

    Returns:
        List of message dicts for the OpenAI API.
    """
    paragraphs_text = format_paragraphs_for_prompt(section.paragraphs)

    # Get review focus for this section type
    focus = SECTION_REVIEW_FOCUS.get(section.section_type, "")
    review_focus = f"### 本章节评审重点\n\n{focus}" if focus else ""

    user_prompt = SECTION_REVIEW_USER_PROMPT_TEMPLATE.format(
        outline=outline,
        batch_index=batch_index,
        total_batches=total_batches,
        section_name=section.name,
        review_focus=review_focus,
        paragraphs_text=paragraphs_text,
    )
    return [
        {"role": "system", "content": SECTION_REVIEW_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]


def build_comment_messages(
    paragraphs: list[dict],
) -> list[dict]:
    """Build the chat messages for the overall comment generation.

    Args:
        paragraphs: List of paragraph dicts with 'index' and 'text' keys.

    Returns:
        List of message dicts for the OpenAI API.
    """
    paragraphs_text = format_paragraphs_for_prompt(paragraphs)
    user_prompt = THESIS_COMMENT_USER_PROMPT_TEMPLATE.format(
        paragraphs_text=paragraphs_text
    )
    return [
        {"role": "system", "content": THESIS_COMMENT_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]
