"""Step 4 + 5 + 6: embeddings, persistent ChromaDB storage, retrieval."""
from functools import lru_cache

import chromadb
from langchain_huggingface import HuggingFaceEmbeddings

from .config import settings


@lru_cache(maxsize=1)
def get_embedder() -> HuggingFaceEmbeddings:
    return HuggingFaceEmbeddings(
        model_name=settings.embedding_model,
        encode_kwargs={"normalize_embeddings": True},
    )


@lru_cache(maxsize=1)
def get_collection():
    client = chromadb.PersistentClient(path=settings.chroma_dir)
    return client.get_or_create_collection(
        name=settings.chroma_collection,
        metadata={"hnsw:space": "cosine"},
    )


def add_chunks(chunks: list[dict]) -> int:
    if not chunks:
        return 0
    col = get_collection()
    texts = [c["text"] for c in chunks]
    embeddings = get_embedder().embed_documents(texts)
    batch = 128
    for i in range(0, len(chunks), batch):
        sl = slice(i, i + batch)
        col.upsert(
            ids=[c["id"] for c in chunks[sl]],
            documents=texts[sl],
            embeddings=embeddings[sl],
            metadatas=[c["metadata"] for c in chunks[sl]],
        )
    return len(chunks)


def delete_document(document_id: str) -> None:
    get_collection().delete(where={"document_id": document_id})


def count_document(document_id: str) -> int:
    res = get_collection().get(where={"document_id": document_id}, include=[])
    return len(res["ids"])


def _build_where(department: str | None, semester: int | None, document_ids: list[str] | None):
    """Metadata filter. Documents tagged 'All' (or no semester = 0) are always eligible."""
    clauses = []
    if document_ids:
        clauses.append({"document_id": {"$in": document_ids}})
    if department:
        clauses.append({"department": {"$in": [department, "All"]}})
    if semester:
        clauses.append({"semester": {"$in": [semester, 0]}})
    if not clauses:
        return None
    return clauses[0] if len(clauses) == 1 else {"$and": clauses}


def search(
    query: str,
    top_k: int | None = None,
    department: str | None = None,
    semester: int | None = None,
    document_ids: list[str] | None = None,
    threshold: float | None = None,
) -> list[dict]:
    top_k = top_k or settings.top_k
    threshold = settings.similarity_threshold if threshold is None else threshold
    col = get_collection()
    if col.count() == 0:
        return []

    q_emb = get_embedder().embed_query(query)
    where = _build_where(department, semester, document_ids)
    res = col.query(
        query_embeddings=[q_emb],
        n_results=top_k,
        where=where,
        include=["documents", "metadatas", "distances"],
    )

    hits = []
    for text, meta, dist in zip(res["documents"][0], res["metadatas"][0], res["distances"][0]):
        score = 1.0 - float(dist)  # cosine similarity
        if score >= threshold:
            hits.append({"text": text, "metadata": meta, "score": round(score, 4)})
    return hits
