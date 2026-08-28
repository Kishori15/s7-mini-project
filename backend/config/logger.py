from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path


def configure_logger(project_root: Path | str, app_name: str = "feedback_management") -> logging.Logger:
    """Configure a module-level logger for the application.

    Args:
        project_root: Root folder for log file creation.
        app_name: Application name used in the log file name.

    Returns:
        A configured logger instance.

    Raises:
        RuntimeError: If the logger cannot be configured.
    """

    root = Path(project_root)
    logs_dir = root / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = logs_dir / f"{app_name}_{timestamp}.log"

    logger = logging.getLogger(app_name)
    logger.setLevel(logging.INFO)
    logger.propagate = False

    if logger.handlers:
        logger.handlers.clear()

    formatter = logging.Formatter(
        "%(asctime)s - %(levelname)s - %(name)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    return logger
