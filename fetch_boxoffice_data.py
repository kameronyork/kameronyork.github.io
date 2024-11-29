import os
import json
import requests
from bs4 import BeautifulSoup
import pandas as pd
from datetime import datetime

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

    # Create a DataFrame and add extra columns
    df = pd.DataFrame(rows, columns=headers)
    df['IMDB_ID'] = imdb_id
    df['Title'] = title
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
        all_data.append(df)
    else:
        print(f"No data found for IMDb ID {imdb_id} ({title})")

# Concatenate all data into a single DataFrame
if all_data:
    final_df = pd.concat(all_data, ignore_index=True)
    final_df = final_df[final_df['Daily'].notna() & final_df['Date'].notna()]

    # Convert 'Daily' column to numeric and fill missing values
    final_df['Daily'] = final_df['Daily'].replace('[\$,]', '', regex=True).astype(float)

    # Generate a complete range of dates
    all_dates = pd.date_range(final_df['Date'].min(), final_df['Date'].max())

    # Pivot data to normalize movies across all dates
    normalized_df = final_df.pivot(index='Date', columns='Title', values='Daily').reindex(all_dates)
    normalized_df.index.name = 'Date'
    normalized_df.fillna(0, inplace=True)

    # Melt the normalized DataFrame back into a long format
    final_long_df = normalized_df.reset_index().melt(id_vars=['Date'], var_name='Title', value_name='Daily')

    # Save to JSON
    final_long_df.to_json(output_file, orient='records', indent=4)
    print(f"Data successfully saved to {output_file}")
else:
    print("No valid data found. Output file will not be created.")