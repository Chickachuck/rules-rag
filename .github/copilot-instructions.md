# Copilot instructions

This repository is a small Python FastAPI RAG service.

## Key tasks for AI coding agents
- Preserve existing behavior when changing ingestion or query logic.
- Keep tests green: use `pytest -q` after edits.
- Prefer using `AGENTS.md` for high-level architecture and `README.md` for run/test commands.

## Important project details
- `src/app.py` handles PDF upload, extraction, embedding, and vector store persistence.
- `src/pdf_utils.py` now produces page-aware chunks and returns page metadata.
- `src/store.py` stores metadata in `data/ann.index.meta.json` and returns `text`, `source_id`, and `page` in query results.
- `source_id` should be the uploaded PDF filename.

## Commands
- Install: `python -m pip install -r requirements.txt`
- Test: `pytest -q`
- Run: `uvicorn src.app:app --reload`

## Notes for edits
- Do not delete or rewrite the stored index unless the change intentionally changes storage semantics.
- Keep `page` and `source_id` metadata consistent across ingestion, saving, and query responses.
- If adding new behavior, also add or update focused tests under `tests/`.
