from __future__ import annotations

from dataclasses import dataclass
from typing import Dict

from app.storage.io import ObjectStore, write_evidence_zip


@dataclass
class EvidenceRef:
    uri: str


class EvidenceAgent:
    def __init__(self, store: ObjectStore) -> None:
        self.store = store

    def build(self, entity: str, entity_id: str, period: str, payloads: Dict[str, bytes]) -> EvidenceRef:
        key_prefix = f"evidence/{entity}/{entity_id}/{period}"
        uri = write_evidence_zip(self.store, key_prefix, payloads)
        return EvidenceRef(uri=uri)
