import calendar
import json
import os
import re
import subprocess
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

import pandas as pd
import requests
from bs4 import BeautifulSoup

# Optional manual release-date overrides. Format: "BOX_OFFICE_MOJO_RELEASE_ID": "YYYY-MM-DD".
# The script also reads datasets/movies-details.json, so this is only needed for one-off fixes.
MOVIE_RELEASE_DATES = {
    "rl2127396865": "2025-09-19"
}

INPUT_FILE = os.environ.get("MOVIES_JSON_PATH", "datasets/movies.json")
MOVIE_DETAILS_FILE = os.environ.get("MOVIES_DETAILS_JSON_PATH", "datasets/movies-details.json")
OUTPUT_FILE = os.environ.get("BOX_OFFICE_DATA_JSON_PATH", "datasets/box-office-data.json")

PULL_THROUGH_GRACE_MONTHS = int(os.environ.get("BOX_OFFICE_PULL_THROUGH_GRACE_MONTHS", "6"))
REQUEST_TIMEOUT_SECONDS = int(os.environ.get("BOX_OFFICE_REQUEST_TIMEOUT_SECONDS", "30"))
SKIP_GIT = os.environ.get("BOX_OFFICE_SKIP_GIT", "").strip().lower() in {"1", "true", "yes"}
FORCE_REFRESH_ALL = os.environ.get("BOX_OFFICE_FORCE_REFRESH_ALL", "").strip().lower() in {"1", "true", "yes"}
FORCE_REFRESH_IDS = {
    item.strip()
    for item in os.environ.get("BOX_OFFICE_FORCE_REFRESH_IDS", "").split(",")
    if item.strip()
}
GIT_REMOTE_URL = os.environ.get(
    "GIT_REMOTE_URL",
    "https://github.com/kameronyork/kameronyork.github.io.git",
)

PCT_YD_COLUMN = "%\u00b1 YD"
PCT_LW_COLUMN = "%\u00b1 LW"
OUTPUT_COLUMNS = [
    "Date",
    "DOW",
    "Rank",
    "Daily",
    PCT_YD_COLUMN,
    PCT_LW_COLUMN,
    "Theaters",
    "Avg",
    "To Date",
    "Day",
    "Estimated",
    "IMDB_ID",
    "Title",
]

MONTH_LOOKUP = {month: index for index, month in enumerate(calendar.month_abbr) if month}
INVALID_IMDB_IDS = {"not created", "n/a", "na", "none", "null", "tbd", "unknown"}


def parse_date(value: object) -> Optional[datetime.date]:
    if not value or not isinstance(value, str):
        return None
    try:
        return datetime.strptime(value.strip(), "%Y-%m-%d").date()
    except ValueError:
        return None


def get_today() -> datetime.date:
    override = os.environ.get("BOX_OFFICE_TODAY")
    parsed_override = parse_date(override)
    if parsed_override:
        return parsed_override
    return datetime.today().date()


def add_months(original_date: datetime.date, months: int) -> datetime.date:
    month_index = original_date.month - 1 + months
    year = original_date.year + month_index // 12
    month = month_index % 12 + 1
    last_day = calendar.monthrange(year, month)[1]
    return original_date.replace(year=year, month=month, day=min(original_date.day, last_day))


def load_json(path: str, default: object) -> object:
    if not os.path.exists(path):
        return default
    with open(path, "r", encoding="utf-8") as file_obj:
        return json.load(file_obj)


def load_movie_release_dates(details_file: str) -> Dict[str, datetime.date]:
    release_dates: Dict[str, datetime.date] = {}

    details = load_json(details_file, [])
    if isinstance(details, list):
        for movie in details:
            if not isinstance(movie, dict):
                continue
            imdb_id = movie.get("id")
            release_date = parse_date(movie.get("release_date"))
            if is_valid_imdb_id(imdb_id) and release_date:
                release_dates[str(imdb_id).strip()] = release_date

    for imdb_id, release_date_text in MOVIE_RELEASE_DATES.items():
        release_date = parse_date(release_date_text)
        if is_valid_imdb_id(imdb_id) and release_date:
            release_dates[str(imdb_id).strip()] = release_date

    return release_dates


