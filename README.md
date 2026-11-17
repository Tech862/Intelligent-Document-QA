# ResearchVault AI

ResearchVault AI is a private document research workspace with account-scoped uploads, semantic passage retrieval, grounded answers, and document citations.

## Stack

- Web: React 19, Vite, React Router, Tailwind CSS, Axios, Framer Motion, Lucide React, Recharts.
- API: Flask, Flask-JWT-Extended, Flask-SQLAlchemy, PostgreSQL or SQLite.
- Ingestion: pypdf, python-docx, cleaned overlapping text chunks, local embeddings.
- Vector retrieval: FAISS `IndexFlatIP` with per-user indexes; chunk vectors and metadata are persisted in SQL so indexes can be rebuilt after restart.
- Answer generation: optional OpenAI-compatible endpoint; without a key the API returns the strongest retrieved passage extractively.

## Run Locally

Requirements: Node.js 20+, Python 3.11+, and npm.

1. Create the backend environment file at the repository root:

   ```sh
   cp .env.example .env
   ```

   The defaults use SQLite and hashing-vector embeddings. Replace the Flask and JWT secrets before exposing the service. Set `OPENAI_API_KEY` only on the server if LLM generation is wanted.

2. Install and start the API from the repository root:

   ```sh
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r backend/requirements.txt
   cd backend
   flask --app wsgi run --host 127.0.0.1 --port 5001
   ```

   The health endpoint is `http://localhost:5001/api/health`. Port 5001 avoids macOS services that commonly reserve port 5000.

3. In another terminal, configure and start the frontend from its folder:

   ```sh
   cd frontend
   cp .env.example .env
   npm install
   npm run dev
   ```

   Open `http://localhost:5173`. `frontend/.env` controls `VITE_API_URL`; `FRONTEND_ORIGIN` in the repository-root `.env` must match the browser origin for CORS.

## Database

For local development, the app creates a SQLite database in `backend/instance/`. For PostgreSQL, configure `DATABASE_URL` in `.env`, for example:

```text
postgresql+psycopg://researchvault:your-password@localhost:5432/researchvault
```

The app applies an additive schema compatibility step for older local databases. For production schema evolution, use and review explicit Alembic migrations rather than relying on startup table creation.

## Document Ingestion

`POST /api/documents` accepts PDF, DOCX, and TXT files up to 25 MB. The API validates the extension and content, stores files in a per-user directory using generated filenames, extracts text and PDF page numbers, cleans and chunks the text with overlap, generates vectors, persists chunk metadata, and marks the document ready. Its `processing_stage` field progresses through `uploading`, `extracting_text`, `chunking`, `generating_embeddings`, `indexing`, and `ready`; failures are marked `failed` with an error message. The web library provides drag-and-drop, transfer progress, file details, and processing status.

Embeddings use the local `sentence-transformers/all-MiniLM-L6-v2` model when `sentence-transformers` is installed. If the optional dependency or model is unavailable, the service falls back to `HashingVectorizer`, which is lexical rather than semantic. Install the optional model package with:

```sh
pip install -r backend/requirements-embeddings.txt
```

The model downloads on first use if it is not already cached. When a model change produces a different vector dimension, existing chunks are automatically re-embedded the next time that account searches. Retrieval combines semantic similarity with BM25 keyword scoring and filters low-relevance results using `RETRIEVAL_MIN_SIMILARITY` and `RETRIEVAL_MIN_HYBRID_SCORE`.

`VectorStore` is the retrieval boundary (`add_documents`, `similarity_search`, `delete_document`, `update_document`). FAISS is the initial provider. Replacing it with Qdrant, Pinecone, Weaviate, Chroma, or PostgreSQL pgvector can be done behind this interface. Current indexes are in-process caches that rebuild from SQL and use exact inner-product search; a distributed deployment should use a shared vector service and durable private object storage.

## Grounded Answers And Citations

`POST /api/queries` embeds the question, retrieves only ready chunks owned by the authenticated user, builds a context from the top passages, then calls the configured OpenAI-compatible model or uses an extractive fallback. The generation instruction prohibits unsupported claims and asks the model to state when the uploaded context does not contain the answer. Responses and history include document ID/name, chunk ID, text, creation time, similarity score, and PDF page number when available. Citation cards expose the source passage and link to the matching library entry.

No answer is guaranteed to be correct; inspect the linked source passage and surrounding document context.

## Authentication And Privacy

Register and login return a JWT. Browser tokens are session-scoped by default; the login “Remember me” option opts into persistent browser storage. Password reset uses single-use hashed tokens with a 30-minute expiry and requires SMTP configuration for email delivery. Every document, collection, history, stats, and retrieval query is scoped to the authenticated user. Uploaded files are stored outside the frontend static directory.

Set unique long `FLASK_SECRET_KEY` and `JWT_SECRET_KEY` values for deployment. Do not put provider credentials in frontend variables. In production use HTTPS, a production WSGI server, rate limits, upload scanning/retention controls, durable private storage, backups, and provider privacy review.

## Tests

Frontend production build:

```sh
cd frontend
npm run build
```

Backend integration tests (from the repository root):

```sh
cd backend
python -m pytest -q
```

The tests cover authentication/reset behavior, invalid/expired JWTs, account isolation, TXT and DOCX processing, citations, FAISS index refresh, collections, stats, and document deletion using temporary SQLite databases.
