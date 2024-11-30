import requests
import pandas as pd
from datetime import datetime, timedelta

# Function to scrape box office data
def fetch_boxoffice_data(imdb_ids):
    data = []
    
    for imdb_id in imdb_ids:
        url = f'https://www.boxofficemojo.com/data/?id={imdb_id}'
        response = requests.get(url)
        
        if response.status_code == 200:
            print(f"Fetching data for {imdb_id}")
            # Extract data from response (replace with actual scraping logic)
            # This is just a placeholder for the scraping part
            movie_data = extract_movie_data(response.text, imdb_id)
            if movie_data:
                data.append(movie_data)
        else:
            print(f"Failed to fetch data for IMDb ID {imdb_id}")
    
    return pd.DataFrame(data)

# Placeholder for the actual data extraction logic
def extract_movie_data(response_text, imdb_id):
    # Extract data such as daily box office collection and dates here
    # This is just a dummy example, replace it with actual scraping
    movie_data = {
        'IMDb ID': imdb_id,
        'Dates': ['2024-11-25', '2024-11-26', '2024-11-27'],  # Example dates
        'Daily': ['$1,000,000', '$1,200,000', '$1,150,000']  # Example box office data
    }
    return movie_data

# Function to clean and process data
def clean_and_process_data(df):
    # Remove commas and dollar signs from the 'Daily' column and convert to float
    df['Daily'] = df['Daily'].str.replace(',', '').str.replace('$', '', regex=False).astype(float, errors='ignore')
    
    # Fill missing dates
    df = fill_missing_dates(df)
    
    return df

# Function to fill in missing dates
def fill_missing_dates(df):
    all_dates = pd.date_range(start=df['Dates'].min(), end=df['Dates'].max()).strftime('%Y-%m-%d')
    
    # Loop through each movie data and ensure all dates are present
    filled_data = []
    
    for imdb_id, group in df.groupby('IMDb ID'):
        # Create a date range for the movie's data
        movie_dates = pd.to_datetime(group['Dates'])
        movie_daily = group['Daily']
        
        # Create a DataFrame with all possible dates
        full_dates = pd.DataFrame({
            'IMDb ID': imdb_id,
            'Dates': all_dates,
            'Daily': [None] * len(all_dates)
        })
        
        # Merge with the existing data to fill missing values
        full_dates = pd.merge(full_dates, group[['Dates', 'Daily']], on='Dates', how='left')
        
        # Fill in missing 'Daily' values if needed (e.g., use 0 or a method like forward filling)
        full_dates['Daily'].fillna(0, inplace=True)  # Replace missing with 0 (or another method)
        
        filled_data.append(full_dates)
    
    return pd.concat(filled_data, ignore_index=True)

# Main function to run the process
def main():
    imdb_ids = ['rl1199474177', 'rl2383183873', 'rl4218716161', 'rl2115207169']
    
    # Step 1: Fetch data from IMDb IDs
    df = fetch_boxoffice_data(imdb_ids)
    
    # Step 2: Clean and process the data
    df = clean_and_process_data(df)
    
    # Step 3: Print or save the final DataFrame
    print(df)

if __name__ == "__main__":
    main()