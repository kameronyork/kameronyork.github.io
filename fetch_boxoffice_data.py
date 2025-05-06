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

    # Ensure headers are unique by appending a number if duplicates are found
    seen = {}
    for i, header in enumerate(headers):
        count = seen.get(header, 0)
        seen[header] = count + 1
        if count > 0:
            headers[i] = f"{header}_{count}"

    is_weekend = headers[0] == "Weekend"
    rows = []

    for tr in table.find_all('tr'):
        cells = tr.find_all('td')
        if not cells:
            continue
        row_data = []
        for cell in cells:
            link = cell.find('a', href=True)
            if link and 'date' in link['href']:
                # Extract date from href
                date = link['href'].split('/')[2]
                row_data.append(date)
            else:
                row_data.append(cell.get_text(strip=True))
        if row_data:
            rows.append(row_data)

    if not rows:
        print(f"No data rows found for IMDb ID {imdb_id} ({title})")
        return None

    if not is_weekend:
        # Daily data: simple DataFrame
        df = pd.DataFrame(rows, columns=headers)
        df['IMDB_ID'] = imdb_id
        df['Title'] = title
        return df
    else:
        # Weekend data: need to split entries by individual days
        weekend_dfs = []
        for row in rows:
            row_dict = dict(zip(headers, row))

            weekend_range = row_dict.get("Weekend")
            gross = row_dict.get("Gross")

            if not weekend_range or not gross:
                continue

            try:
                # Split range like 'May 2–4'
                date_parts = weekend_range.replace('–', '-').replace('—', '-').split('-')
                if len(date_parts) != 2:
                    continue
                start_str, end_str = date_parts
                # Add year if missing
                today = datetime.today()
                year = today.year

                start_date = datetime.strptime(f"{start_str.strip()} {year}", "%b %d %Y")
                end_date = datetime.strptime(f"{end_str.strip()} {year}", "%b %d %Y")

                num_days = (end_date - start_date).days + 1
                gross_val = gross.replace('$', '').replace(',', '')
                gross_per_day = round(float(gross_val) / num_days, 2)

                for i in range(num_days):
                    day = start_date + timedelta(days=i)
                    new_row = {key: row_dict.get(key, '') for key in headers}
                    new_row['Date'] = day.strftime('%Y-%m-%d')
                    new_row['Daily'] = f"${gross_per_day:,.2f}"
                    new_row['IMDB_ID'] = imdb_id
                    new_row['Title'] = title
                    weekend_dfs.append(new_row)
            except Exception as e:
                print(f"Error parsing weekend row for {title}: {e}")
                continue

        return pd.DataFrame(weekend_dfs)

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

# Combine and save
if all_data:
    final_df = pd.concat(all_data, ignore_index=True)
    if 'Daily' in final_df.columns and 'Date' in final_df.columns:
        final_df = final_df[final_df['Daily'].notna() & final_df['Date'].notna()]
    final_df.to_json(output_file, orient='records', indent=4)
    print(f"Data successfully saved to {output_file}")
else:
    print("No valid data found. Output file will not be created.")
