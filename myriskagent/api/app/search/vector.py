from __future__ import annotations

import math
import os
import re
from dataclasses import dataclass
from typing import Callable, Iterable, List, Optional, Sequence, Tuple

from sqlalchemy import text
from sqlmodel import create_engine

try:
    import openai  # type: ignore
except Exception:  # pragma: no cover
    openai = None  # type: ignore

try:
    import chromadb  # type: ignore
except Exception:  # pragma: no cover
    chromadb = None  # type: ignore


def _tokenize(text: str) -> List[str]:
    return re.findall(r"[A-Za-z0-9_]+", text.lower())


def hash_embed(text: str, dim: int = 1536) -> List[float]:
    vec = [0.0] * dim
    tokens = _tokenize(text)
    if not tokens:
        return vec
    for tok in tokens:
        h = hash(tok) % dim
        vec[h] += 1.0
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def get_embedder(dim: int = 1536) -> Callable[[str], List[float]]:
    """Return an embedding function using OpenAI. Required by policy.

    If OVERRIDE_HASH_EMBED=true is set (for local dev only), use hashing fallback.
    """
    if os.getenv("OVERRIDE_HASH_EMBED", "").lower() in {"1", "true", "yes"}:
        return lambda t: hash_embed(t, dim)

    api_key = os.getenv("OPENAI_API_KEY")
    if openai is None or not api_key:
        raise RuntimeError("OPENAI_API_KEY is required for embeddings (no fallback)")
    client = openai.OpenAI(api_key=api_key)
    model = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")

    def _embed(text: str) -> List[float]:
        resp = client.embeddings.create(model=model, input=text[:8000])
        vec = resp.data[0].embedding
        if len(vec) > dim:
            vec2 = vec[:dim]
        elif len(vec) < dim:
            vec2 = vec + [0.0] * (dim - len(vec))
        else:
            vec2 = vec
        n = math.sqrt(sum(v * v for v in vec2)) or 1.0
        return [v / n for v in vec2]

    return _embed


@dataclass
class DocumentUpsert:
    id: Optional[int]
    org_id: int
    title: Optional[str]
    url: Optional[str]
    content: str
    published_at: Optional[str] = None


class PgVectorStore:
    def __init__(self, sqlalchemy_uri: str) -> None:
        self.engine = create_engine(sqlalchemy_uri, echo=False)
        self.dim = 1536
        self._embed = get_embedder(self.dim)

    def upsert_documents(self, docs: Sequence[DocumentUpsert]) -> int:
        if not docs:
            return 0
        inserted = 0
        with self.engine.begin() as conn:
            for d in docs:
                emb = self._embed(d.content)
                if d.url:
                    row = conn.execute(text("select id from document where url = :url limit 1"), {"url": d.url}).first()
                    if row:
                        conn.execute(
                            text(
                                "update document set title=:title, content=:content, published_at=:published_at, embedding=:embedding where id=:id"
                            ),
                            {
                                "title": d.title,
                                "content": d.content,
                                "published_at": d.published_at,
                                "embedding": emb,
                                "id": row[0],
                            },
                        )
                        inserted += 1
                        continue
                conn.execute(
                    text(
                        "insert into document (org_id, source_id, title, url, published_at, content, embedding, created_at) values (:org_id, NULL, :title, :url, :published_at, :content, :embedding, now())"
                    ),
                    {
                        "org_id": d.org_id,
                        "title": d.title,
                        "url": d.url,
                        "published_at": d.published_at,
                        "content": d.content,
                        "embedding": emb,
                    },
                )
                inserted += 1
        return inserted

    def search(self, query: str, org_id: Optional[int], k: int = 5) -> List[dict]:
        q_emb = self._embed(query)
        org_filter = "and org_id = :org_id" if org_id is not None else ""
        sql = text(
            f"""
            select id, org_id, title, url, published_at, left(content, 300) as snippet,
                   (embedding <=> :qvec) as distance
            from document
            where embedding is not null {org_filter}
            order by embedding <=> :qvec asc
            limit :k
            """
        )
        params = {"qvec": q_emb, "k": k}
        if org_id is not None:
            params["org_id"] = org_id
        with self.engine.begin() as conn:
            rows = conn.execute(sql, params).mappings().all()
        results = []
        for r in rows:
            results.append(
                {
                    "id": r["id"],
                    "org_id": r["org_id"],
                    "title": r["title"],
                    "url": r["url"],
                    "published_at": r["published_at"],
                    "snippet": r["snippet"],
                    "score": 1.0 - float(r["distance"] or 1.0),
                }
            )
        return results


