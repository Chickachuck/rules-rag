Simple RAG service (FastAPI)

Run tests:

```bash
python -m pip install -r requirements.txt
pytest -q
```

Run the app:

```bash
uvicorn src.app:app --reload
```

PowerShell:

```powershell
.\.venv\Scripts\uvicorn.exe src.app:app --reload
```

Endpoints:
- `POST /ingest_pdf` — multipart file upload to ingest PDF
- `GET /query?q=...&k=5` — retrieve top-k chunks
