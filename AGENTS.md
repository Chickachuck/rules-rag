# AGENTS.md

## Purpose
Simple Python FastAPI RAG service for ingesting PDF content, embedding text chunks with `sentence-transformers`, storing vectors in an Annoy index, and exposing semantic search over uploaded documents.

## Install
```bash
python -m pip install -r requirements.txt
```

## Test
```bash
pytest -q
```

## Run
```bash
uvicorn src.app:app --reload
```

Use `RAG_DATA_DIR` to change the persistence directory if needed.

## Key files
- `src/app.py` — FastAPI app, endpoint definitions, lazy model/store initialization
- `src/embeddings.py` — embedding wrapper using `SentenceTransformer`
- `src/pdf_utils.py` — PDF text extraction, page-aware chunk splitting, and page metadata
- `src/store.py` — Annoy vector store, save/load metadata, query logic
- `requirements.txt` — dependency list

## Metadata behavior
- Each ingested chunk stores `text`, `page`, and `source_id` (the uploaded PDF filename)
- The index metadata file is `data/ann.index.meta.json`
- Query results return chunk `text`, `page`, and `source_id`

## API endpoints
- `POST /ingest_pdf` — upload a PDF file as `multipart/form-data`; extracts text, chunks pages, embeds chunks, stores vectors
- `GET /query?q=...&k=5` — query with text, returns top-k similar chunks
- `GET /health` — basic service health check

## Persistence behavior
- Default data directory: `data/`
- Vector index file: `data/ann.index`
- Metadata file: `data/ann.index.meta.json`
- On ingest, new chunks are added, index is built, and both index + metadata are saved
- The service reuses the same stored index on subsequent requests via `VectorStore`
