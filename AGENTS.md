# AGENTS.md

## Purpose
Node.js (Express) RAG service for ingesting PDF content, embedding text chunks (OpenAI optional), storing vectors in a JSON-backed index, and exposing semantic search over uploaded documents.

## Install
```bash
npm install
```

## Test
```bash
npm test
```

## Run
```bash
npm start
```

## Key files
- `src/server.js` — Express app and endpoints
- `src/embeddings.js` — OpenAI embedding wrapper with fallback
- `src/pdfUtils.js` — PDF text extraction and page-aware chunking
- `src/store.js` — simple JSON-backed vector store and query logic
- `package.json` — scripts and dependencies

## Metadata behavior
- Each ingested chunk stores `text`, `page`, and `source_id` (the uploaded PDF filename).
- The JSON index file is `data/js_ann.index.json` by default.
- Query responses return chunk `text`, `page`, and `source_id` under `meta`.

## API endpoints
- `POST /ingest_pdf` — upload a PDF file as `multipart/form-data`; extracts text, chunks pages, embeds chunks, stores vectors
- `GET /query?q=...&k=5` — query with text, returns top-k similar chunks
- `GET /health` — basic service health check

## Persistence behavior
- Default data directory: `data/`
- Vector index file: `data/js_ann.index.json`
- On ingest, new chunks are appended and the index file is re-written to persist updates

## Notes
- Tests use `jest` and `supertest` and live in `tests/`.
- The repository was ported from a Python FastAPI implementation to Node.js — Python sources were removed.