class InMemoryVectorStore:
    def __init__(self) -> None:
        self.docs: List[Tuple[int, int, str, Optional[str], List[float]]] = []
        self._next_id = 1
        self._embed = get_embedder()

    def upsert_documents(self, docs: Sequence[DocumentUpsert]) -> int:
        for d in docs:
            emb = self._embed(d.content)
            did = self._next_id
            self._next_id += 1
            self.docs.append((did, d.org_id, d.title or "", d.url, emb))
        return len(docs)

    @staticmethod
    def _cosine(a: List[float], b: List[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        na = math.sqrt(sum(x * x for x in a)) or 1.0
        nb = math.sqrt(sum(y * y for y in b)) or 1.0
        return dot / (na * nb)

    def search(self, query: str, org_id: Optional[int], k: int = 5) -> List[dict]:
        q = self._embed(query)
        scored: List[Tuple[float, Tuple[int, int, str, Optional[str], List[float]]]] = []
        for rec in self.docs:
            if org_id is not None and rec[1] != org_id:
                continue
            scored.append((self._cosine(q, rec[4]), rec))
        top = sorted(scored, key=lambda x: x[0], reverse=True)[:k]
        out = []
        for score, (did, o, title, url, _emb) in top:
            out.append({"id": did, "org_id": o, "title": title, "url": url, "score": float(score)})
        return out


class ChromaVectorStore:
    def __init__(self, persist_dir: Optional[str] = None) -> None:
        self._embed = get_embedder()
        if chromadb is None:  # pragma: no cover
            self._client = None
            self._docs: List[Tuple[str, int, str, Optional[str], List[float]]] = []
        else:
            settings = chromadb.config.Settings(chroma_db_impl="duckdb+parquet", persist_directory=persist_dir) if persist_dir else None
            self._client = chromadb.Client(settings) if settings else chromadb.Client()
            self._coll = self._client.get_or_create_collection("documents")

    def upsert_documents(self, docs: Sequence[DocumentUpsert]) -> int:
        if chromadb is None:  # fallback in-memory
            for d in docs:
                doc_id = d.url or f"doc-{len(self._docs)+1}"
                self._docs.append((doc_id, d.org_id, d.title or "", d.url, self._embed(d.content)))
            return len(docs)
        ids = []
        embeddings = []
        metadatas = []
        documents = []
        for d in docs:
            ids.append(d.url or f"{d.org_id}-{len(ids)+1}")
            embeddings.append(self._embed(d.content))
            metadatas.append({"org_id": d.org_id, "title": d.title or ""})
            documents.append(d.content)
        self._coll.upsert(ids=ids, embeddings=embeddings, metadatas=metadatas, documents=documents)
        return len(docs)

    def search(self, query: str, org_id: Optional[int], k: int = 5) -> List[dict]:
        if chromadb is None:  # fallback search
            q = self._embed(query)
            scored: List[Tuple[float, Tuple[str, int, str, Optional[str], List[float]]]] = []
            for rec in self._docs:
                if org_id is not None and rec[1] != org_id:
                    continue
                dot = sum(x * y for x, y in zip(q, rec[4]))
                nq = math.sqrt(sum(x * x for x in q)) or 1.0
                nr = math.sqrt(sum(y * y for y in rec[4])) or 1.0
                scored.append((dot / (nq * nr), rec))
            top = sorted(scored, key=lambda x: x[0], reverse=True)[:k]
            out = []
            for score, (doc_id, o, title, url, _emb) in top:
                out.append({"id": doc_id, "org_id": o, "title": title, "url": url, "score": float(score)})
            return out
        res = self._coll.query(query_embeddings=[self._embed(query)], n_results=k, where={"org_id": org_id} if org_id is not None else {})
        out: List[dict] = []
        for i, _id in enumerate(res.get("ids", [[]])[0]):
            out.append({
                "id": _id,
                "org_id": (res.get("metadatas", [[]])[0][i] or {}).get("org_id"),
                "title": (res.get("metadatas", [[]])[0][i] or {}).get("title"),
                "url": None,
                "score": float(res.get("distances", [[]])[0][i]) if res.get("distances") else 0.0,
            })
        return out


__all__ = ["hash_embed", "PgVectorStore", "InMemoryVectorStore", "DocumentUpsert", "get_embedder", "ChromaVectorStore"]
