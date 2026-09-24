from app.config import Settings, postgres_url


def test_split_database_vars_build_the_postgres_url():
    settings = Settings(
        database_url="sqlite:///./data/lexis.db",
        db_host="jonathan_db",
        db_port=5432,
        db_name="lexis",
        db_user="jonathan",
        db_password="senha/com@sinal",
    )
    assert settings.database_url == postgres_url("jonathan", "senha/com@sinal", "jonathan_db", 5432, "lexis")
    assert settings.database_url == "postgresql+psycopg://jonathan:senha%2Fcom%40sinal@jonathan_db:5432/lexis"
    assert settings.is_sqlite is False


def test_missing_database_vars_keep_sqlite():
    settings = Settings(database_url="sqlite:///./data/lexis.db", db_host="so-o-host")
    assert settings.database_url == "sqlite:///./data/lexis.db"
    assert settings.is_sqlite is True
