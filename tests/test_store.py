import numpy as np
from src.store import VectorStore
import tempfile
import os


def test_store_add_query(tmp_path):
    dim = 8
    index_path = str(tmp_path / "ann.index")
    vs = VectorStore(dim, index_path)
    docs = [{"text": "hello world"}, {"text": "another doc"}]
    embeddings = np.random.randn(2, dim)
    vs.add_documents(docs, embeddings)
    vs.build()
    vs.save()

    vs2 = VectorStore.load(dim, index_path)
    # query using the first vector
    res = vs2.query(embeddings[0], top_k=2)
    assert len(res) <= 2
    assert all(result.get("source_id") is None for result in res)


def test_store_source_id_metadata(tmp_path):
    dim = 8
    index_path = str(tmp_path / "ann.index")
    vs = VectorStore(dim, index_path)
    docs = [
        {"text": "hello world", "id": "file1.pdf"},
        {"text": "another doc", "id": "file1.pdf"},
    ]
    embeddings = np.random.randn(2, dim)
    vs.add_documents(docs, embeddings)
    vs.build()
    vs.save()

    vs2 = VectorStore.load(dim, index_path)
    res = vs2.query(embeddings[0], top_k=2)
    assert all(result.get("source_id") == "file1.pdf" for result in res)
