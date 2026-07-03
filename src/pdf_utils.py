from pypdf import PdfReader
from pypdf.generic import Destination
from typing import Any, Dict, List, Optional, Union


def extract_chapters(reader: PdfReader) -> Dict[int, List[str]]:
    outline = getattr(reader, "outline", None)
    if callable(outline):
        try:
            outline = outline()
        except Exception:
            outline = None
    if not outline:
        return {}

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
        return {}

    chapters.sort(key=lambda x: x[0])
    starts: Dict[int, List[List[str]]] = {}
    for page_number, path in chapters:
        starts.setdefault(page_number, []).append(path)

    def path_titles(path: List[str]) -> List[str]:
        titles: List[str] = []
        for i in range(1, len(path) + 1):
            titles.append(" - ".join(path[:i]))
        return titles

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
    return page_to_chapter


def extract_text_from_pdf(path: str) -> List[Dict[str, Union[int, str, None, List[str]]]]:
    reader = PdfReader(path)
    chapter_map = extract_chapters(reader)
    pages = []
    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        pages.append(
            {
                "page": page_number,
                "text": text,
                "chapter": chapter_map.get(page_number, []),
            }
        )
    return pages


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
    chunks: List[Dict[str, Union[int, str, None, List[str]]]] = []
    groups: List[tuple[List[str], List[Dict[str, Union[int, str, None, List[str]]]]]] = []
    current_chapter = pages[0].get("chapter", []) or []
    current_group: List[Dict[str, Union[int, str, None, List[str]]]] = []

    for page in pages:
        page_chapter = page.get("chapter", []) or []
        if page_chapter != current_chapter and current_group:
            groups.append((current_chapter, current_group))
            current_group = []
            current_chapter = page_chapter
        current_group.append(page)
    if current_group:
        groups.append((current_chapter, current_group))

    for chapter, group in groups:
        page_tokens: List[str] = []
        token_pages: List[int] = []
        for page in group:
            tokens = (page.get("text", "") or "").split()
            page_tokens.extend(tokens)
            token_pages.extend([page["page"]] * len(tokens))
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
