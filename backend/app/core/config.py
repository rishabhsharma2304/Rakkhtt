from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Brand — single source of truth. Change here to rebrand everything backend-side.
    # ASSUMPTION: the user's own design handoff brands the product "Rakkhtt" (their rebrand
    # of the legacy RAKT product) with a new droplet+pulse logo. Per their explicit request
    # to follow that theme, we use it as the default brand value while keeping it a single
    # config constant so it stays trivially changeable.
    BRAND_NAME: str = "Rakkhtt"

    DATABASE_URL: str = "postgresql+psycopg://bloodbank:bloodbank@localhost:5432/bloodbank"
    JWT_SECRET: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 720

    CORS_ORIGINS: str = "http://localhost:5173"
    SEED_ON_START: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