def is_valid_imdb_id(imdb_id: object) -> bool:
    if not isinstance(imdb_id, str):
        return False
    cleaned = imdb_id.strip()
    return bool(cleaned) and cleaned.lower() not in INVALID_IMDB_IDS


def build_movie_catalog(people_movies: object, release_dates: Dict[str, datetime.date]) -> Dict[str, dict]:
    catalog: Dict[str, dict] = {}
    if not isinstance(people_movies, list):
        return catalog

    for person in people_movies:
        if not isinstance(person, dict):
            continue

        parent_pull_through = parse_date(person.get("pull_through"))
        movies = person.get("movies", [])
        if not isinstance(movies, list):
            continue

        for movie in movies:
            if not isinstance(movie, dict):
                continue

            imdb_id = movie.get("imdb_id")
            title = movie.get("title")
            if not is_valid_imdb_id(imdb_id) or not title:
                continue

            imdb_id = str(imdb_id).strip()
            entry = catalog.setdefault(
                imdb_id,
                {
                    "imdb_id": imdb_id,
                    "title": str(title).strip(),
                    "pull_through_dates": [],
                    "release_date": release_dates.get(imdb_id),
                },
            )

            # Use the latest title seen in movies.json only if the current title is blank.
            if not entry.get("title"):
                entry["title"] = str(title).strip()

            if parent_pull_through:
                entry["pull_through_dates"].append(parent_pull_through)

            # Backward-compatible support in case a future movies.json puts pull_through on a movie row.
            movie_pull_through = parse_date(movie.get("pull_through"))
            if movie_pull_through:
                entry["pull_through_dates"].append(movie_pull_through)

    for entry in catalog.values():
        pull_through_dates = entry.get("pull_through_dates", [])
        entry["max_pull_through"] = max(pull_through_dates) if pull_through_dates else None

    return catalog


def index_existing_records(existing_records: List[dict]) -> Dict[str, List[dict]]:
    records_by_movie: Dict[str, List[dict]] = defaultdict(list)
    for record in existing_records:
        if not isinstance(record, dict):
            continue
        imdb_id = record.get("IMDB_ID")
        if is_valid_imdb_id(imdb_id):
            records_by_movie[str(imdb_id).strip()].append(record)
    return records_by_movie


def should_fetch_movie(movie_meta: dict, existing_rows: List[dict], today: datetime.date) -> Tuple[bool, str]:
    imdb_id = movie_meta["imdb_id"]
    release_date = movie_meta.get("release_date")
    max_pull_through = movie_meta.get("max_pull_through")

    if FORCE_REFRESH_ALL or imdb_id in FORCE_REFRESH_IDS:
        if release_date and release_date > today:
            return False, f"not released yet ({release_date})"
        return True, "force refresh requested"

    if release_date and release_date > today:
        return False, f"not released yet ({release_date})"

    if not existing_rows:
        return True, "no cached rows yet"

    if max_pull_through:
        freeze_after = add_months(max_pull_through, PULL_THROUGH_GRACE_MONTHS)
        if today > freeze_after:
            return False, f"cached and frozen after {freeze_after}"
        return True, f"within active window ending {freeze_after}"

    if release_date:
        freeze_after = add_months(release_date, PULL_THROUGH_GRACE_MONTHS)
        if today > freeze_after:
            return False, f"cached and frozen after release window {freeze_after}"

    return True, "no pull_through cutoff available"


def build_http_session() -> requests.Session:
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": os.environ.get(
                "BOX_OFFICE_USER_AGENT",
                "Mozilla/5.0 (compatible; box-office-data-updater/1.0)",
            )
        }
    )
    return session


def fetch_url(session: requests.Session, url: str, allow_redirects: bool = True) -> Optional[requests.Response]:
    try:
        response = session.get(url, allow_redirects=allow_redirects, timeout=REQUEST_TIMEOUT_SECONDS)
        if response.status_code != 200:
            print(f"Failed to fetch {url}: HTTP {response.status_code}")
            return None
        return response
    except requests.RequestException as exc:
        print(f"Failed to fetch {url}: {exc}")
        return None


