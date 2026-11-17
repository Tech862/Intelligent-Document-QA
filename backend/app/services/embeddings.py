import os

import numpy as np
from sklearn.feature_extraction.text import HashingVectorizer


class EmbeddingService:
    def __init__(self):
        self.model = None
        self.model_checked = False
        self.vectorizer = HashingVectorizer(
            n_features=768,
            alternate_sign=False,
            norm="l2",
            ngram_range=(1, 2),
            strip_accents="unicode",
        )

    def _load_model(self):
        if self.model_checked:
            return
        self.model_checked = True
        if os.getenv("EMBEDDING_MODE", "sentence-transformers").lower() != "sentence-transformers":
            return
        try:
            from sentence_transformers import SentenceTransformer

            self.model = SentenceTransformer(os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"))
        except Exception as error:
            print(f"Sentence-transformer unavailable; using local hashed vectors: {error}")

    def encode(self, texts):
        self._load_model()
        if self.model is not None:
            return self.model.encode(texts, normalize_embeddings=True).tolist()
        vectors = self.vectorizer.transform(texts).toarray().astype(np.float32)
        return vectors.tolist()


embeddings = EmbeddingService()


def cosine_similarity(left, right):
    left_vector = np.asarray(left, dtype=np.float32)
    right_vector = np.asarray(right, dtype=np.float32)
    denominator = np.linalg.norm(left_vector) * np.linalg.norm(right_vector)
    return float(np.dot(left_vector, right_vector) / denominator) if denominator else 0.0
