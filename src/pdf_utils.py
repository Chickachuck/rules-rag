from pypdf import PdfReader
from pypdf.generic import Destination
from typing import Any, Dict, List, Optional, Tuple, Union


def path_titles(path: List[str]) -> List[str]:
    titles: List[str] = []
    for i in range(1, len(path) + 1):
        titles.append(" - ".join(path[:i]))
    return titles


def extract_chapters(reader: PdfReader) -> Tuple[Dict[int, List[str]], Dict[int, List[List[str]]]]:
    outline = getattr(reader, "outline", None)
    if callable(outline):
        try:
            outline = outline()
        except Exception:
            outline = None
    if not outline:
        return {}, {}

    chapters: List[tuple[int, List[str]]] = []

    def walk(items, parent_titles: List[str] = []):
        if callable(items):
            try:
                items = items()
            except Exception:
                return
        for item in items:
            if isinstance(item, list):
                walk(item, parent_titles)
                continue
            if not isinstance(item, Destination):
                continue
            title = getattr(item, "title", None)
            if not title:
                continue
            try:
                page_index = reader.get_destination_page_number(item)
            except Exception:
                continue
            if page_index is None:
                continue
            path = parent_titles + [title]
            chapters.append((page_index + 1, path))
            children = getattr(item, "children", None)
            if callable(children):
                try:
                    children = children()
                except Exception:
                    children = None
            if children:
                walk(children, path)

    walk(outline)
    if not chapters:
        return {}, {}

    chapters.sort(key=lambda x: x[0])
    starts: Dict[int, List[List[str]]] = {}
    for page_number, path in chapters:
        starts.setdefault(page_number, []).append(path)

    page_to_chapter: Dict[int, List[str]] = {}
    current_active: List[str] = []
    current_path: List[str] = []
    for page_number in range(1, len(reader.pages) + 1):
        if page_number in starts:
            page_titles: List[str] = []
            for path in starts[page_number]:
                for title in path_titles(path):
                    if title not in page_titles:
                        page_titles.append(title)
            page_to_chapter[page_number] = page_titles
            current_path = max(starts[page_number], key=len)
            current_active = path_titles(current_path)
        elif current_active:
            page_to_chapter[page_number] = current_active.copy()
        else:
            page_to_chapter[page_number] = []
    return page_to_chapter, starts


def extract_text_from_pdf(path: str) -> List[Dict[str, Union[int, str, None, List[str]]]]:
    reader = PdfReader(path)
    chapter_map, starts_map = extract_chapters(reader)
    pages = []
    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        pages.append(
            {
                "page": page_number,
                "text": text,
                "chapter": chapter_map.get(page_number, []),
                "starts": starts_map.get(page_number, []),
            }
        )
    return pages


def split_page_into_chapter_segments(page: Dict[str, Any]) -> List[Dict[str, Any]]:
    text = page.get("text", "") or ""
    if not text:
        return []

    starts = page.get("starts", []) or []
    if not starts:
        if page.get("chapter"):
            return [
                {
                    "page": page["page"],
                    "text": text,
                    "chapter": page.get("chapter", []),
                    "start_page": page["page"],
                    "end_page": page["page"],
                }
            ]
        return []

    header_candidates: List[tuple[str, List[str]]] = []
    seen_headers: set = set()
    for path in starts:
        full_header = " - ".join(path)
        if full_header not in seen_headers:
            header_candidates.append((full_header, path))
            seen_headers.add(full_header)
        last_header = path[-1]
        if last_header not in seen_headers:
            header_candidates.append((last_header, path))
            seen_headers.add(last_header)

    text_lower = text.lower()
    occurrences: List[tuple[int, str, List[str]]] = []
    for header, path in sorted(header_candidates, key=lambda item: len(item[0]), reverse=True):
        idx = text_lower.find(header.lower())
        if idx >= 0:
            occurrences.append((idx, header, path))

    occurrences.sort(key=lambda x: x[0])
    if not occurrences:
        return []

    segments: List[Dict[str, Any]] = []
    for index, (idx, header, path) in enumerate(occurrences):
        next_idx = occurrences[index + 1][0] if index + 1 < len(occurrences) else len(text)
        segment_text = text[idx:next_idx].strip()
        if not segment_text:
            continue
        segments.append(
            {
                "page": page["page"],
                "text": segment_text,
                "chapter": path_titles(path),
                "start_page": page["page"],
                "end_page": page["page"],
            }
        )
    return segments


def split_pages_into_chapter_segments(pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    segments: List[Dict[str, Any]] = []
    for page in pages:
        segments.extend(split_page_into_chapter_segments(page))
    return segments


def chunk_text(
    text_or_pages: Any,
    chunk_size: int = 500,
    overlap: int = 50,
) -> Any:
    if not text_or_pages:
        return []

    if isinstance(text_or_pages, str):
        tokens = text_or_pages.split()
        chunks: List[str] = []
        start = 0
        while start < len(tokens):
            end = min(start + chunk_size, len(tokens))
            chunk = " ".join(tokens[start:end])
            chunks.append(chunk)
            start = end - overlap if end < len(tokens) else end
        return chunks

    pages = text_or_pages
    if not pages:
        return []

    segments = split_pages_into_chapter_segments(pages)
    if not segments:
        return []

    chunks: List[Dict[str, Union[int, str, None, List[str]]]] = []
    groups: List[tuple[List[str], List[Dict[str, Any]]]] = []
    current_chapter = segments[0].get("chapter", []) or []
    current_group: List[Dict[str, Any]] = []

    for segment in segments:
        segment_chapter = segment.get("chapter", []) or []
        if segment_chapter != current_chapter and current_group:
            groups.append((current_chapter, current_group))
            current_group = []
            current_chapter = segment_chapter
        current_group.append(segment)
    if current_group:
        groups.append((current_chapter, current_group))

    for chapter, group in groups:
        page_tokens: List[str] = []
        token_pages: List[int] = []
        for segment in group:
            tokens = (segment.get("text", "") or "").split()
            page_tokens.extend(tokens)
            token_pages.extend([segment["page"]] * len(tokens))
        start = 0
        while start < len(page_tokens):
            end = min(start + chunk_size, len(page_tokens))
            chunk_tokens = page_tokens[start:end]
            chunk_page_numbers = token_pages[start:end]
            if not chunk_tokens:
                break
            chunk = " ".join(chunk_tokens)
            chunks.append(
                {
                    "text": chunk,
                    "page": chunk_page_numbers[0] if chunk_page_numbers else group[0]["page"],
                    "start_page": chunk_page_numbers[0] if chunk_page_numbers else group[0]["page"],
                    "end_page": chunk_page_numbers[-1] if chunk_page_numbers else group[-1]["page"],
                    "chapter": chapter,
                }
            )
            start = end - overlap if end < len(page_tokens) else end
    return chunks
