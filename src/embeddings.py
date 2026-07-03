from sentence_transformers import SentenceTransformer
import numpy as np


class EmbeddingModel:
    def __init__(self, model_name: str = "all-mpnet-base-v2"):
        self.model_name = model_name
        self.model = SentenceTransformer(model_name)

    def embed_texts(self, texts):
        """Return a numpy array of shape (len(texts), dim)."""
        vecs = self.model.encode(texts, convert_to_numpy=True)
        return np.array(vecs)

    @property
    def dimension(self):
        # lazy check
        sample = self.embed_texts(["test"])
        return sample.shape[1]
