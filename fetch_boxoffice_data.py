import requests
from bs4 import BeautifulSoup
import pandas as pd
from datetime import datetime, timedelta

# Function to scrape box office data
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
    if not headers or 'Daily' not in headers:
        print(f"Unexpected headers or missing 'Daily' column for IMDb ID {imdb_id} ({title}): {headers}")
        return None

    # Extract rows
    rows = []
    for tr in table.find_all('tr'):
        cells = tr.find_all('td')
        if not cells:
            continue
        row = [cell.get_text(strip=True) for cell in cells]
        rows.append(row)

    if not rows:
        print(f"No data rows found for IMDb ID {imdb_id} ({title})")
        return None

    # Create a DataFrame and validate columns
    df = pd.DataFrame(rows, columns=headers)
    if 'Daily' not in df.columns or 'Date' not in df.columns:
        print(f"Required columns missing for IMDb ID {imdb_id} ({title}): {df.columns}")
        return None

    # Debugging: Check unique values in the Date column
    print(f"Unique Date values for {title} ({imdb_id}): {df['Date'].unique()}")

    # Clean and transform the data
    df['Daily'] = df['Daily'].replace(r'[\$,]', '', regex=True).astype(float, errors='ignore')

    # Convert Date column to datetime, coercing errors
    df['Date'] = pd.to_datetime(df['Date'], errors='coerce')

    # Drop rows with invalid dates
    df = df.dropna(subset=['Date'])

    # Add additional columns for metadata
    df['IMDB_ID'] = imdb_id
    df['Title'] = title

    # Sort the data by date
    df.sort_values('Date', inplace=True)
    return df

# Function to fill missing dates for all movies
def normalize_data(all_data):
    # Combine all dataframes into one
    combined_df = pd.concat(all_data, ignore_index=True)

    # Get the full date range across all movies
    start_date = combined_df['Date'].min()
    end_date = datetime.today()
    all_dates = pd.date_range(start=start_date, end=end_date)

    # Normalize data for each movie
    movies = combined_df['Title'].unique()
    normalized_data = []

    for movie in movies:
        movie_data = combined_df[combined_df['Title'] == movie].set_index('Date')
        to_date = 0

        for date in all_dates:
            if date in movie_data.index:
                row = movie_data.loc[date].to_dict()
                to_date = row['To Date']
            else:
                row = {
                    'Date': date,
                    'DOW': date.strftime('%Y-%m-%d'),
                    'Rank': None,
                    'Daily': 0,
                    '%± YD': None,
                    '%± LW': None,
                    'Theaters': None,
                    'Avg': None,
                    'To Date': to_date,
                    'Day': None,
                    'Estimated': False,
                    'IMDB_ID': movie_data['IMDB_ID'].iloc[0] if not movie_data.empty else None,
                    'Title': movie,
                    'Weekend': None,
                    'Change': None,
                    'Weekend_1': None,
                }
            # Update cumulative To Date
            row['To Date'] += row['Daily']
            normalized_data.append(row)

    return pd.DataFrame(normalized_data)

# Main script
if __name__ == "__main__":
    # IMDb IDs and Titles to fetch
    imdb_ids_titles = [
        ("rl1199474177", "Wicked"),
        ("rl2841083905", "Red One")
    ]

    all_data = []
    for imdb_id, title in imdb_ids_titles:
        print(f"Fetching data for {title} ({imdb_id})")
        df = scrape_box_office_data(imdb_id, title)
        if df is not None:
            all_data.append(df)

    if all_data:
        # Normalize data to fill missing dates
        normalized_df = normalize_data(all_data)

        # Save data to a JSON file
        output_file = "fixed_box_office_data.json"
        normalized_df.to_json(output_file, orient='records', date_format='iso', indent=4)

        print(f"Data successfully saved to {output_file}")
    else:
        print("No valid data found. Output file will not be created.")