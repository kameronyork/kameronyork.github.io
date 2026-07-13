# Lines that begin with ##### indicate "failsafe lines"
# Lines that begin with ## # ## indicate a "save point" where the data is offloaded to the local computer.
# Because this script is exploratory, the final CSV is saved locally in ./backups instead of ../../../datasets.

# %%
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

import pandas as pd
import requests

try:
    from tqdm.auto import tqdm
except Exception:  # pragma: no cover - fallback for environments without tqdm
    def tqdm(iterable=None, **kwargs):
        return iterable if iterable is not None else []


try:
    from wordcloud import STOPWORDS
except ImportError as exc:
    raise SystemExit(
        "The wordcloud package is required for automatic stop-word removal.\n"
        "Install it by running:\n\n"
        "pip install wordcloud\n"
    ) from exc


# -----------------------------------------------------------------------------
# Settings
# -----------------------------------------------------------------------------
TALKS_DATASET_URL = "https://kameronyork.com/datasets/general-conference-talks.json"
BACKUP_DIR = Path("./backups")
OUTPUT_CSV_PATH = BACKUP_DIR / "conference-bingo-word-counts.csv"

# Optional: load your manually maintained bingo word JSON so this exploratory
# script uses the same normalizationMap as the final bingo process.
#
# Update this path if your script lives somewhere else.
ALLOWED_WORDS_JSON_PATH = Path("../../../datasets/conference-bingo-allowed-words.json")

# Difficulty is guessed from the percent of conference sessions where the word
# appears at least once. Raw total_count is still used for the CSV sort order.
EASY_SESSION_PERCENT = 97.0
MEDIUM_SESSION_PERCENT = 65.0

# Set this if you want the exploratory file to be less noisy.
# 3 removes almost all two-letter filler words like "to", "of", "we", "he", etc.
MIN_WORD_LENGTH = 3

# Use the same kind of built-in stop-word list that word clouds commonly use.
EXCLUDED_WORDS: set[str] = set(STOPWORDS)

# Optional: words that are normally considered stop words, but you want to keep.
KEEP_WORDS: set[str] = {
    "may",
}

# Optional: extra words that are too generic for General Conference bingo,
# even if they are not part of the built-in wordcloud stop-word list.
ADDITIONAL_EXCLUDED_WORDS: set[str] = {
    "said",
    "say",
    "one",
    "will",
}

EXCLUDED_WORDS = (EXCLUDED_WORDS | ADDITIONAL_EXCLUDED_WORDS) - KEEP_WORDS

SESSION_KEY_COLUMNS = ["year", "month", "session"]


# -----------------------------------------------------------------------------
# Allowed word / normalization helpers
# -----------------------------------------------------------------------------
def load_normalization_map(path: Path) -> dict[str, str]:
    """
    Load normalizationMap from conference-bingo-allowed-words.json.

    If the file is not found, this script still runs. That is useful while doing
    broad exploratory word analysis before the final allowed word list exists.
    """
    if not path.exists():
        print(f"Normalization JSON not found at {path}. Continuing without normalizationMap.")
        return {}

    with path.open("r", encoding="utf-8") as file:
        config = json.load(file)

    normalization_map = config.get("normalizationMap", {})
    if not isinstance(normalization_map, dict):
        raise ValueError("normalizationMap must be a JSON object.")

    cleaned_map: dict[str, str] = {}
    for source_word, target_word in normalization_map.items():
        source = str(source_word or "").lower().strip()
        target = str(target_word or "").lower().strip()

        if source and target:
            cleaned_map[source] = target

    print(f"Loaded {len(cleaned_map):,} normalizationMap entries from {path}")
    return cleaned_map


NORMALIZATION_MAP = load_normalization_map(ALLOWED_WORDS_JSON_PATH)


def apply_normalization_map(word: str) -> str:
    """
    Apply normalizationMap safely.

    This supports chained mappings if they ever happen, such as:
    savior -> jesus
    jesus -> lord

    It also protects against accidental loops.
    """
    normalized = word
    seen: set[str] = set()

    while normalized in NORMALIZATION_MAP and normalized not in seen:
        seen.add(normalized)
        normalized = NORMALIZATION_MAP[normalized]

    return normalized


# -----------------------------------------------------------------------------
# Text helpers. These intentionally mirror the browser bingo tokenizer closely,
# except this exploratory file does not require an allowed-word list.
# -----------------------------------------------------------------------------
def singularize_word(word: str) -> str:
    if not word:
        return ""

    if word.endswith("ies") and len(word) > 4:
        return f"{word[:-3]}y"

    if re.search(r"(ches|shes|sses|xes|zes)$", word) and len(word) > 4:
        return word[:-2]

    if word.endswith("s") and len(word) > 4 and not word.endswith("ss") and not word.endswith("us"):
        return word[:-1]

    return word


