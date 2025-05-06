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

def fetch_daily_data(imdb_id, title):
    url = f"https://www.boxofficemojo.com/release/{imdb_id}/?ref_=bo_tt_gr_1"
    response = requests.get(url)
    if response.status_code != 200:
        return None

    soup = BeautifulSoup(response.text, 'html.parser')
    table = soup.find('table')
    if not table:
        return None

    headers = [th.get_text(strip=True) for th in table.find_all('th')]
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
        return None

    df = pd.DataFrame(rows, columns=headers)
    df['IMDB_ID'] = imdb_id
    df['Title'] = title
    return df

def fetch_weekend_data(imdb_id, title):
    url = f"https://www.boxofficemojo.com/release/{imdb_id}/weekend/"
    response = requests.get(url)
    if response.status_code != 200:
        return None

    soup = BeautifulSoup(response.text, 'html.parser')
    table = soup.find('table')
    if not table:
        return None

    rows = table.find_all('tr')
    headers = [th.get_text(strip=True) for th in rows[0].find_all('th')]

    weekend_data = []
    for row in rows[1:]:
        cells = row.find_all('td')
        if len(cells) < 3:
            continue

        date_range = cells[0].get_text(strip=True)
        weekend_gross = cells[2].get_text(strip=True)

        try:
            date_range = date_range.replace('\xa0', ' ').replace('–', '-').replace('—', '-')
            parts = date_range.split('-')
            if len(parts) != 2:
                continue

            start_str, end_str = parts[0].strip(), parts[1].strip()
            current_year = datetime.today().year
            start_date = datetime.strptime(f"{start_str} {current_year}", "%b %d %Y")

            try:
                end_date = datetime.strptime(f"{end_str} {current_year}", "%b %d %Y")
            except ValueError:
                end_day = int(end_str)
                end_date = datetime(year=current_year, month=start_date.month, day=end_day)

            num_days = (end_date - start_date).days + 1
            gross_val = float(weekend_gross.replace('$', '').replace(',', ''))
            daily_gross = round(gross_val / num_days, 2)

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
            print(f"Error parsing weekend data for {title} ({imdb_id}): {e}")

    return weekend_data if weekend_data else None

# Collect all unique movies
unique_movies = set()
for person in people_movies:
    for movie in person["movies"]:
        title = movie.get("title")
        imdb_id = movie.get("imdb_id")
        if title and imdb_id:
            unique_movies.add((imdb_id, title))

# Fetch data for each movie
for imdb_id, title in unique_movies:
    print(f"Fetching data for {title} ({imdb_id})...")
    df = fetch_daily_data(imdb_id, title)
    if df is not None and not df.empty:
        all_data.append(df)
        print(f"✓ Using daily data for {title}")
    else:
        print(f"⚠ No daily data for {title}, trying weekend fallback...")
        weekend_data = fetch_weekend_data(imdb_id, title)
        if weekend_data:
            all_data.extend(weekend_data)
            print(f"✓ Using weekend data for {title}")
        else:
            print(f"✗ No box office data found for {title}")

# Save to JSON
if all_data:
    if isinstance(all_data[0], pd.DataFrame):
        final_df = pd.concat(all_data, ignore_index=True)
    else:
        final_df = pd.DataFrame(all_data)

    final_df = final_df[final_df['Date'].notna() & final_df['Daily'].notna()]
    final_df.to_json(output_file, orient='records', indent=4)
    print(f"✅ Data successfully saved to {output_file}")
else:
    print("⚠ No valid data found. Output file will not be created.")

# Git commit & push
try:
    subprocess.run(['git', 'config', '--local', 'user.email', 'github-actions[bot]@users.noreply.github.com'], check=True)
    subprocess.run(['git', 'config', '--local', 'user.name', 'github-actions[bot]'], check=True)
    subprocess.run(['git', 'pull', '--rebase'], check=True)
    subprocess.run(['git', 'add', output_file], check=True)
    subprocess.run(['git', 'commit', '-m', 'Update box office data [skip ci]'], check=True)
    subprocess.run(['git', 'push'], check=True)
    print("✅ Changes committed and pushed successfully.")
except subprocess.CalledProcessError as e:
    print(f"❌ Git operation failed: {e}")
    subprocess.run(['git', 'rebase', '--abort'], check=False)
