import pytest
from src.embeddings import EmbeddingModel


def test_embedding_shape():
    model = EmbeddingModel()
    texts = ["hello world", "another sentence"]
    vecs = model.embed_texts(texts)
    assert len(vecs) == 2
    assert vecs.shape[1] > 0
