import os
import json
import requests
from bs4 import BeautifulSoup
import pandas as pd

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

# Process each person's movies
for person in people_movies:
    for movie in person["movies"]:
        imdb_id = movie.get("imdb_id")
        title = movie.get("title")
        if not imdb_id or not title:
            print(f"Missing IMDb ID or title for {movie}")
            continue
        df = scrape_box_office_data(imdb_id, title)
        if df is not None and not df.empty:
            all_data.append(df)
        else:
            print(f"No data found for IMDb ID {imdb_id} ({title})")

# Concatenate all data into a single DataFrame
if all_data:
    final_df = pd.concat(all_data, ignore_index=True)
    # Save to JSON file
    final_df.to_json(output_file, orient='records', indent=4)
    print(f"Data successfully saved to {output_file}")
else:
    print("No valid data found. Output file will not be created.")
