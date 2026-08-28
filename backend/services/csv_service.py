from __future__ import annotations

from pathlib import Path

import pandas as pd


REQUIRED_COLUMNS = [
    "review_id",
    "product_name",
    "brand",
    "category",
    "rating",
    "review_text",
    "review_date",
]

OPTIONAL_COLUMNS = ["review_title"]


class CSVServiceError(Exception):
    """Base error for CSV upload and validation issues."""


class FileValidationError(CSVServiceError):
    """Raised when the uploaded file is invalid or unreadable."""


class InvalidSchemaError(CSVServiceError):
    """Raised when the dataset schema does not match the required contract."""


class InvalidRatingError(CSVServiceError):
    """Raised when a rating value falls outside the documented range."""


class EmptyDataError(CSVServiceError):
    """Raised when the CSV file contains no usable data."""


def load_csv(file_path: str | Path) -> pd.DataFrame:
    """Load a customer feedback CSV file and validate the dataset contract.

    Args:
        file_path: Path to the CSV file to be uploaded.

    Returns:
        A validated pandas DataFrame.

    Raises:
        FileValidationError: If the file does not exist, is empty, or is not a CSV.
        InvalidSchemaError: If required columns are missing or duplicated.
        InvalidRatingError: If any rating value is outside 1-5.
        EmptyDataError: If the DataFrame has no rows after loading.
    """

    csv_path = Path(file_path)

    if not csv_path.exists():
        raise FileValidationError(f"CSV file not found: {csv_path}")

    if csv_path.suffix.lower() != ".csv":
        raise FileValidationError(
            f"Invalid file type: expected .csv but received {csv_path.suffix or 'no extension'}"
        )

    try:
        df = pd.read_csv(csv_path, encoding="utf-8-sig")
    except UnicodeDecodeError as exc:
        raise FileValidationError(
            f"Unable to read CSV with UTF-8 encoding: {csv_path}"
        ) from exc
    except pd.errors.EmptyDataError as exc:
        raise EmptyDataError(f"CSV file is empty: {csv_path}") from exc
    except pd.errors.ParserError as exc:
        raise FileValidationError(f"Unable to parse CSV file: {csv_path}") from exc

    if df.empty:
        raise EmptyDataError(f"CSV file does not contain any rows: {csv_path}")

    duplicate_columns = df.columns[df.columns.duplicated()].tolist()
    if duplicate_columns:
        raise InvalidSchemaError(
            "Duplicate column headers found: " + ", ".join(sorted(set(duplicate_columns)))
        )

    missing_columns = [column for column in REQUIRED_COLUMNS if column not in df.columns]
    if missing_columns:
        raise InvalidSchemaError(
            "Missing required columns: " + ", ".join(missing_columns)
        )

    if "review_title" in df.columns:
        optional_missing = [column for column in OPTIONAL_COLUMNS if column not in df.columns]
        if optional_missing:
            raise InvalidSchemaError(
                "Missing optional columns: " + ", ".join(optional_missing)
            )

    numeric_ratings = pd.to_numeric(df["rating"], errors="coerce")
    invalid_rating_mask = (
        numeric_ratings.notna()
        & numeric_ratings.between(1, 5)
        & numeric_ratings.mod(1).eq(0)
    )
    if not invalid_rating_mask.all():
        invalid_rows = df.loc[~invalid_rating_mask].index.tolist()
        raise InvalidRatingError(
            "Invalid rating values detected. Ratings must be integers between 1 and 5. "
            f"Problematic rows: {invalid_rows}"
        )

    empty_review_mask = df["review_text"].astype(str).str.strip().eq("")
    if empty_review_mask.any():
        invalid_rows = df.loc[empty_review_mask].index.tolist()
        raise InvalidSchemaError(
            "Review text cannot be empty. Problematic rows: " + ", ".join(map(str, invalid_rows))
        )

    return df
