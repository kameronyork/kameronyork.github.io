# For JSON
#!/usr/bin/env python3

#%%
import json
import html
import re
from pathlib import Path

# Unicode space characters that often show up as "weird spaces"
ODD_SPACES_RE = re.compile(r"[\u00A0\u202F\u2007\u2060]")
MULTISPACE_RE = re.compile(r"[ \t\r\f\v]+")
HTML_TAG_RE = re.compile(r"<[^>]+>")


def normalize_text(
    text: str,
    strip_html_tags: bool = False,
    collapse_whitespace: bool = True,
    trim: bool = True,
) -> str:
    """
    Normalize HTML entities and odd Unicode spaces to regular spaces.
    Optionally strips HTML tags and collapses repeated whitespace.
    """
    if not isinstance(text, str):
        return text

    # Decode HTML entities like &nbsp; &#160; &#8239;
    text = html.unescape(text)

    # Optionally remove HTML tags
    if strip_html_tags:
        text = HTML_TAG_RE.sub(" ", text)

    # Replace non-breaking and similar spaces with normal space
    text = ODD_SPACES_RE.sub(" ", text)

    # Normalize line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Collapse repeated inline whitespace
    if collapse_whitespace:
        text = MULTISPACE_RE.sub(" ", text)
        # Also clean whitespace around newlines
        text = re.sub(r" *\n *", "\n", text)

    if trim:
        text = text.strip()

    return text


def normalize_json_value(value, strip_html_tags=False, collapse_whitespace=True, trim=True):
    """
    Recursively normalize all strings in a JSON-compatible Python object.
    """
    if isinstance(value, dict):
        return {
            normalize_text(k, strip_html_tags, collapse_whitespace, trim) if isinstance(k, str) else k:
            normalize_json_value(v, strip_html_tags, collapse_whitespace, trim)
            for k, v in value.items()
        }
    if isinstance(value, list):
        return [
            normalize_json_value(item, strip_html_tags, collapse_whitespace, trim)
            for item in value
        ]
    if isinstance(value, str):
        return normalize_text(value, strip_html_tags, collapse_whitespace, trim)
    return value


def main():
    input_path_str = input("Enter path to input JSON file: ").strip().strip('"').strip("'")
    input_path = Path(input_path_str)

    if not input_path.exists():
        raise FileNotFoundError(f"File not found: {input_path}")

    default_output = input_path.with_name(f"{input_path.stem}_normalized{input_path.suffix}")
    output_path_str = input(
        f"Enter path to output JSON file [{default_output}]: "
    ).strip().strip('"').strip("'")
    output_path = Path(output_path_str) if output_path_str else default_output

    strip_html_tags_answer = input("Strip HTML tags too? [y/N]: ").strip().lower()
    strip_html_tags = strip_html_tags_answer in {"y", "yes"}

    collapse_ws_answer = input("Collapse repeated spaces/tabs? [Y/n]: ").strip().lower()
    collapse_whitespace = collapse_ws_answer not in {"n", "no"}

    trim_answer = input("Trim leading/trailing whitespace? [Y/n]: ").strip().lower()
    trim = trim_answer not in {"n", "no"}

    with input_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    cleaned = normalize_json_value(
        data,
        strip_html_tags=strip_html_tags,
        collapse_whitespace=collapse_whitespace,
        trim=trim,
    )

    with output_path.open("w", encoding="utf-8") as f:
        json.dump(cleaned, f, ensure_ascii=False, indent=2)

    print(f"Normalized JSON written to: {output_path}")


if __name__ == "__main__":
    main()



    
# %%
#!/usr/bin/env python3

import csv
import html
import re
from pathlib import Path

ODD_SPACES_RE = re.compile(r"[\u00A0\u202F\u2007\u2060]")
MULTISPACE_RE = re.compile(r"[ \t\r\f\v]+")
HTML_TAG_RE = re.compile(r"<[^>]+>")


def normalize_text(
    text: str,
    strip_html_tags: bool = False,
    collapse_whitespace: bool = True,
    trim: bool = True,
) -> str:
    """
    Normalize HTML entities and odd Unicode spaces to regular spaces.
    """
    if text is None:
        return text

    text = html.unescape(text)

    if strip_html_tags:
        text = HTML_TAG_RE.sub(" ", text)

    text = ODD_SPACES_RE.sub(" ", text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    if collapse_whitespace:
        text = MULTISPACE_RE.sub(" ", text)
        text = re.sub(r" *\n *", "\n", text)

    if trim:
        text = text.strip()

    return text


def main():
    input_path_str = input("Enter path to input CSV file: ").strip().strip('"').strip("'")
    input_path = Path(input_path_str)

    if not input_path.exists():
        raise FileNotFoundError(f"File not found: {input_path}")

    default_output = input_path.with_name(f"{input_path.stem}_normalized{input_path.suffix}")
    output_path_str = input(
        f"Enter path to output CSV file [{default_output}]: "
    ).strip().strip('"').strip("'")
    output_path = Path(output_path_str) if output_path_str else default_output

    strip_html_tags_answer = input("Strip HTML tags too? [y/N]: ").strip().lower()
    strip_html_tags = strip_html_tags_answer in {"y", "yes"}

    collapse_ws_answer = input("Collapse repeated spaces/tabs? [Y/n]: ").strip().lower()
    collapse_whitespace = collapse_ws_answer not in {"n", "no"}

    trim_answer = input("Trim leading/trailing whitespace? [Y/n]: ").strip().lower()
    trim = trim_answer not in {"n", "no"}

    with input_path.open("r", encoding="utf-8-sig", newline="") as infile:
        reader = csv.reader(infile)
        rows = [
            [
                normalize_text(
                    cell,
                    strip_html_tags=strip_html_tags,
                    collapse_whitespace=collapse_whitespace,
                    trim=trim,
                )
                for cell in row
            ]
            for row in reader
        ]

    with output_path.open("w", encoding="utf-8", newline="") as outfile:
        writer = csv.writer(outfile)
        writer.writerows(rows)

    print(f"Normalized CSV written to: {output_path}")


if __name__ == "__main__":
    main()