from __future__ import annotations

from datetime import datetime, date
from typing import Optional, Literal

from sqlmodel import SQLModel, Field, Column
from sqlalchemy import String, Integer, Float, DateTime, Boolean
from sqlalchemy.dialects.postgresql import JSONB

try:
    from pgvector.sqlalchemy import Vector  # type: ignore
except Exception:  # pragma: no cover
    Vector = None  # type: ignore


class Org(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(sa_column=Column(String(255), nullable=False, unique=True))
    ticker: Optional[str] = Field(default=None, sa_column=Column(String(32), nullable=True, unique=False))
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=False)))


class Provider(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    org_id: int = Field(sa_column=Column(Integer, index=True, nullable=False))
    name: str = Field(sa_column=Column(String(255), nullable=False))
    industry: Optional[str] = Field(default=None, sa_column=Column(String(128)))
    region: Optional[str] = Field(default=None, sa_column=Column(String(64)))
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=False)))


class Claim(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    org_id: int = Field(sa_column=Column(Integer, index=True, nullable=False))
    provider_id: Optional[int] = Field(default=None, sa_column=Column(Integer, index=True))
    claim_id: Optional[str] = Field(default=None, sa_column=Column(String(64)))
    category: Optional[str] = Field(default=None, sa_column=Column(String(64)))
    claim_amount: float = Field(default=0.0, sa_column=Column(Float))
    claim_date: Optional[date] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=False)))


class ProviderFeature(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    provider_id: int = Field(sa_column=Column(Integer, index=True, nullable=False))
    org_id: int = Field(sa_column=Column(Integer, index=True, nullable=False))
    period: str = Field(sa_column=Column(String(32), index=True, nullable=False))
    features: dict = Field(default_factory=dict, sa_column=Column(JSONB))
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=False)))


class RiskScore(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    org_id: int = Field(sa_column=Column(Integer, index=True, nullable=False))
    entity_type: str = Field(default="org", sa_column=Column(String(32), index=True))
    entity_id: Optional[int] = Field(default=None, sa_column=Column(Integer, index=True))
    period: str = Field(sa_column=Column(String(32), index=True, nullable=False))
    family: Literal[
        "Financial Health Risk",
        "Compliance and Reputation Risk",
        "Operational and Outlier Risk",
        "Provider Billing Outlier Risk",
        "Combined Index",
    ] = Field(sa_column=Column(String(64), index=True))
    score: float = Field(sa_column=Column(Float))
    confidence: float = Field(sa_column=Column(Float, default=0.5))
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=False)))


class Source(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    org_id: int = Field(sa_column=Column(Integer, index=True, nullable=False))
    type: str = Field(sa_column=Column(String(64), nullable=False))
    endpoint: Optional[str] = Field(default=None, sa_column=Column(String(2048)))
    params: dict = Field(default_factory=dict, sa_column=Column(JSONB))
    enabled: bool = Field(default=True, sa_column=Column(Boolean, default=True))
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=False)))


class Document(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    org_id: int = Field(sa_column=Column(Integer, index=True, nullable=False))
    source_id: Optional[int] = Field(default=None, sa_column=Column(Integer, index=True))
    title: Optional[str] = Field(default=None, sa_column=Column(String(512)))
    url: Optional[str] = Field(default=None, sa_column=Column(String(2048)))
    published_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=False)))
    content: Optional[str] = None
    # Optional pgvector embedding column (1536 dims defaults)
    embedding: Optional[list[float]] = Field(
        default=None,
        sa_column=Column(Vector(1536)) if Vector is not None else None,  # type: ignore[arg-type]
    )
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=False)))
