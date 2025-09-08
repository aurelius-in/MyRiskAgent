from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, Optional

import duckdb
import pandas as pd


@dataclass
class ObjectStore:
    base_uri: str

    def _local_path(self, key: str) -> Path:
        assert self.base_uri.startswith("file://"), "Only file:// supported in MVP"
        base_path = Path(self.base_uri.replace("file://", ""))
        base_path.mkdir(parents=True, exist_ok=True)
        return base_path / key

    def put_bytes(self, key: str, data: bytes) -> str:
        path = self._local_path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return f"{self.base_uri.rstrip('/')}/{key}"

    def get_bytes(self, key: str) -> bytes:
        path = self._local_path(key)
        return path.read_bytes()

    def put_text(self, key: str, text: str) -> str:
        return self.put_bytes(key, text.encode("utf-8"))

    def get_text(self, key: str) -> str:
        return self.get_bytes(key).decode("utf-8")


def content_hash_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_evidence_zip(store: ObjectStore, key_prefix: str, payloads: dict[str, bytes]) -> str:
    """Write a simple evidence bundle as individual files under a prefix.

    MVP: store as directory-like prefix; later zip and sign.
    """
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    manifest = {"created_at": timestamp, "files": {}}
    for name, blob in payloads.items():
        uri = store.put_bytes(f"{key_prefix}/{timestamp}/{name}", blob)
        manifest["files"][name] = {"uri": uri, "sha256": content_hash_bytes(blob)}
    store.put_text(f"{key_prefix}/{timestamp}/MANIFEST.json", json.dumps(manifest, indent=2))
    return f"{store.base_uri.rstrip('/')}/{key_prefix}/{timestamp}"


def seed_sample_claims(sample_path: str, out_parquet: Optional[str] = None) -> pd.DataFrame:
    """Load the provided sample claims parquet and return a DataFrame.

    If out_parquet is provided, save a copy to that path.
    """
    df = pd.read_parquet(sample_path)
    if out_parquet:
        Path(out_parquet).parent.mkdir(parents=True, exist_ok=True)
        df.to_parquet(out_parquet, index=False)
    return df


def build_duckdb_connection(readonly: bool = True):
    flags = {"access_mode": "READ_ONLY" if readonly else "READ_WRITE"}
    con = duckdb.connect(config=flags)
    return con
