from src.pdf_utils import chunk_text


def test_chunk_text_basic():
    text = "".join([f"word{i} " for i in range(1200)])
    chunks = chunk_text(text, chunk_size=200, overlap=20)
    assert len(chunks) > 0
    # ensure overlap
    assert all(len(c.split()) <= 200 for c in chunks)
