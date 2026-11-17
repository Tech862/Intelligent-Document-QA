import re
from pathlib import Path

from docx import Document as WordDocument
from pypdf import PdfReader


SUPPORTED_EXTENSIONS = {"pdf", "docx", "txt"}
MAX_CHUNK_CHARS = 800
CHUNK_OVERLAP = 100


def extract_pages(path, extension):
    if extension == "pdf":
        reader = PdfReader(str(path))
        if reader.is_encrypted:
            raise ValueError("This PDF is password protected and cannot be indexed.")
        return [(page_number, page.extract_text() or "") for page_number, page in enumerate(reader.pages, 1)]
    if extension == "docx":
        document = WordDocument(str(path))
        paragraphs = [paragraph.text.strip() for paragraph in document.paragraphs if paragraph.text.strip()]
        text = "\n".join(paragraphs)
        return [(None, text)]
    return [(None, path.read_text(encoding="utf-8-sig", errors="replace"))]


def chunk_pages(pages):
    chunks = []
    for page_number, text in pages:
        normalized = re.sub(r"[ \t]+", " ", text)
        normalized = re.sub(r"\n{2,}", "\n", normalized).strip()
        if not normalized:
            continue
        start = 0
        while start < len(normalized):
            end = min(start + MAX_CHUNK_CHARS, len(normalized))
            if end < len(normalized):
                boundary = normalized.rfind(" ", start + MAX_CHUNK_CHARS // 2, end)
                if boundary > start:
                    end = boundary
            excerpt = normalized[start:end].strip()
            if excerpt:
                chunks.append({"text": excerpt, "page": page_number, "ordinal": len(chunks)})
            if end >= len(normalized):
                break
            start = max(end - CHUNK_OVERLAP, start + 1)
    return chunks
