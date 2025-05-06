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

# Function to handle weekend tables
def parse_weekend_table(table, imdb_id, title):
    rows = table.find_all('tr')
    headers = [th.get_text(strip=True) for th in rows[0].find_all('th')]

    parsed_rows = []

    for row in rows[1:]:  # Skip header
        cells = row.find_all('td')
        if len(cells) < 3:
            continue

        date_range = cells[0].get_text(strip=True)
        gross = cells[2].get_text(strip=True)

        try:
            date_range = date_range.replace('\xa0', ' ').replace('–', '-').replace('—', '-')
            parts = date_range.split('-')
            if len(parts) != 2:
                continue

            start_str, end_str = parts[0].strip(), parts[1].strip()
            current_year = datetime.today().year

            # Parse start date
            start_date = datetime.strptime(f"{start_str} {current_year}", "%b %d %Y")

            # If end_str doesn't include a month, use the start's month
            try:
                end_date = datetime.strptime(f"{end_str} {current_year}", "%b %d %Y")
            except ValueError:
                end_day = int(end_str)
                end_date = datetime(year=current_year, month=start_date.month, day=end_day)

            num_days = (end_date - start_date).days + 1
            gross_val = float(gross.replace('$', '').replace(',', ''))
            daily_gross = round(gross_val / num_days, 2)

            for i in range(num_days):
                day = start_date + timedelta(days=i)
                parsed_rows.append({
                    "Date": day.strftime("%Y-%m-%d"),
                    "Daily": f"${daily_gross:,.2f}",
                    "IMDB_ID": imdb_id,
                    "Title": title
                })

        except Exception as e:
            print(f"Error parsing weekend row for {title}: {e}")
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
    table = soup.find('table')
    if not table:
        print(f"No table found for IMDb ID {imdb_id} ({title})")
        return None

    # Check if it's a weekend table
    first_header = table.find('th')
    if first_header and 'Weekend' in first_header.get_text(strip=True):
        print(f"Parsing weekend table for {title}")
        return parse_weekend_table(table, imdb_id, title)

    # Otherwise parse normally
    headers = [th.get_text(strip=True) for th in table.find_all('th')]
    
    # Ensure headers are unique
    seen = {}
    for i, header in enumerate(headers):
        count = seen.get(header, 0)
        seen[header] = count + 1
        if count > 0:
            headers[i] = f"{header}_{count}"

    rows = []
    for tr in table.find_all('tr'):
        cells = tr.find_all('td')
        if not cells:
            continue
        row = []
        for cell in cells:
            link = cell.find('a', href=True)
            if link and 'date' in link['href']:
                date = link['href'].split('/')[2]
                row.append(date)
            else:
                row.append(cell.get_text(strip=True))
        rows.append(row)

    if not rows:
        print(f"No data rows found for IMDb ID {imdb_id} ({title})")
        return None

    df = pd.DataFrame(rows, columns=headers)
    df['IMDB_ID'] = imdb_id
    df['Title'] = title
    return df

# Today's date
today = datetime.today().date()

# Set to track unique movies
unique_movies = set()

# Deduplicate and filter movies
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

# Fetch data
for imdb_id, title in unique_movies:
    print(f"Fetching data for {title} ({imdb_id})")
    df = scrape_box_office_data(imdb_id, title)
    if df is not None and not df.empty:
        all_data.append(df)
    else:
        print(f"No data found for IMDb ID {imdb_id} ({title})")

# Combine and save
if all_data:
    final_df = pd.concat(all_data, ignore_index=True)
    if 'Daily' in final_df.columns and 'Date' in final_df.columns:
        final_df = final_df[final_df['Daily'].notna() & final_df['Date'].notna()]
    final_df.to_json(output_file, orient='records', indent=4, force_ascii=False)
    print(f"Data successfully saved to {output_file}")

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
