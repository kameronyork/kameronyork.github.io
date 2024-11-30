import requests
from bs4 import BeautifulSoup
import pandas as pd
from datetime import datetime

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

    # Clean 'Daily' column
    df['Daily'] = df['Daily'].replace(r'[\$,]', '', regex=True).astype(float, errors='ignore')
    df['IMDB_ID'] = imdb_id
    df['Title'] = title
    return df

# Main script
if __name__ == "__main__":
    # IMDb IDs and Titles to fetch
    imdb_ids_titles = [
        ("rl1511097089", "Mufasa: The Lion King"),
        ("rl2115207169", "The World According to Allee Willis")
    ]

    all_data = []
    for imdb_id, title in imdb_ids_titles:
        print(f"Fetching data for {title} ({imdb_id})")
        df = scrape_box_office_data(imdb_id, title)
        if df is not None:
            all_data.append(df)

    if all_data:
        final_df = pd.concat(all_data, ignore_index=True)

        # Ensure 'Daily' and 'Date' exist before processing
        if 'Daily' in final_df.columns and 'Date' in final_df.columns:
            # Filter for rows with valid data
            final_df = final_df[final_df['Daily'].notna() & final_df['Date'].notna()]

            # Convert 'Daily' column to numeric
            final_df['Daily'] = final_df['Daily'].replace(r'[\$,]', '', regex=True).astype(float)

            # Normalize data across all dates
            all_dates = pd.date_range(final_df['Date'].min(), final_df['Date'].max())
            normalized_df = final_df.pivot(index='Date', columns='Title', values='Daily').reindex(all_dates)
            normalized_df.index.name = 'Date'
            normalized_df.fillna(0, inplace=True)

            # Convert normalized data to long format
            final_long_df = normalized_df.reset_index().melt(id_vars=['Date'], var_name='Title', value_name='Daily')

            # Save data to a JSON file
            output_file = "box_office_data.json"
            final_long_df.to_json(output_file, orient='records', indent=4)
            print(f"Data successfully saved to {output_file}")
        else:
            print("Missing required columns in final DataFrame. No output generated.")
    else:
        print("No valid data found. Output file will not be created.")