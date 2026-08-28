from __future__ import annotations

from pathlib import Path

from backend.config.logger import configure_logger
from backend.config.settings import (
    MissingEnvironmentVariableError,
    Settings,
    get_project_root,
    load_environment,
    validate_gemini_api_key,
)


class ConfigurationError(RuntimeError):
    """Base exception for configuration problems."""


class LoggingConfigurationError(ConfigurationError):
    """Raised when application logging cannot be configured."""


def initialize_config(app_name: str = "feedback_management") -> Settings:
    """Load environment settings, configure logging, and validate runtime configuration.

    Raises:
        MissingEnvironmentVariableError: If the Gemini API key is not defined.
        InvalidGeminiApiKeyError: If the Gemini API key does not match the expected format.
        LoggingConfigurationError: If logging cannot be initialized.
    """

    project_root = get_project_root()
    env_path = load_environment(project_root)

    if not env_path.exists():
        raise MissingEnvironmentVariableError(
            "Environment file not found. Create a .env file with GEMINI_API_KEY before starting the application."
        )

    settings = Settings.from_env(project_root=project_root)
    settings.gemini_api_key = validate_gemini_api_key(settings.gemini_api_key)

    try:
        logger = configure_logger(project_root=project_root, app_name=app_name)
    except Exception as exc:
        raise LoggingConfigurationError(
            f"Unable to configure application logging: {exc}"
        ) from exc

    logger.info("Configuration loaded successfully.")
    return settings
