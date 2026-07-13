# Lines that begin with ##### indicate "failsafe lines"
# Lines that begin with ## # ## indicate a "save point" where the data is offloaded to the local computer.
# This script reads conference-bingo-allowed-words.json and creates the precomputed
# conference-bingo-allowed-words-with-difficulty.json used by the RMD page.

# %%
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
import requests

try:
    from tqdm.auto import tqdm
except Exception:  # pragma: no cover - fallback for environments without tqdm
    def tqdm(iterable=None, **kwargs):
        return iterable if iterable is not None else []


# -----------------------------------------------------------------------------
# Settings
# -----------------------------------------------------------------------------
TALKS_DATASET_URL = "https://kameronyork.com/datasets/general-conference-talks.json"
ALLOWED_WORDS_DATASET_URL = "https://kameronyork.com/datasets/conference-bingo-allowed-words.json"

# This mirrors the ../../../datasets/ path style from your existing scripts.
LOCAL_ALLOWED_WORDS_PATH = Path("../../../datasets/conference-bingo-allowed-words.json")
OUTPUT_JSON_PATH = Path("../../../datasets/conference-bingo-allowed-words-with-difficulty.json")

# A backup copy is also saved next to this script for easy inspection.
BACKUP_DIR = Path("./backups")
BACKUP_JSON_PATH = BACKUP_DIR / "conference-bingo-allowed-words-with-difficulty.json"

# Difficulty is based on the percent of conference sessions where the word appears
# at least once. These are intentionally easy to tune over time.
EASY_SESSION_PERCENT = 95.0
MEDIUM_SESSION_PERCENT = 66.0
HARD_SESSION_PERCENT = 33.0

SESSION_KEY_COLUMNS = ["year", "month", "session"]


# -----------------------------------------------------------------------------
# Text helpers. These mirror the original RMD tokenizer/normalizer so your allowed
# words behave the same after difficulty is moved out of the browser.
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


def normalize_key(value: Any) -> str:
    return str(value or "").strip().lower()


def normalize_single_word(word: str, allowed_words: set[str], normalization_map: dict[str, str]) -> str:
    normalized = normalize_key(word)
    normalized = re.sub(r"^'+|'+$", "", normalized)
    normalized = re.sub(r"^[^a-z]+|[^a-z]+$", "", normalized)

    if not normalized:
        return ""

    if normalized.endswith("'s"):
        normalized = normalized[:-2]

    mapped = normalization_map.get(normalized)
    if mapped:
        return mapped if mapped in allowed_words else ""

    if normalized in allowed_words:
        return normalized

    singular = singularize_word(normalized)
    if not singular:
        return ""

    mapped = normalization_map.get(singular)
    if mapped:
        return mapped if mapped in allowed_words else ""

    if singular in allowed_words:
        return singular

    return ""


def tokenize_to_allowed_words(text: str, allowed_words: set[str], normalization_map: dict[str, str]) -> list[str]:
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
        token = normalize_single_word(raw_token, allowed_words, normalization_map)
        if token:
            tokens.append(token)

    return tokens


def clean_phrase_text(text: str) -> str:
    cleaned = (
        str(text or "")
        .lower()
        .replace("\u2018", "'")
        .replace("\u2019", "'")
    )
    cleaned = re.sub(r"[^a-z'\s-]", " ", cleaned)
    cleaned = cleaned.replace("-", " ")
    return re.sub(r"\s+", " ", cleaned).strip()


def count_phrase_occurrences(cleaned_text: str, phrase: str) -> int:
    cleaned_phrase = clean_phrase_text(phrase)
    if not cleaned_phrase:
        return 0

    pattern = re.compile(rf"(?<![a-z]){re.escape(cleaned_phrase)}(?![a-z])")
    return len(pattern.findall(cleaned_text))


# -----------------------------------------------------------------------------
# Data helpers
# -----------------------------------------------------------------------------
def load_json_from_path_or_url(local_path: Path, url: str) -> Any:
    if local_path.exists():
        with local_path.open("r", encoding="utf-8") as file:
            return json.load(file)

    response = requests.get(url, timeout=60)
    response.raise_for_status()
    return response.json()


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


def parse_allowed_words_config(config: Any) -> tuple[list[str], dict[str, str]]:
    if not isinstance(config, dict):
        raise ValueError("Allowed words config must be a JSON object.")

    raw_words = config.get("allowedWords", [])
    if not isinstance(raw_words, list):
        raise ValueError("allowedWords must be a list.")

    words: list[str] = []
    seen: set[str] = set()
    for item in raw_words:
        if isinstance(item, dict):
            word = normalize_key(item.get("word"))
        else:
            word = normalize_key(item)

        if word and word not in seen:
            words.append(word)
            seen.add(word)

    raw_map = config.get("normalizationMap", {})
    if not isinstance(raw_map, dict):
        raw_map = {}

    normalization_map: dict[str, str] = {}
    for key, value in raw_map.items():
        normalized_key = normalize_key(key)
        normalized_value = normalize_key(value)
        if normalized_key and normalized_value:
            normalization_map[normalized_key] = normalized_value

    if not words:
        raise ValueError("The allowedWords list is empty.")

    return words, normalization_map


def build_session_key(row: pd.Series) -> str:
    parts: list[str] = []
    for column in SESSION_KEY_COLUMNS:
        value = row[column] if column in row.index else ""
        value = "" if pd.isna(value) else str(value).strip()
        parts.append(value or "Unknown")

    return "|".join(parts)


