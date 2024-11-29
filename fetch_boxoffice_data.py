# Import necessary modules
import os
import json
import requests
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
    seen = {}
    for i, header in enumerate(headers):
        count = seen.get(header, 0)
        seen[header] = count + 1
        if count > 0:
            headers[i] = f"{header}_{count}"

    # Extract rows
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

# Function to generate missing days with zero data for the past 10 days
def generate_missing_days(df, imdb_id, title):
    last_10_days = [(datetime.today() - timedelta(days=i)).strftime('%Y-%m-%d') for i in range(10)]
    existing_dates = df['Date'].tolist() if 'Date' in df.columns else []
    missing_dates = set(last_10_days) - set(existing_dates)

    missing_rows = pd.DataFrame({
        'Date': list(missing_dates),
        'Daily': [0] * len(missing_dates),  # Assuming 'Daily' column holds box office earnings
        'IMDB_ID': imdb_id,
        'Title': title
    })

    # Append missing rows to the existing dataframe
    return pd.concat([df, missing_rows], ignore_index=True)

# Get today's date
today = datetime.today().date()

# Set to track unique movies
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
        df = generate_missing_days(df, imdb_id, title)
        all_data.append(df)
    else:
        print(f"No data found for IMDb ID {imdb_id} ({title})")

# Concatenate all data into a single DataFrame
if all_data:
    final_df = pd.concat(all_data, ignore_index=True)
    final_df = final_df[final_df['Daily'].notna() & final_df['Date'].notna()]
    final_df.to_json(output_file, orient='records', indent=4)
    print(f"Data successfully saved to {output_file}")
else:
    print("No valid data found. Output file will not be created.")