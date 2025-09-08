from __future__ import annotations

from functools import lru_cache
from typing import Literal, Optional
from urllib.parse import quote_plus

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables.

    This uses pydantic-settings (Pydantic v2) and supports an optional .env file.
    """

    # Database
    db_host: str = Field(default="localhost", alias="DB_HOST")
    db_port: int = Field(default=5432, alias="DB_PORT")
    db_user: str = Field(default="postgres", alias="DB_USER")
    db_pass: str = Field(default="postgres", alias="DB_PASS")
    db_name: str = Field(default="myriskagent", alias="DB_NAME")

    # Cache / Queue
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")

    # Vectors
    vector_backend: Literal["pgvector", "chroma"] = Field(default="pgvector", alias="VECTOR_BACKEND")

    # Object storage
    object_store_uri: str = Field(default="file:///data", alias="OBJECT_STORE_URI")

    # Observability
    otel_exporter_otlp_endpoint: Optional[str] = Field(default=None, alias="OTEL_EXPORTER_OTLP_ENDPOINT")

    # External APIs
    newsapi_key: Optional[str] = Field(default=None, alias="NEWSAPI_KEY")
    alphavantage_key: Optional[str] = Field(default=None, alias="ALPHAVANTAGE_KEY")

    # LLMs
    openai_api_key: Optional[str] = Field(default=None, alias="OPENAI_API_KEY")

    # Settings behavior
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    @property
    def sqlalchemy_database_uri(self) -> str:
        """Return a SQLAlchemy-compatible Postgres URL."""
        password = quote_plus(self.db_pass)
        return (
            f"postgresql+psycopg2://{self.db_user}:{password}@{self.db_host}:{self.db_port}/{self.db_name}"
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Load settings once per process.

    Use dependency injection in FastAPI routes to access.
    """
    return Settings()  # type: ignore[call-arg]