def assign_difficulty(session_appearance_rate: float) -> str:
    if session_appearance_rate >= EASY_SESSION_PERCENT:
        return "easy"
    if session_appearance_rate >= MEDIUM_SESSION_PERCENT:
        return "medium"
    if session_appearance_rate >= HARD_SESSION_PERCENT:
        return "hard"
    return "rare"


def difficulty_sort_value(difficulty: str) -> int:
    order = {"easy": 0, "medium": 1, "hard": 2, "rare": 3}
    return order.get(difficulty, 99)


# -----------------------------------------------------------------------------
# Main process
# -----------------------------------------------------------------------------
def main() -> None:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)

    print(f"Loading talks from {TALKS_DATASET_URL}")
    talks_df = load_talks_dataset(TALKS_DATASET_URL)

    allowed_source = LOCAL_ALLOWED_WORDS_PATH if LOCAL_ALLOWED_WORDS_PATH.exists() else ALLOWED_WORDS_DATASET_URL
    print(f"Loading allowed words from {allowed_source}")
    allowed_config = load_json_from_path_or_url(LOCAL_ALLOWED_WORDS_PATH, ALLOWED_WORDS_DATASET_URL)
    allowed_words, normalization_map = parse_allowed_words_config(allowed_config)
    allowed_word_set = set(allowed_words)
    phrase_words = [word for word in allowed_words if re.search(r"\s", word)]

    total_counts: Counter[str] = Counter()
    word_to_sessions: defaultdict[str, set[str]] = defaultdict(set)
    word_to_talks: defaultdict[str, set[str]] = defaultdict(set)
    session_keys: set[str] = set()

    for index, row in tqdm(talks_df.iterrows(), total=len(talks_df), desc="Scoring allowed words"):
        session_key = build_session_key(row)
        talk_id = str(row["id"]) if "id" in row.index and not pd.isna(row["id"]) else str(index)
        session_keys.add(session_key)

        text = row["text"]
        tokens = tokenize_to_allowed_words(text, allowed_word_set, normalization_map)
        counts = Counter(tokens)

        if phrase_words:
            cleaned_text = clean_phrase_text(text)
            for phrase in phrase_words:
                phrase_count = count_phrase_occurrences(cleaned_text, phrase)
                if phrase_count:
                    counts[phrase] += phrase_count

        if not counts:
            continue

        total_counts.update(counts)
        for word in counts.keys():
            word_to_sessions[word].add(session_key)
            word_to_talks[word].add(talk_id)

    total_sessions = len(session_keys)
    total_talks = len(talks_df)

    allowed_word_entries: list[dict[str, Any]] = []
    for word in allowed_words:
        sessions_with_word = len(word_to_sessions[word])
        talks_with_word = len(word_to_talks[word])
        session_appearance_rate = (sessions_with_word / total_sessions * 100) if total_sessions else 0.0
        talk_appearance_rate = (talks_with_word / total_talks * 100) if total_talks else 0.0
        difficulty = assign_difficulty(session_appearance_rate)

        allowed_word_entries.append({
            "word": word,
            "difficulty": difficulty,
            "sessionAppearanceRate": round(session_appearance_rate, 2),
            "sessionsWithWord": int(sessions_with_word),
            "totalSessions": int(total_sessions),
            "totalCount": int(total_counts.get(word, 0)),
            "talksWithWord": int(talks_with_word),
            "totalTalks": int(total_talks),
            "talkAppearanceRate": round(talk_appearance_rate, 2),
        })

    allowed_word_entries.sort(
        key=lambda entry: (
            difficulty_sort_value(entry["difficulty"]),
            -float(entry["sessionAppearanceRate"]),
            -int(entry["totalCount"]),
            str(entry["word"]),
        )
    )

    output = {
        "metadata": {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "sourceDatasetUrl": TALKS_DATASET_URL,
            "allowedWordsSource": str(allowed_source),
            "difficultyMetric": "sessionAppearanceRate",
            "difficultyMetricDescription": "Percent of General Conference sessions where the word appears at least once.",
            "thresholds": {
                "easySessionPercent": EASY_SESSION_PERCENT,
                "mediumSessionPercent": MEDIUM_SESSION_PERCENT,
                "hardSessionPercent": HARD_SESSION_PERCENT,
            },
            "difficultyRules": [
                f"easy: sessionAppearanceRate >= {EASY_SESSION_PERCENT}",
                f"medium: {MEDIUM_SESSION_PERCENT} <= sessionAppearanceRate < {EASY_SESSION_PERCENT}",
                f"hard: {HARD_SESSION_PERCENT} <= sessionAppearanceRate < {MEDIUM_SESSION_PERCENT}",
                f"rare: sessionAppearanceRate < {HARD_SESSION_PERCENT}; included only when the RMD uses random mode",
            ],
            "totalAllowedWords": len(allowed_word_entries),
            "totalSessions": total_sessions,
            "totalTalks": total_talks,
            "sessionKeyColumns": SESSION_KEY_COLUMNS,
        },
        "allowedWords": allowed_word_entries,
        "normalizationMap": normalization_map,
    }

    ## # ##
    with OUTPUT_JSON_PATH.open("w", encoding="utf-8") as file:
        json.dump(output, file, ensure_ascii=False, indent=2)

    with BACKUP_JSON_PATH.open("w", encoding="utf-8") as file:
        json.dump(output, file, ensure_ascii=False, indent=2)

    print(f"Saved {len(allowed_word_entries):,} allowed words to {OUTPUT_JSON_PATH}")
    print(f"Saved backup copy to {BACKUP_JSON_PATH}")


##### # %%
if __name__ == "__main__":
    main()
