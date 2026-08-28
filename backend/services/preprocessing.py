from __future__ import annotations

import re

import pandas as pd


class PreprocessingError(Exception):
    """Raised when preprocessing cannot safely clean the dataset."""


def clean_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """Clean the uploaded review dataset using the documented preprocessing rules.

    Only the following transformations are performed:
    - remove duplicate rows
    - remove rows with missing values
    - normalize rating values to the accepted 1-5 range
    - standardize review dates to ISO format
    - clean review text by trimming whitespace and removing meaningless punctuation

    Args:
        df: Raw customer feedback DataFrame.

    Returns:
        A cleaned pandas DataFrame.

    Raises:
        PreprocessingError: If the input is not a pandas DataFrame or is empty.
    """

    if not isinstance(df, pd.DataFrame):
        raise PreprocessingError("Input must be a pandas DataFrame.")

    if df.empty:
        raise PreprocessingError("Cannot preprocess an empty DataFrame.")

    cleaned_df = df.copy()

    cleaned_df = cleaned_df.drop_duplicates().dropna()

    if cleaned_df.empty:
        raise PreprocessingError("No usable rows remain after removing duplicates and missing values.")

    if "rating" in cleaned_df.columns:
        cleaned_df["rating"] = pd.to_numeric(cleaned_df["rating"], errors="coerce")
        cleaned_df["rating"] = cleaned_df["rating"].round().astype("Int64")
        cleaned_df["rating"] = cleaned_df["rating"].clip(lower=1, upper=5)

    if "review_date" in cleaned_df.columns:
        cleaned_df["review_date"] = pd.to_datetime(
            cleaned_df["review_date"], errors="coerce"
        )
        cleaned_df = cleaned_df.dropna(subset=["review_date"])
        cleaned_df["review_date"] = cleaned_df["review_date"].dt.strftime("%Y-%m-%d")

    if "review_text" in cleaned_df.columns:
        cleaned_df["review_text"] = cleaned_df["review_text"].astype(str).apply(
            lambda value: re.sub(r"\s+", " ", value.strip())
        )
        cleaned_df["review_text"] = cleaned_df["review_text"].apply(
            lambda value: re.sub(r"[!?,.;:]+(?=\s|$)", "", value)
        )
        cleaned_df["review_text"] = cleaned_df["review_text"].replace(r"^\s*$", "", regex=True)
        cleaned_df = cleaned_df[cleaned_df["review_text"].astype(str).str.strip() != ""]

    return cleaned_df
