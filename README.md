 # rules-rag (Node.js port)

Minimal Node.js/Express port of the original FastAPI RAG service.

Install and run

```bash
npm install
npm start
```

Run in development with autoreload (nodemon):

```bash
npm run dev
```

Tests

```bash
npm test
```

Configuration

- Set `OPENAI_API_KEY` to enable OpenAI embeddings; otherwise a local hashing fallback is used.
- Data directory: `data/` (created automatically). The JSON-backed vector index is `data/js_ann.index.json`.

API endpoints

- `POST /ingest_pdf` — multipart form with `file` field (PDF upload)
- `GET /query?q=...&k=5` — semantic search
- `GET /health` — health check

Notes

- Tests are under `tests/` and use `jest` + `supertest`.
- This repository has been ported to Node.js; Python sources were removed during the port.
