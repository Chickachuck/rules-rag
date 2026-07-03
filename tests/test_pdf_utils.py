from src.pdf_utils import chunk_text


def test_chunk_text_basic():
    text = "".join([f"word{i} " for i in range(1200)])
    chunks = chunk_text(text, chunk_size=200, overlap=20)
    assert len(chunks) > 0
    assert all(isinstance(c, str) for c in chunks)
    assert all(len(c.split()) <= 200 for c in chunks)


def test_chunk_text_with_page_metadata():
    page_records = [
        {"page": 1, "text": "".join([f"page1_{i} " for i in range(250)]), "chapter": "Chapter 1"},
        {"page": 2, "text": "".join([f"page2_{i} " for i in range(150)]), "chapter": "Chapter 1"},
    ]
    chunks = chunk_text(page_records, chunk_size=200, overlap=20)
    assert len(chunks) == 3
    assert all(isinstance(c, dict) for c in chunks)
    assert all(c["page"] in {1, 2} for c in chunks)
    assert all(len(c["text"].split()) <= 200 for c in chunks)
    assert all(c["chapter"] == "Chapter 1" for c in chunks)
    assert chunks[0]["page"] == 1
    assert chunks[1]["page"] == 1
    assert chunks[2]["page"] == 2


def test_chunk_text_respects_chapter_boundaries():
    page_records = [
        {"page": 1, "text": "".join([f"page1_{i} " for i in range(150)]), "chapter": ["Chapter 1"]},
        {"page": 2, "text": "".join([f"page2_{i} " for i in range(150)]), "chapter": ["Chapter 2"]},
    ]
    chunks = chunk_text(page_records, chunk_size=200, overlap=20)
    assert len(chunks) == 2
    assert chunks[0]["chapter"] == ["Chapter 1"]
    assert chunks[1]["chapter"] == ["Chapter 2"]
    assert chunks[0]["end_page"] == 1
    assert chunks[1]["start_page"] == 2


def test_chunk_text_supports_multiple_chapters_per_page():
    page_records = [
        {
            "page": 1,
            "text": "".join([f"page1_{i} " for i in range(150)]),
            "chapter": ["Chapter 1", "Chapter 1 - Section A"],
        },
        {
            "page": 2,
            "text": "".join([f"page2_{i} " for i in range(150)]),
            "chapter": ["Chapter 1", "Chapter 1 - Section A"],
        },
    ]
    chunks = chunk_text(page_records, chunk_size=200, overlap=20)
    assert len(chunks) == 2
    assert chunks[0]["chapter"] == ["Chapter 1", "Chapter 1 - Section A"]
    assert chunks[1]["chapter"] == ["Chapter 1", "Chapter 1 - Section A"]
