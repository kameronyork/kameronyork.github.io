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

# Function to scrape data from Box Office Mojo based on IMDb ID
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
            headers[i] = f"{header}_{count}"  # Rename duplicated headers with a suffix

    # Extract rows
    rows = []
    for tr in table.find_all('tr'):
        cells = tr.find_all('td')
        if not cells:
            continue
        row = []
        for cell in cells:
            # Check if there is an anchor tag with an href
            link = cell.find('a', href=True)
            if link and 'date' in link['href']:
                # Extract date from href
                date = link['href'].split('/')[2]  # Get the date part from the URL
                row.append(date)
            else:
                # Extract text content
                row.append(cell.get_text(strip=True))
        rows.append(row)

    # Check if rows are empty
    if not rows:
        print(f"No data rows found for IMDb ID {imdb_id} ({title})")
        return None

    # Create a DataFrame and add extra columns
    df = pd.DataFrame(rows, columns=headers)
    df['IMDB_ID'] = imdb_id
    df['Title'] = title
    return df

# Function to fetch weekend box office data
def fetch_weekend_data(imdb_id, title):
    url = f"https://www.boxofficemojo.com/release/{imdb_id}/weekend/"
    response = requests.get(url)

    if response.status_code != 200:
        print(f"Failed to fetch the weekend data for IMDb ID {imdb_id} ({title})")
        return None

    soup = BeautifulSoup(response.text, 'html.parser')
    table = soup.find('table')

    if not table:
        print(f"No weekend table found for IMDb ID {imdb_id} ({title})")
        return None

    rows = table.find_all('tr')
    headers = [th.get_text(strip=True) for th in rows[0].find_all('th')]

    weekend_data = []
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

            # Store daily data for each day in the date range
            cumulative_total = 0
            for i in range(num_days):
                day = start_date + timedelta(days=i)
                cumulative_total += daily_gross
                weekend_data.append({
                    "Date": day.strftime("%Y-%m-%d"),
                    "DOW": day.strftime("%Y-%m-%d"),
                    "Rank": "-",
                    "Daily": f"${daily_gross:,.2f}",
                    "%± YD": "-",
                    "%± LW": "-",
                    "Theaters": "-",
                    "Avg": "-",
                    "To Date": f"${cumulative_total:,.2f}",
                    "Day": i + 1,
                    "Estimated": "false",
                    "IMDB_ID": imdb_id,
                    "Title": title
                })
        except Exception as e:
            print(f"Error parsing weekend data for IMDb ID {imdb_id} ({title}): {e}")

    return weekend_data

# Get today's date
today = datetime.today().date()

# Set to track unique movies (since multiple people can have the same movie)
unique_movies = set()

# Process each person's movies
for person in people_movies:
    for movie in person["movies"]:
        title = movie.get("title")
        imdb_id = movie.get("imdb_id")
        pull_through = movie.get("pull_through")

        # Check if IMDb ID and title are present
        if not imdb_id or not title:
            print(f"Missing IMDb ID or title for {movie}")
            continue

        # Convert pull_through date to datetime object for comparison
        if pull_through:
            pull_through_date = datetime.strptime(pull_through, "%Y-%m-%d").date()
            if pull_through_date <= today:
                continue  # Skip movie if pull_through date is in the past

        # Add movie to the unique set (this ensures we only process each movie once)
        unique_movies.add((imdb_id, title))

# Initialize list for all scraped data
all_data = []

# Scrape box office data for each unique movie
for imdb_id, title in unique_movies:
    print(f"Fetching data for {title} ({imdb_id})")
    weekend_data = fetch_weekend_data(imdb_id, title)
    if weekend_data:
        all_data.extend(weekend_data)

# Concatenate all data into a single DataFrame
if all_data:
    final_df = pd.DataFrame(all_data)
    # Save to JSON file
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
