from abc import ABC, abstractmethod
from dataclasses import dataclass
import os
import math
import re
from threading import RLock

import numpy as np
from flask import current_app
from sqlalchemy import select

from ..extensions import db
from ..models import Chunk, Document


@dataclass
class UserIndex:
    vectors: np.ndarray
    metadata: list[dict]
    faiss_index: object | None


class VectorStore(ABC):
    @abstractmethod
    def add_documents(self, user_id, chunks):
        raise NotImplementedError

    @abstractmethod
    def similarity_search(self, user_id, query_embedding, top_k=5, document_ids=None, query_text=""):
        raise NotImplementedError

    @abstractmethod
    def delete_document(self, user_id, document_id):
        raise NotImplementedError

    @abstractmethod
    def update_document(self, user_id, document_id, chunks):
        raise NotImplementedError


class FaissVectorStore(VectorStore):
    def __init__(self):
        self._indices = {}
        self._lock = RLock()
        try:
            import faiss
        except ImportError:
            faiss = None
        self._faiss = faiss

    def _cache_key(self, user_id):
        database_uri = current_app.config["SQLALCHEMY_DATABASE_URI"]
        return database_uri, int(user_id)

    def _metadata(self, chunk, document):
        created_at = chunk.created_at.isoformat() if chunk.created_at else None
        return {
            "chunk_id": chunk.id,
            "document_id": document.id,
            "filename": document.filename,
            "document_name": document.filename,
            "page": chunk.page,
            "page_number": chunk.page,
            "content": chunk.text,
            "text": chunk.text,
            "created_at": created_at,
        }

    def _make_index(self, vectors):
        if self._faiss is None or not len(vectors):
            return None
        index = self._faiss.IndexFlatIP(vectors.shape[1])
        index.add(vectors)
        return index

    def _load_user_index(self, user_id):
        rows = db.session.execute(
            select(Chunk, Document)
            .join(Document, Chunk.document_id == Document.id)
            .where(Document.user_id == user_id, Document.status == "ready")
            .order_by(Chunk.id)
        ).all()
        if not rows:
            return UserIndex(np.empty((0, 0), dtype=np.float32), [], None)
        vectors = np.asarray([chunk.embedding for chunk, _document in rows], dtype=np.float32)
        metadata = [self._metadata(chunk, document) for chunk, document in rows]
        return UserIndex(vectors, metadata, self._make_index(vectors))

    def _index_for_user(self, user_id):
        key = self._cache_key(user_id)
        with self._lock:
            if key not in self._indices:
                self._indices[key] = self._load_user_index(user_id)
            return self._indices[key]

    def add_documents(self, user_id, chunks):
        chunks = list(chunks)
        if not chunks:
            return
        key = self._cache_key(user_id)
        with self._lock:
            index = self._indices.get(key)
            if index is None:
                self._indices[key] = self._load_user_index(user_id)
                return
            additions = []
            metadata = []
            for chunk in chunks:
                document = chunk.document
                if document.user_id != user_id or document.status != "ready":
                    continue
                additions.append(chunk.embedding)
                metadata.append(self._metadata(chunk, document))
            if not additions:
                return
            additions = np.asarray(additions, dtype=np.float32)
            if index.vectors.shape[1] != additions.shape[1]:
                self._indices.pop(key, None)
                return
            if index.faiss_index is not None:
                index.faiss_index.add(additions)
            index.vectors = np.concatenate((index.vectors, additions), axis=0)
            index.metadata.extend(metadata)

    def similarity_search(self, user_id, query_embedding, top_k=5, document_ids=None, query_text=""):
        index = self._index_for_user(user_id)
        if not len(index.vectors):
            return []
        query = np.asarray(query_embedding, dtype=np.float32).reshape(1, -1)
        if query.shape[1] != index.vectors.shape[1]:
            from ..services.embeddings import embeddings

            rows = db.session.execute(
                select(Chunk, Document)
                .join(Document, Chunk.document_id == Document.id)
                .where(Document.user_id == user_id, Document.status == "ready")
                .order_by(Chunk.id)
            ).all()
            if not rows:
                return []
            replacement_vectors = embeddings.encode([chunk.text for chunk, _document in rows])
            if len(replacement_vectors[0]) != query.shape[1]:
                return []
            for (chunk, _document), vector in zip(rows, replacement_vectors):
                chunk.embedding = vector
            db.session.commit()
            self.delete_document(user_id, -1)
            index = self._index_for_user(user_id)

        allowed_document_ids = set(document_ids) if document_ids else None
        vector_scores = index.vectors @ query[0]
        query_terms = re.findall(r"\w+", query_text.lower())
        documents = [re.findall(r"\w+", item["content"].lower()) for item in index.metadata]
        average_length = sum(map(len, documents)) / max(1, len(documents))
        frequencies = {}
        for terms in documents:
            for term in set(terms):
                frequencies[term] = frequencies.get(term, 0) + 1
        keyword_scores = []
        for terms in documents:
            term_counts = {term: terms.count(term) for term in set(query_terms)}
            score = 0.0
            for term, count in term_counts.items():
                if not count:
                    continue
                inverse_frequency = math.log(1 + (len(documents) - frequencies.get(term, 0) + 0.5) / (frequencies.get(term, 0) + 0.5))
                score += inverse_frequency * count * 2.2 / (count + 1.2 * (0.25 + 0.75 * len(terms) / max(1, average_length)))
            keyword_scores.append(score)
        max_keyword = max(keyword_scores, default=0.0)
        min_similarity = float(os.getenv("RETRIEVAL_MIN_SIMILARITY", "0.12"))
        min_hybrid = float(os.getenv("RETRIEVAL_MIN_HYBRID_SCORE", "0.08"))
        ranked = []
        for position, (item, vector_score, keyword_score) in enumerate(zip(index.metadata, vector_scores, keyword_scores)):
            if allowed_document_ids and item["document_id"] not in allowed_document_ids:
                continue
            normalized_keyword = keyword_score / max_keyword if max_keyword else 0.0
            normalized_vector = max(0.0, min(1.0, float(vector_score)))
            hybrid_score = 0.65 * normalized_vector + 0.35 * normalized_keyword
            if normalized_vector < min_similarity and normalized_keyword == 0:
                continue
            if hybrid_score < min_hybrid:
                continue
            ranked.append(({**item, "score": round(hybrid_score, 4), "semantic_score": round(normalized_vector, 4), "keyword_score": round(normalized_keyword, 4)}, position))
        ranked.sort(key=lambda result: result[0]["score"], reverse=True)
        return [item for item, _position in ranked[:top_k]]

    def delete_document(self, user_id, document_id):
        with self._lock:
            self._indices.pop(self._cache_key(user_id), None)

    def update_document(self, user_id, document_id, chunks):
        key = self._cache_key(user_id)
        chunks = list(chunks)
        with self._lock:
            index = self._indices.get(key) or self._load_user_index(user_id)
            retained_positions = [
                position for position, item in enumerate(index.metadata)
                if item["document_id"] != document_id
            ]
            retained_vectors = index.vectors[retained_positions] if len(index.vectors) else index.vectors
            retained_metadata = [index.metadata[position] for position in retained_positions]
            replacement_vectors = []
            replacement_metadata = []
            for chunk in chunks:
                document = chunk.document
                if document.user_id != user_id or document.id != document_id or document.status != "ready":
                    continue
                replacement_vectors.append(chunk.embedding)
                replacement_metadata.append(self._metadata(chunk, document))

            if replacement_vectors:
                replacement_vectors = np.asarray(replacement_vectors, dtype=np.float32)
                if len(retained_vectors) and retained_vectors.shape[1] != replacement_vectors.shape[1]:
                    self._indices[key] = self._load_user_index(user_id)
                    return
                vectors = np.concatenate((retained_vectors, replacement_vectors), axis=0) if len(retained_vectors) else replacement_vectors
            else:
                vectors = retained_vectors
            metadata = retained_metadata + replacement_metadata
            self._indices[key] = UserIndex(vectors, metadata, self._make_index(vectors))

    def clear(self):
        with self._lock:
            self._indices.clear()


VECTOR_STORE_PROVIDERS = {"faiss": FaissVectorStore}


def create_vector_store(provider=None):
    provider_name = (provider or os.getenv("VECTOR_STORE", "faiss")).strip().lower()
    try:
        store_class = VECTOR_STORE_PROVIDERS[provider_name]
    except KeyError as error:
        available = ", ".join(sorted(VECTOR_STORE_PROVIDERS))
        raise ValueError(f"Unsupported vector store '{provider_name}'. Available providers: {available}.") from error
    return store_class()


vector_store = create_vector_store()