def fetch_data(
    session: requests.Session,
    imdb_id: str,
    title: str,
    release_date: Optional[datetime.date],
) -> List[dict]:
    base_url = f"https://www.boxofficemojo.com/release/{imdb_id}/"
    response = fetch_url(session, base_url, allow_redirects=True)
    if response is None:
        return []

    final_url = response.url
    soup = BeautifulSoup(response.text, "html.parser")

    if "/weekend/" in final_url:
        print(f"Daily data not available for {title}; using weekend data")
        return fetch_weekend_data(session, imdb_id, title, release_date)

    print(f"Using daily data for {title}")
    return fetch_daily_data(soup, imdb_id, title)


def fetch_daily_data(soup: BeautifulSoup, imdb_id: str, title: str) -> List[dict]:
    table = soup.find("table")
    if not table:
        print(f"No daily table found for {title}")
        return []

    rows = table.find_all("tr")
    if len(rows) <= 1:
        print(f"Daily table found but no data for {title}")
        return []

    headers = [th.get_text(strip=True) for th in rows[0].find_all("th")]
    data: List[dict] = []

    for row in rows[1:]:
        cells = row.find_all("td")
        if not cells:
            continue

        values = [td.get_text(strip=True) for td in cells]
        if len(values) != len(headers):
            continue

        link = cells[0].find("a", href=True)
        if not link or "date" not in link["href"]:
            continue

        date_parts = [part for part in link["href"].split("/") if part]
        if len(date_parts) < 2:
            continue

        parsed_date = parse_date(date_parts[1])
        if not parsed_date:
            print(f"Error parsing date for {title}")
            continue

        record = dict(zip(headers, values))
        record["Date"] = parsed_date.strftime("%Y-%m-%d")
        record["IMDB_ID"] = imdb_id
        record["Title"] = title
        data.append(normalize_record(record))

    return data


def parse_month_day(text: str, default_month: Optional[int] = None) -> Optional[Tuple[int, int]]:
    cleaned = text.strip().replace(".", "")
    month_day_match = re.match(r"^([A-Za-z]{3,9})\s+(\d{1,2})$", cleaned)
    if month_day_match:
        month_name = month_day_match.group(1)[:3].title()
        month = MONTH_LOOKUP.get(month_name)
        day = int(month_day_match.group(2))
        if month:
            return month, day

    day_only_match = re.match(r"^(\d{1,2})$", cleaned)
    if day_only_match and default_month:
        return default_month, int(day_only_match.group(1))

    return None


def parse_weekend_date_range(
    date_range: str,
    release_date: Optional[datetime.date],
) -> Optional[Tuple[datetime.date, datetime.date]]:
    if not release_date:
        release_date = get_today().replace(month=1, day=1)

    normalized = (
        date_range.replace("\xa0", " ")
        .replace("\u2013", "-")
        .replace("\u2014", "-")
        .strip()
    )
    parts = [part.strip() for part in normalized.split("-") if part.strip()]
    if len(parts) != 2:
        return None

    start_month_day = parse_month_day(parts[0])
    if not start_month_day:
        return None

    start_month, start_day = start_month_day
    end_month_day = parse_month_day(parts[1], default_month=start_month)
    if not end_month_day:
        return None

    end_month, end_day = end_month_day

    start_year = release_date.year
    if start_month < release_date.month:
        start_year += 1

    end_year = start_year
    if end_month < start_month:
        end_year += 1

    try:
        start_date = datetime(start_year, start_month, start_day).date()
        end_date = datetime(end_year, end_month, end_day).date()
    except ValueError:
        return None

    if end_date < start_date:
        return None

    return start_date, end_date


def parse_money(value: str) -> Optional[float]:
    try:
        return float(value.replace("$", "").replace(",", "").strip())
    except (AttributeError, ValueError):
        return None


def find_weekend_gross_column(headers: List[str]) -> int:
    for index, header in enumerate(headers):
        normalized = header.lower().replace(" ", "")
        if "gross" in normalized and "todate" not in normalized:
            return index
    return 2


