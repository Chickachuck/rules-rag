import json
from annoy import AnnoyIndex
import os
from typing import List, Dict, Optional


class VectorStore:
    def __init__(self, dim: int, index_path: str):
        self.dim = dim
        self.index_path = index_path
        self.meta_path = index_path + ".meta.json"
        self.index = AnnoyIndex(dim, "angular")
        self._id_to_meta: Dict[int, Dict] = {}
        self._next_id = 0

    def add_documents(self, docs: List[Dict[str, str]], embeddings):
        # docs: list of {'text':..., 'id': optional}
        for doc, emb in zip(docs, embeddings):
            idx = self._next_id
            self.index.add_item(idx, emb.tolist() if hasattr(emb, "tolist") else emb)
            self._id_to_meta[idx] = {"text": doc.get("text"), "source_id": doc.get("id")}
            self._next_id += 1

    def build(self, n_trees: int = 10):
        self.index.build(n_trees)

    def save(self):
        os.makedirs(os.path.dirname(self.index_path) or ".", exist_ok=True)
        self.index.save(self.index_path)
        with open(self.meta_path, "w", encoding="utf-8") as f:
            json.dump({"meta": self._id_to_meta, "next_id": self._next_id}, f)

    @classmethod
    def load(cls, dim: int, index_path: str) -> "VectorStore":
        vs = cls(dim, index_path)
        if os.path.exists(index_path):
            vs.index.load(index_path)
        if os.path.exists(vs.meta_path):
            with open(vs.meta_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                vs._id_to_meta = {int(k): v for k, v in data.get("meta", {}).items()}
                vs._next_id = int(data.get("next_id", 0))
        return vs

    def query(self, embedding, top_k: int = 5):
        ids, distances = self.index.get_nns_by_vector(embedding.tolist() if hasattr(embedding, "tolist") else embedding, top_k, include_distances=True)
        results = []
        for i, d in zip(ids, distances):
            meta = self._id_to_meta.get(i, {})
            results.append({"id": i, "score": float(d), "text": meta.get("text"), "source_id": meta.get("source_id")})
        return results
