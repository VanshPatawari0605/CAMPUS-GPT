# CampusGPT

Intelligent, personalised and multilingual college knowledge management using Retrieval-Augmented Generation.

## Architecture

```
React + TS (Vite)  ──/api──►  Express API (Node)  ──HTTP──►  FastAPI RAG service
   :5173                          :5000                          :8000
                                    │                              │
                                 MongoDB                        ChromaDB (persistent)
                       users, chats, doc metadata,          chunk embeddings + metadata,
                       deadlines, quizzes, analytics        semantic search
```

| Store | Purpose |
|-------|---------|
| MongoDB | Users and profiles, chat sessions and messages, document metadata and status, deadlines, announcements, quizzes and attempts, feedback, query logs |
| ChromaDB | Embedded document chunks, vector search, metadata filtering (department, semester, document), per-document delete and re-index |

The browser only talks to Express. The RAG service is internal and protected by a shared `X-Internal-Key`.

## Setup

Prerequisites: Node 18+, Python 3.10+, MongoDB running locally (or Atlas), a Gemini API key.

```bash
# 1. RAG service
cd rag-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # set GEMINI_API_KEY and INTERNAL_API_KEY
uvicorn app.main:app --port 8000

# 2. Backend
cd backend
npm install
cp .env.example .env            # set JWT_SECRET, ADMIN_*, same INTERNAL_API_KEY
npm run seed:admin              # creates the only admin account
npm run dev

# 3. Frontend
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

The first RAG start downloads the embedding model (`paraphrase-multilingual-MiniLM-L12-v2`, chosen because it handles English, Hindi and Odia). Change `EMBEDDING_MODEL` in `.env` to use another; re-index documents afterwards.

Admin login: `http://localhost:5173/admin/login` (no public admin registration exists).

## Demo flow

1. Log in as admin, upload a PDF under **Documents & notices**. Status goes *Indexing* then *ready*.
2. Tick "notice / circular" to get structured extraction (category, dates, eligibility, required documents, instructions). Deadlines found are queued under **Deadline review**; approve them to show students.
3. Register a student, open **AI Assistant**, ask a question. Click a source chip to see the passage and open the PDF at that page.
4. Ask something not in the documents: you get the fixed "could not find reliable information" reply, and it shows up under **Knowledge gaps** in the admin analytics.

## How each requirement is met

- **RAG pipeline**: `rag-service/app/ingest.py` (PyMuPDF extraction, per-page metadata, LangChain chunking with configurable size and overlap), `vectorstore.py` (HuggingFace embeddings, persistent ChromaDB, cosine similarity, top-k and threshold), `rag.py` and `llm.py` (Gemini).
- **No invented citations**: Gemini returns which numbered passages it used; page numbers come only from stored chunk metadata, never from model text. If retrieval finds nothing above the threshold, Gemini is not called at all.
- **Prompt-injection resistance**: retrieved text is delimited and labelled untrusted in the system prompt.
- **Scanned PDFs**: set `OCR_ENABLED=true` and install Tesseract; otherwise the upload fails with a clear message.
- **Personalisation**: retrieval filters on the student's department and semester (documents tagged "All" always match), falling back to all documents if nothing matches.
- **Security**: bcrypt (cost 12), JWT with expiry and server-side revocation on logout, role middleware, separate admin login, ownership checks on every chat and quiz query, rate limiting, helmet, input validation, PDF magic-byte check, SHA-256 duplicate detection.
- **Multilingual**: answers and quizzes in English, Hindi or Odia from the student's preferred language; the UI shell is translated in `frontend/src/lib/i18n.ts`.
- **Quizzes**: correct answers stay on the server until the attempt is submitted.

## Known limitations

- Not yet run end to end against live MongoDB and Gemini. Verified so far: PDF extraction and chunking on a real PDF (including the empty/scanned PDF error), Python compiles, the backend imports cleanly, the frontend type-checks and builds. Run the demo flow above to smoke-test the rest.
- `cd backend && npm install && npm test` runs an API smoke test (auth, role separation, chat ownership, duplicate upload, deadline visibility, logout revocation) against an in-memory MongoDB. It was written but could not be executed in the build environment, so treat a failure there as a possible test bug as well as an app bug.
- UI translations cover navigation, dashboard and chat labels only; admin pages are English.
- Hindi and Odia translations were machine-written and worth a native review before the demo.
- No automated tests yet.
- Uploaded PDFs are stored on local disk (`backend/uploads`), fine for a demo, not for multi-server deployment.