def fetch_weekend_data(
    session: requests.Session,
    imdb_id: str,
    title: str,
    release_date: Optional[datetime.date],
) -> List[dict]:
    url = f"https://www.boxofficemojo.com/release/{imdb_id}/weekend/"
    response = fetch_url(session, url, allow_redirects=True)
    if response is None:
        return []

    soup = BeautifulSoup(response.text, "html.parser")
    table = soup.find("table")
    if not table:
        print(f"No weekend table found for {title}")
        return []

    rows = table.find_all("tr")
    if len(rows) <= 1:
        print(f"Weekend table found but no data for {title}")
        return []

    headers = [th.get_text(strip=True) for th in rows[0].find_all("th")]
    gross_index = find_weekend_gross_column(headers)
    weekend_data: List[dict] = []
    cumulative_total = 0.0
    day_number = 1

    for row in rows[1:]:
        cells = row.find_all("td")
        if len(cells) <= gross_index:
            continue

        date_range = cells[0].get_text(strip=True)
        weekend_gross_text = cells[gross_index].get_text(strip=True)
        parsed_range = parse_weekend_date_range(date_range, release_date)
        weekend_gross = parse_money(weekend_gross_text)
        if not parsed_range or weekend_gross is None:
            continue

        start_date, end_date = parsed_range
        num_days = (end_date - start_date).days + 1
        if num_days <= 0:
            continue

        daily_gross = round(weekend_gross / num_days, 2)

        for offset in range(num_days):
            day = start_date + timedelta(days=offset)
            cumulative_total += daily_gross
            weekend_data.append(
                normalize_record(
                    {
                        "Date": day.strftime("%Y-%m-%d"),
                        "DOW": day.strftime("%A"),
                        "Rank": "-",
                        "Daily": f"${daily_gross:,.2f}",
                        PCT_YD_COLUMN: "-",
                        PCT_LW_COLUMN: "-",
                        "Theaters": "-",
                        "Avg": "-",
                        "To Date": f"${cumulative_total:,.2f}",
                        "Day": str(day_number),
                        "Estimated": "false",
                        "IMDB_ID": imdb_id,
                        "Title": title,
                    }
                )
            )
            day_number += 1

    return weekend_data


def normalize_record(record: dict) -> dict:
    return {column: record.get(column, "") for column in OUTPUT_COLUMNS}


def record_key(record: dict) -> Optional[Tuple[str, str]]:
    imdb_id = record.get("IMDB_ID")
    date_value = record.get("Date")
    if not is_valid_imdb_id(imdb_id) or not date_value:
        return None
    return str(imdb_id).strip(), str(date_value).strip()


def merge_records(existing_records: List[dict], fetched_records: List[dict]) -> Tuple[List[dict], int, int]:
    merged_records = [normalize_record(record) for record in existing_records if isinstance(record, dict)]
    key_to_index: Dict[Tuple[str, str], int] = {}

    for index, record in enumerate(merged_records):
        key = record_key(record)
        if key and key not in key_to_index:
            key_to_index[key] = index

    added_count = 0
    updated_count = 0

    for fetched_record in fetched_records:
        normalized_record = normalize_record(fetched_record)
        key = record_key(normalized_record)
        if not key:
            continue

        if key in key_to_index:
            existing_index = key_to_index[key]
            if merged_records[existing_index] != normalized_record:
                merged_records[existing_index] = normalized_record
                updated_count += 1
        else:
            key_to_index[key] = len(merged_records)
            merged_records.append(normalized_record)
            added_count += 1

    return merged_records, added_count, updated_count


def write_records_json(path: str, records: List[dict]) -> None:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    data_frame = pd.DataFrame(records)

    # Keep the exact column names and ordering expected by downstream reports.
    if data_frame.empty:
        data_frame = pd.DataFrame(columns=OUTPUT_COLUMNS)
    else:
        for column in OUTPUT_COLUMNS:
            if column not in data_frame.columns:
                data_frame[column] = ""
        data_frame = data_frame[OUTPUT_COLUMNS]

    temp_path = f"{path}.tmp"
    data_frame.to_json(temp_path, orient="records", indent=4)
    os.replace(temp_path, path)


