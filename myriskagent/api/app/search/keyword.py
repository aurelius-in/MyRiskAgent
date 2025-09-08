from __future__ import annotations

import math
import re
from collections import Counter, defaultdict
from typing import Iterable, List, Tuple


def tokenize(text: str) -> List[str]:
    return [t for t in re.findall(r"[A-Za-z0-9_]+", text.lower()) if t]


def bm25_score(query: str, documents: Iterable[Tuple[str, str]], k1: float = 1.5, b: float = 0.75):
    """Compute a simple BM25-like score over in-memory documents.

    documents: iterable of (doc_id, text)
    returns list[(doc_id, score)] sorted desc
    """
    docs = list(documents)
    tokenized_docs = [(doc_id, tokenize(text)) for doc_id, text in docs]
    N = len(tokenized_docs)
    avgdl = sum(len(toks) for _, toks in tokenized_docs) / max(1, N)

    # document frequency
    df = Counter()
    for _, toks in tokenized_docs:
        df.update(set(toks))

    q_tokens = tokenize(query)
    scores = defaultdict(float)
    for q in q_tokens:
        n_q = df.get(q, 0)
        if n_q == 0:
            continue
        idf = math.log(1 + (N - n_q + 0.5) / (n_q + 0.5))
        for doc_id, toks in tokenized_docs:
            fqd = toks.count(q)
            dl = len(toks)
            denom = fqd + k1 * (1 - b + b * (dl / avgdl))
            scores[doc_id] += idf * (fqd * (k1 + 1)) / (denom if denom > 0 else 1)

    return sorted(scores.items(), key=lambda x: x[1], reverse=True)


def postgres_fts_query(query: str) -> str:
    """Return a tsquery string for Postgres FTS (simple parsing)."""
    terms = tokenize(query)
    if not terms:
        return "''"
    return " & ".join(terms)
