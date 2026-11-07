from functools import lru_cache
from urllib.parse import quote_plus

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def postgres_url(user: str, password: str, host: str, port: int, name: str) -> str:
    return (
        f"postgresql+psycopg://{quote_plus(user)}:{quote_plus(password)}"
        f"@{host}:{port}/{quote_plus(name)}"
    )


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "sqlite:///./data/lexis.db"
    db_host: str = ""
    db_port: int = 5432
    db_name: str = ""
    db_user: str = ""
    db_password: str = ""
    cors_origins: str = "http://127.0.0.1:8080,http://localhost:8080"
    jwt_secret: str = "lexis-dev-secret-change-in-production"
    jwt_expire_days: int = 30
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    app_url: str = "https://lexis.jonathanvenancio.site"
    default_timezone: str = ""
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_subject: str = ""

    @model_validator(mode="after")
    def apply_split_database(self) -> "Settings":
        if self.db_host and self.db_name and self.db_user and self.db_password:
            self.database_url = postgres_url(
                self.db_user,
                self.db_password,
                self.db_host,
                self.db_port,
                self.db_name,
            )
        return self

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def smtp_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_user and self.smtp_password)

    @property
    def mail_from(self) -> str:
        return self.smtp_from or self.smtp_user

    @property
    def vapid_configured(self) -> bool:
        return bool(self.vapid_public_key and self.vapid_private_key)

    @property
    def vapid_mailto(self) -> str:
        subject = self.vapid_subject.strip()
        if subject.startswith("mailto:") or subject.startswith("https://"):
            return subject
        if "@" in subject:
            return f"mailto:{subject}"
        if "@" in self.smtp_user:
            return f"mailto:{self.smtp_user}"
        return "mailto:lexis@localhost"


@lru_cache
def get_settings() -> Settings:
    return Settings()
