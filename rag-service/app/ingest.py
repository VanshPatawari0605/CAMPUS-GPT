"""Step 2 + 3: PDF text extraction (PyMuPDF) and chunking."""
import io
from dataclasses import dataclass

import pymupdf as fitz  # PyMuPDF
from langchain_text_splitters import RecursiveCharacterTextSplitter

from .config import settings


class UnreadablePDF(Exception):
    pass


@dataclass
class PageText:
    page: int  # 1-based
    text: str


def _ocr_page(page: "fitz.Page") -> str:
    """OCR extension point. Enabled with OCR_ENABLED=true and Tesseract installed."""
    try:
        import pytesseract
        from PIL import Image

        pix = page.get_pixmap(dpi=200)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        return pytesseract.image_to_string(img)
    except Exception:
        return ""


def extract_pages(pdf_path: str) -> list[PageText]:
    try:
        doc = fitz.open(pdf_path)
    except Exception as exc:  # corrupt / not a PDF
        raise UnreadablePDF(f"Cannot open PDF: {exc}") from exc

    if doc.needs_pass:
        raise UnreadablePDF("PDF is password protected.")

    pages: list[PageText] = []
    for i, page in enumerate(doc, start=1):
        text = page.get_text("text").strip()
        if not text and settings.ocr_enabled:
            text = _ocr_page(page).strip()
        if text:
            pages.append(PageText(page=i, text=text))
    doc.close()

    if not pages:
        raise UnreadablePDF(
            "No extractable text found. The PDF may be scanned. "
            "Set OCR_ENABLED=true (requires Tesseract) to index scanned documents."
        )
    return pages


def chunk_pages(pages: list[PageText], base_meta: dict) -> list[dict]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks: list[dict] = []
    for p in pages:
        for j, piece in enumerate(splitter.split_text(p.text)):
            piece = piece.strip()
            if len(piece) < 20:
                continue
            chunks.append(
                {
                    "id": f"{base_meta['document_id']}-p{p.page}-c{j}",
                    "text": piece,
                    "metadata": {**base_meta, "page": p.page, "chunk_index": j},
                }
            )
    return chunks
