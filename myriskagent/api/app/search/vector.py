from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Iterable, List, Optional, Sequence, Tuple

from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine

# Hashing-trick embedding to avoid heavyweight deps in MVP

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
    # l2 normalize
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


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

    def upsert_documents(self, docs: Sequence[DocumentUpsert]) -> int:
        if not docs:
            return 0
        inserted = 0
        emb_dim = 1536
        with self.engine.begin() as conn:
            for d in docs:
                emb = hash_embed(d.content, emb_dim)
                if d.url:
                    # Try find existing by URL
                    row = conn.execute(text("select id from document where url = :url limit 1"), {"url": d.url}).first()
                    if row:
                        # Update existing
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
                # Insert new
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
        q_emb = hash_embed(query)
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

    def upsert_documents(self, docs: Sequence[DocumentUpsert]) -> int:
        for d in docs:
            emb = hash_embed(d.content)
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
        q = hash_embed(query)
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


__all__ = ["hash_embed", "PgVectorStore", "InMemoryVectorStore", "DocumentUpsert"]
