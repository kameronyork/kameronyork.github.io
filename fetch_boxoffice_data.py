import os
import json
import requests
import subprocess
from bs4 import BeautifulSoup
import pandas as pd
from datetime import datetime, timedelta

# Load the input JSON file
input_file = 'datasets/movies.json'
output_file = 'datasets/box-office-data.json'

with open(input_file, 'r') as f:
    people_movies = json.load(f)

# Initialize list to store all data
all_data = []

# Function to handle weekend tables and convert to daily data
def parse_weekend_to_daily(table, imdb_id, title):
    rows = table.find_all('tr')
    headers = [th.get_text(strip=True) for th in rows[0].find_all('th')]

    # Initialize variables for tracking cumulative sums and other info
    parsed_rows = []
    cumulative_sum = 0
    day_count = 1

    for row in rows[1:]:  # Skip header
        cells = row.find_all('td')
        if len(cells) < 3:
            continue

        date_range = cells[0].get_text(strip=True)
        weekend_gross = cells[2].get_text(strip=True)  # 3rd column is "Weekend"

        try:
            # Clean and parse date range (e.g., "May 2–4")
            date_range = date_range.replace('\xa0', ' ').replace('–', '-').replace('—', '-')
            parts = date_range.split('-')
            if len(parts) != 2:
                continue

            start_str, end_str = parts[0].strip(), parts[1].strip()
            current_year = datetime.today().year

            # Parse start date
            start_date = datetime.strptime(f"{start_str} {current_year}", "%b %d %Y")

            # If end_str is just a day number, use same month as start
            try:
                end_date = datetime.strptime(f"{end_str} {current_year}", "%b %d %Y")
            except ValueError:
                end_day = int(end_str)
                end_date = datetime(year=current_year, month=start_date.month, day=end_day)

            num_days = (end_date - start_date).days + 1
            gross_val = float(weekend_gross.replace('$', '').replace(',', ''))
            daily_gross = round(gross_val / num_days, 2)

            # Create data for each day in the weekend range
            for i in range(num_days):
                day = start_date + timedelta(days=i)
                cumulative_sum += daily_gross

                # Prepare the row data
                parsed_rows.append({
                    "Date": day.strftime("%Y-%m-%d"),
                    "DOW": day.strftime("%Y-%m-%d"),
                    "Rank": "N/A",  # Rank can be filled if available
                    "Daily": f"${daily_gross:,.2f}",
                    "% ± YD": "-",  # You can calculate percentage change if you have the data
                    "% ± LW": "-",  # Same as above
                    "Theaters": "N/A",  # Theaters can be filled if available
                    "Avg": f"${daily_gross:,.2f}",  # Average can be the same as daily for simplicity
                    "To Date": f"${cumulative_sum:,.2f}",
                    "Day": day_count,
                    "Estimated": "false",
                    "IMDB_ID": imdb_id,
                    "Title": title
                })
                day_count += 1

        except Exception as e:
            print(f"Error parsing row: {e}")
            continue

    return pd.DataFrame(parsed_rows)

# Function to scrape box office data based on IMDb ID
def scrape_box_office_data(imdb_id, title):
    url = f"https://www.boxofficemojo.com/release/{imdb_id}/?ref_=bo_tt_gr_1"
    response = requests.get(url)

    if response.status_code != 200:
        print(f"Failed to fetch data for IMDb ID {imdb_id} ({title})")
        return None

    soup = BeautifulSoup(response.text, 'html.parser')

    # Locate the table containing box office data
    table = soup.find('table')
    if not table:
        print(f"No table found for IMDb ID {imdb_id} ({title})")
        return None

    # Extract headers and ensure uniqueness
    headers = [th.get_text(strip=True) for th in table.find_all('th')]

    # Ensure headers are unique by appending a number if duplicates are found
    seen = {}
    for i, header in enumerate(headers):
        count = seen.get(header, 0)
        seen[header] = count + 1
        if count > 0:
            headers[i] = f"{header}_{count}"

    # Check if it's a weekend table
    is_weekend = "Weekend" in headers

    rows = []
    for tr in table.find_all('tr'):
        cells = tr.find_all('td')
        if not cells:
            continue
        row = []
        for cell in cells:
            link = cell.find('a', href=True)
            if link and 'date' in link['href']:
                # Extract date from href
                date = link['href'].split('/')[2]
                row.append(date)
            else:
                row.append(cell.get_text(strip=True))
        rows.append(row)

    if not rows:
        print(f"No data rows found for IMDb ID {imdb_id} ({title})")
        return None

    if not is_weekend:
        # Regular data
        df = pd.DataFrame(rows, columns=headers)
        df['IMDB_ID'] = imdb_id
        df['Title'] = title
        return df
    else:
        # Process weekend data and convert to daily data
        return parse_weekend_to_daily(table, imdb_id, title)

# Get today's date
today = datetime.today().date()
unique_movies = set()

# Process each person's movies
for person in people_movies:
    for movie in person["movies"]:
        title = movie.get("title")
        imdb_id = movie.get("imdb_id")
        pull_through = movie.get("pull_through")

        if not imdb_id or not title:
            print(f"Missing IMDb ID or title for {movie}")
            continue

        if pull_through:
            pull_through_date = datetime.strptime(pull_through, "%Y-%m-%d").date()
            if pull_through_date <= today:
                continue

        unique_movies.add((imdb_id, title))

# Scrape box office data for each unique movie
for imdb_id, title in unique_movies:
    print(f"Fetching data for {title} ({imdb_id})")
    df = scrape_box_office_data(imdb_id, title)
    if df is not None and not df.empty:
        all_data.append(df)
    else:
        print(f"No data found for IMDb ID {imdb_id} ({title})")

# Combine and save data
if all_data:
    final_df = pd.concat(all_data, ignore_index=True)
    if 'Daily' in final_df.columns and 'Date' in final_df.columns:
        final_df = final_df[final_df['Daily'].notna() & final_df['Date'].notna()]
    final_df.to_json(output_file, orient='records', indent=4)
    print(f"Data successfully saved to {output_file}")
else:
    print("No valid data found. Output file will not be created.")

# Git commit & push
try:
    subprocess.run(['git', 'config', '--local', 'user.email', 'github-actions[bot]@users.noreply.github.com'], check=True)
    subprocess.run(['git', 'config', '--local', 'user.name', 'github-actions[bot]'], check=True)
    subprocess.run(['git', 'remote', 'set-url', 'origin', 'https://github.com/kameronyork/kameronyork.github.io.git'], check=True)
    subprocess.run(['git', 'pull', '--rebase'], check=True)
    subprocess.run(['git', 'add', output_file], check=True)
    subprocess.run(['git', 'commit', '-m', 'Update box office data [skip ci]'], check=True)
    subprocess.run(['git', 'push'], check=True)
    print("Changes committed and pushed successfully.")
except subprocess.CalledProcessError as e:
    print(f"Git operation failed: {e}")
    print("Trying to resolve by aborting rebase (if needed)...")
    subprocess.run(['git', 'rebase', '--abort'], check=False)
else:
print("No valid data found. Output file will not be created.")
