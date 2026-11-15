import os
import tempfile
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from pydantic import BaseModel, Field

from . import analyzers, ingest, rag, vectorstore
from .config import settings


def require_key(x_internal_key: str = Header(default="")):
    if x_internal_key != settings.internal_api_key:
        raise HTTPException(status_code=401, detail="Invalid internal API key")


@asynccontextmanager
async def lifespan(app: FastAPI):
    vectorstore.get_collection()  # open persistent store
    yield


app = FastAPI(title="CampusGPT RAG Service", lifespan=lifespan, dependencies=[Depends(require_key)])


@app.get("/health")
def health():
    return {"status": "ok", "chunks": vectorstore.get_collection().count(), "embeddingModel": settings.embedding_model}


@app.post("/documents/ingest")
async def ingest_document(
    file: UploadFile = File(...),
    document_id: str = Form(...),
    document_name: str = Form(...),
    department: str = Form("All"),
    semester: int = Form(0),
    category: str = Form("General"),
    uploaded_at: str = Form(""),
):
    suffix = os.path.splitext(file.filename or "")[1] or ".pdf"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        path = tmp.name
    try:
        pages = ingest.extract_pages(path)
        meta = {
            "document_id": document_id,
            "document_name": document_name,
            "department": department,
            "semester": semester,
            "category": category,
            "uploaded_at": uploaded_at,
        }
        chunks = ingest.chunk_pages(pages, meta)
        vectorstore.delete_document(document_id)  # makes re-indexing idempotent
        n = vectorstore.add_chunks(chunks)
        return {"documentId": document_id, "pages": len(pages), "chunks": n}
    except ingest.UnreadablePDF as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    finally:
        os.unlink(path)


@app.delete("/documents/{document_id}")
def delete_document(document_id: str):
    vectorstore.delete_document(document_id)
    return {"deleted": document_id}


class ChatIn(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    language: str = "en"
    department: str | None = None
    semester: int | None = None
    history: list[dict] = []
    documentIds: list[str] | None = None


@app.post("/chat")
def chat(body: ChatIn):
    try:
        return rag.answer_question(
            body.question, body.language, body.department, body.semester, body.history, body.documentIds
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}")


class NoticeIn(BaseModel):
    documentId: str


@app.post("/notices/analyze")
def analyze_notice(body: NoticeIn):
    try:
        return analyzers.analyze_notice(body.documentId)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Analysis failed: {exc}")


class QuizIn(BaseModel):
    documentIds: list[str] | None = None
    topic: str | None = None
    numQuestions: int = Field(default=5, ge=1, le=15)
    difficulty: str = "medium"
    language: str = "en"
    department: str | None = None
    semester: int | None = None


@app.post("/quiz/generate")
def generate_quiz(body: QuizIn):
    try:
        return analyzers.generate_quiz(
            body.documentIds, body.topic, body.numQuestions, body.difficulty,
            body.language, body.department, body.semester,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Quiz generation failed: {exc}")
