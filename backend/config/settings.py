from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


class ConfigurationError(RuntimeError):
    """Base exception for configuration problems."""


class MissingEnvironmentVariableError(ConfigurationError):
    """Raised when a required environment variable is missing."""


class InvalidGeminiApiKeyError(ConfigurationError):
    """Raised when the Gemini API key is missing or malformed."""


@dataclass(frozen=True)
class Settings:
    """Application settings resolved from environment variables."""

    project_root: Path
    gemini_api_key: str

    @classmethod
    def from_env(cls, project_root: Path | str) -> "Settings":
        root = Path(project_root)
        gemini_api_key = os.getenv("GEMINI_API_KEY", "")

        if not gemini_api_key:
            raise MissingEnvironmentVariableError(
                "GEMINI_API_KEY is required but was not found in the environment."
            )

        return cls(project_root=root, gemini_api_key=gemini_api_key)


def get_project_root() -> Path:
    """Return the project root directory."""

    return Path(__file__).resolve().parents[2]


def load_environment(project_root: Path | str) -> Path:
    """Load environment variables from the repository root .env file."""

    root = Path(project_root)
    env_path = root / ".env"
    load_dotenv(env_path)
    return env_path


def validate_gemini_api_key(gemini_api_key: str) -> str:
    """Validate the Gemini API key.

    The value must be a non-empty string with a sensible minimum length.

    Raises:
        InvalidGeminiApiKeyError: If the key is blank or malformed.
    """

    if not isinstance(gemini_api_key, str):
        raise InvalidGeminiApiKeyError(
            "GEMINI_API_KEY must be configured as a string value."
        )

    normalized_key = gemini_api_key.strip()
    if not normalized_key:
        raise InvalidGeminiApiKeyError(
            "GEMINI_API_KEY is missing or blank. Set it in the environment before starting the application."
        )

    if len(normalized_key) < 10:
        raise InvalidGeminiApiKeyError(
            "GEMINI_API_KEY appears invalid because it is too short."
        )

    return normalized_key
