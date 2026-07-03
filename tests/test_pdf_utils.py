from src.pdf_utils import chunk_text


def test_chunk_text_basic():
    text = "".join([f"word{i} " for i in range(1200)])
    chunks = chunk_text(text, chunk_size=200, overlap=20)
    assert len(chunks) > 0
    assert all(isinstance(c, str) for c in chunks)
    assert all(len(c.split()) <= 200 for c in chunks)


def test_chunk_text_with_page_metadata():
    page_records = [
        {"page": 1, "text": "".join([f"page1_{i} " for i in range(250)])},
        {"page": 2, "text": "".join([f"page2_{i} " for i in range(150)])},
    ]
    chunks = chunk_text(page_records, chunk_size=200, overlap=20)
    assert len(chunks) == 3
    assert all(isinstance(c, dict) for c in chunks)
    assert all(c["page"] in {1, 2} for c in chunks)
    assert all(len(c["text"].split()) <= 200 for c in chunks)
    assert chunks[0]["page"] == 1
    assert chunks[1]["page"] == 1
    assert chunks[2]["page"] == 2