def normalize_word(word: str) -> str:
    normalized = str(word or "").lower().strip()
    normalized = re.sub(r"^'+|'+$", "", normalized)
    normalized = re.sub(r"^[^a-z]+|[^a-z]+$", "", normalized)

    if normalized.endswith("'s"):
        normalized = normalized[:-2]

    # First do simple singularization.
    normalized = singularize_word(normalized)

    # Then apply your bingo JSON normalizationMap.
    # This combines similar concepts like humility -> humble,
    # savior/redeemer/messiah/christ -> jesus, etc.
    normalized = apply_normalization_map(normalized)

    if len(normalized) < MIN_WORD_LENGTH:
        return ""

    if normalized in EXCLUDED_WORDS:
        return ""

    return normalized


def tokenize_text(text: str) -> list[str]:
    cleaned = (
        str(text or "")
        .lower()
        .replace("\u2018", "'")
        .replace("\u2019", "'")
    )
    cleaned = re.sub(r"[^a-z'\s-]", " ", cleaned)
    cleaned = cleaned.replace("-", " ")

    tokens: list[str] = []
    for raw_token in re.split(r"\s+", cleaned):
        token = normalize_word(raw_token)
        if token:
            tokens.append(token)

    return tokens


# -----------------------------------------------------------------------------
# Data helpers
# -----------------------------------------------------------------------------
def load_talks_dataset(url: str) -> pd.DataFrame:
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    data = response.json()

    if not isinstance(data, list) or not data:
        raise ValueError("The talks dataset must be a non-empty JSON array.")

    df = pd.DataFrame(data)
    if "text" not in df.columns:
        raise ValueError("The talks dataset must include a text column.")

    df = df[df["text"].notna()].copy()
    df["text"] = df["text"].astype(str)
    return df


def build_session_key(row: pd.Series) -> str:
    parts: list[str] = []
    for column in SESSION_KEY_COLUMNS:
        value = row[column] if column in row.index else ""
        value = "" if pd.isna(value) else str(value).strip()
        parts.append(value or "Unknown")

    return "|".join(parts)


def assign_difficulty(session_appearance_rate: float) -> str:
    """
    Difficulty is based only on session appearance percentage.

    easy:   97% and above
    medium: 65% to less than 97%
    hard:   less than 65%
    """
    if session_appearance_rate >= EASY_SESSION_PERCENT:
        return "easy"

    if session_appearance_rate >= MEDIUM_SESSION_PERCENT:
        return "medium"

    return "hard"


# -----------------------------------------------------------------------------
# Main process
# -----------------------------------------------------------------------------
def main() -> None:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Loading talks from {TALKS_DATASET_URL}")
    talks_df = load_talks_dataset(TALKS_DATASET_URL)

    total_counts: Counter[str] = Counter()
    word_to_sessions: defaultdict[str, set[str]] = defaultdict(set)
    word_to_talks: defaultdict[str, set[str]] = defaultdict(set)
    session_keys: set[str] = set()

    for index, row in tqdm(talks_df.iterrows(), total=len(talks_df), desc="Counting words"):
        session_key = build_session_key(row)
        talk_id = str(row["id"]) if "id" in row.index and not pd.isna(row["id"]) else str(index)
        session_keys.add(session_key)

        tokens = tokenize_text(row["text"])
        if not tokens:
            continue

        total_counts.update(tokens)
        unique_words = set(tokens)

        for word in unique_words:
            word_to_sessions[word].add(session_key)
            word_to_talks[word].add(talk_id)

    total_sessions = len(session_keys)
    total_talks = len(talks_df)

    rows: list[dict[str, object]] = []

    for word, count in total_counts.items():
        sessions_with_word = len(word_to_sessions[word])
        talks_with_word = len(word_to_talks[word])

        session_appearance_rate = (
            sessions_with_word / total_sessions * 100
            if total_sessions
            else 0.0
        )

        talk_appearance_rate = (
            talks_with_word / total_talks * 100
            if total_talks
            else 0.0
        )

        rows.append({
            "word": word,
            "difficulty_guess": assign_difficulty(session_appearance_rate),
            "total_count": int(count),
            "session_appearance_rate": round(session_appearance_rate, 2),
            "sessions_with_word": int(sessions_with_word),
            "total_sessions": int(total_sessions),
            "talks_with_word": int(talks_with_word),
            "total_talks": int(total_talks),
            "talk_appearance_rate": round(talk_appearance_rate, 2),
        })

    output_df = pd.DataFrame(rows).sort_values(
        by=["total_count", "word"],
        ascending=[False, True],
        kind="mergesort",
    )

    ## # ##
    output_df.to_csv(OUTPUT_CSV_PATH, encoding="utf-8", index=False)
    print(f"Saved {len(output_df):,} rows to {OUTPUT_CSV_PATH}")


##### # %%
if __name__ == "__main__":
    main()

# %%