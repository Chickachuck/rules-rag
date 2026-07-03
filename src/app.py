from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional
import tempfile
import os

from .embeddings import EmbeddingModel
from .pdf_utils import extract_text_from_pdf, chunk_text
from .store import VectorStore

app = FastAPI()

# Initialize components lazily
_model: Optional[EmbeddingModel] = None
_store: Optional[VectorStore] = None


def get_model():
    global _model
    if _model is None:
        _model = EmbeddingModel()
    return _model


def get_store():
    global _store
    if _store is None:
        model = get_model()
        # default paths
        data_dir = os.environ.get("RAG_DATA_DIR", "data")
        os.makedirs(data_dir, exist_ok=True)
        index_path = os.path.join(data_dir, "ann.index")
        _store = VectorStore(model.dimension, index_path)
    return _store


@app.post("/ingest_pdf")
async def ingest_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    # save to temp
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    contents = await file.read()
    tmp.write(contents)
    tmp.close()
    try:
        text = extract_text_from_pdf(tmp.name)
        chunks = chunk_text(text)
        model = get_model()
        embeddings = model.embed_texts(chunks)
        docs = [{"text": c} for c in chunks]
        store = get_store()
        store.add_documents(docs, embeddings)
        store.build()
        store.save()
        return JSONResponse({"ingested_chunks": len(chunks)})
    finally:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass


@app.get("/query")
def query(q: str = Query(...), k: int = Query(5, ge=1, le=50)):
    model = get_model()
    emb = model.embed_texts([q])[0]
    store = get_store()
    results = store.query(emb, top_k=k)
    return {"results": results}


@app.get("/health")
def health():
    return {"status": "ok"}
