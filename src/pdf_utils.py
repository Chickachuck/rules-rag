from pypdf import PdfReader
from typing import Dict, List, Union


def extract_text_from_pdf(path: str) -> List[Dict[str, Union[int, str]]]:
    reader = PdfReader(path)
    pages = []
    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        pages.append({"page": page_number, "text": text})
    return pages


def chunk_text(
    text_or_pages: Union[str, List[Dict[str, Union[int, str]]]],
    chunk_size: int = 500,
    overlap: int = 50,
) -> List[Union[str, Dict[str, Union[int, str]]]]:
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
    chunks: List[Dict[str, Union[int, str]]] = []
    for page in pages:
        page_number = page.get("page")
        text = page.get("text", "") or ""
        if not text:
            continue
        tokens = text.split()
        start = 0
        while start < len(tokens):
            end = min(start + chunk_size, len(tokens))
            chunk = " ".join(tokens[start:end])
            chunks.append({"text": chunk, "page": page_number})
            start = end - overlap if end < len(tokens) else end
    return chunks
