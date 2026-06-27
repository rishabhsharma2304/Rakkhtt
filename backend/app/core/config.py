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

    # Required — no default. The app must fail fast at startup if these are not
    # provided via the environment (or .env), so a real secret/DB is never
    # silently replaced by an insecure dev placeholder.
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 720

    # Required — no default. Startup must fail fast if allowed CORS origins are
    # not explicitly configured, so production never silently inherits a
    # localhost (or any other) default.
    CORS_ORIGINS: str
    SEED_ON_START: bool = False

    # Logging — structured logs go to stdout (picked up by the Docker log driver).
    # LOG_LEVEL is any standard level name (DEBUG/INFO/WARNING/ERROR/CRITICAL).
    # LOG_JSON renders one JSON object per line in prod; set false for the colour
    # console renderer when developing locally.
    LOG_LEVEL: str = "INFO"
    LOG_JSON: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    def validate_runtime(self) -> None:
        """Fail fast if any required env var is missing or still holds an insecure
        development placeholder. Called from the FastAPI startup handler so a
        misconfigured deployment never boots and silently serves with dev defaults.

        Pydantic already enforces presence of the no-default fields (DATABASE_URL,
        JWT_SECRET, CORS_ORIGINS); this additionally rejects known placeholder/blank
        values that pass the type check but are unsafe to run with.
        """
        problems: list[str] = []

        secret = (self.JWT_SECRET or "").strip()
        if not secret:
            problems.append("JWT_SECRET is not set")
        elif secret == "dev-secret-change-me":
            problems.append(
                "JWT_SECRET is still the insecure default 'dev-secret-change-me' — "
                "set a real secret"
            )

        if not (self.DATABASE_URL or "").strip():
            problems.append("DATABASE_URL is not set")

        if not self.cors_origin_list:
            problems.append("CORS_ORIGINS is not set to any origins")

        if problems:
            raise RuntimeError(
                "Invalid configuration; refusing to start:\n  - "
                + "\n  - ".join(problems)
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
