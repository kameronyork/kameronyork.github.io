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
            headers[i] = f"{header}_{count}"  # Rename duplicated headers with a suffix

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
                date = link['href'].split('/')[2]  # Extract date from href
                row.append(date)
            else:
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

# Function to fill missing dates and calculate "To Date"
def fill_missing_dates(df):
    # Ensure 'Date' is a datetime object and sort
    df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
    df = df.dropna(subset=['Date']).sort_values('Date')
    df['Daily'] = df['Daily'].str.replace(',', '').str.replace('$', '', regex=False).astype(float, errors='ignore')

    # Get minimum and maximum dates from the data
    min_date = df['Date'].min()
    max_date = datetime.today().date()

    # Create a complete date range
    full_date_range = pd.date_range(start=min_date, end=max_date)

    # Reindex to include all dates
    df = df.set_index('Date').reindex(full_date_range, fill_value=0).reset_index()
    df.rename(columns={'index': 'Date'}, inplace=True)

    # Fill missing data
    df['Daily'] = df['Daily'].fillna(0)
    df['To Date'] = 0
    for i in range(len(df)):
        if i == 0:
            df.loc[i, 'To Date'] = df.loc[i, 'Daily']
        else:
            df.loc[i, 'To Date'] = df.loc[i - 1, 'To Date'] + df.loc[i, 'Daily']

    # Fill other columns with placeholders where data is missing
    for col in ['Rank', 'DOW', '%± YD', '%± LW', 'Theaters', 'Avg', 'Weekend', 'Change', 'Weekend_1']:
        if col not in df.columns:
            df[col] = None

    df['Rank'] = df['Rank'].fillna('-')
    df['Title'] = df['Title'].fillna(df['Title'][0])
    df['IMDB_ID'] = df['IMDB_ID'].fillna(df['IMDB_ID'][0])
    df['Estimated'] = df['Estimated'].fillna('false')
    df['Day'] = range(1, len(df) + 1)

    return df

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
        df = fill_missing_dates(df)
        all_data.append(df)
    else:
        print(f"No data found for IMDb ID {imdb_id} ({title})")

# Concatenate all data into a single DataFrame
if all_data:
    final_df = pd.concat(all_data, ignore_index=True)
    final_df.to_json(output_file, orient='records', indent=4, date_format='iso')
    print(f"Data successfully saved to {output_file}")
else:
    print("No valid data found. Output file will not be created.")