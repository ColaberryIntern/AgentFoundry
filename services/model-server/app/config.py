"""
Application settings loaded from environment variables and .env file.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Model server configuration.

    Values are loaded from environment variables, falling back to the
    defaults specified here.  A `.env` file in the working directory is
    also read automatically.
    """

    MODEL_DIR: str = "./models"
    DATA_DIR: str = "./data"
    DATABASE_URL: str = (
        "postgresql://agentfoundry:localdev@localhost:5432/agentfoundry_db"
    )
    PORT: int = 8000
    MAX_BATCH_SIZE: int = 32
    MODEL_CACHE_TTL: int = 3600

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