def git_has_changes(path: str) -> bool:
    result = subprocess.run(
        ["git", "status", "--porcelain", "--", path],
        check=True,
        capture_output=True,
        text=True,
    )
    return bool(result.stdout.strip())


def commit_and_push(output_file: str) -> None:
    if SKIP_GIT:
        print("Skipping git commit and push because BOX_OFFICE_SKIP_GIT is set.")
        return

    if not os.path.isdir(".git"):
        print("Skipping git commit and push because this is not a git checkout.")
        return

    try:
        subprocess.run(
            ["git", "config", "--local", "user.email", "github-actions[bot]@users.noreply.github.com"],
            check=True,
        )
        subprocess.run(["git", "config", "--local", "user.name", "github-actions[bot]"], check=True)
        if GIT_REMOTE_URL:
            subprocess.run(["git", "remote", "set-url", "origin", GIT_REMOTE_URL], check=True)

        subprocess.run(["git", "pull", "--rebase", "--autostash"], check=True)
        subprocess.run(["git", "add", output_file], check=True)

        if not git_has_changes(output_file):
            print("No git changes to commit.")
            return

        subprocess.run(["git", "commit", "-m", "Update box office data [skip ci]"], check=True)
        subprocess.run(["git", "push"], check=True)
        print("Changes committed and pushed successfully.")
    except subprocess.CalledProcessError as exc:
        print(f"Git error: {exc}")
        subprocess.run(["git", "rebase", "--abort"], check=False)


def main() -> None:
    today = get_today()
    people_movies = load_json(INPUT_FILE, [])
    existing_records = load_json(OUTPUT_FILE, [])

    if not isinstance(existing_records, list):
        raise ValueError(f"{OUTPUT_FILE} must contain a JSON array of records.")

    release_dates = load_movie_release_dates(MOVIE_DETAILS_FILE)
    movie_catalog = build_movie_catalog(people_movies, release_dates)
    existing_by_movie = index_existing_records(existing_records)

    movies_to_fetch: List[dict] = []
    skipped_count = 0

    for imdb_id, movie_meta in sorted(movie_catalog.items(), key=lambda item: item[1].get("title", "")):
        existing_rows = existing_by_movie.get(imdb_id, [])
        should_fetch, reason = should_fetch_movie(movie_meta, existing_rows, today)
        if should_fetch:
            movies_to_fetch.append(movie_meta)
            print(f"Queued {movie_meta['title']} ({imdb_id}): {reason}")
        else:
            skipped_count += 1
            print(f"Skipping {movie_meta['title']} ({imdb_id}): {reason}")

    print(
        f"Movie selection complete: {len(movies_to_fetch)} queued, "
        f"{skipped_count} skipped, {len(existing_records)} cached rows preserved."
    )

    session = build_http_session()
    fetched_records: List[dict] = []
    movies_with_no_new_data = 0

    for movie_meta in movies_to_fetch:
        imdb_id = movie_meta["imdb_id"]
        title = movie_meta["title"]
        print(f"Fetching data for {title} ({imdb_id})")
        movie_data = fetch_data(session, imdb_id, title, movie_meta.get("release_date"))
        if movie_data:
            fetched_records.extend(movie_data)
            print(f"Fetched {len(movie_data)} rows for {title} ({imdb_id})")
        else:
            movies_with_no_new_data += 1
            print(f"No rows fetched for {title} ({imdb_id}); cached rows were left untouched.")

    if not fetched_records:
        print("No fetched rows. Existing box-office-data.json was left unchanged.")
        return

    merged_records, added_count, updated_count = merge_records(existing_records, fetched_records)
    normalized_existing = [normalize_record(record) for record in existing_records if isinstance(record, dict)]

    print(
        f"Merge complete: {added_count} rows added, {updated_count} rows updated, "
        f"{len(merged_records)} total rows. Movies with no fetched rows: {movies_with_no_new_data}."
    )

    if merged_records == normalized_existing:
        print("Fetched rows did not change box-office-data.json. No file write needed.")
        return

    write_records_json(OUTPUT_FILE, merged_records)
    print(f"Data saved to {OUTPUT_FILE}")
    commit_and_push(OUTPUT_FILE)


if __name__ == "__main__":
    main()
