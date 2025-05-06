import os
import json
import requests
import subprocess
from bs4 import BeautifulSoup
import pandas as pd
from datetime import datetime, timedelta

input_file = 'datasets/movies.json'
output_file = 'datasets/box-office-data.json'

with open(input_file, 'r') as f:
    people_movies = json.load(f)

all_data = []

def fetch_data(imdb_id, title):
    base_url = f"https://www.boxofficemojo.com/release/{imdb_id}/"
    response = requests.get(base_url, allow_redirects=True)
    final_url = response.url

    soup = BeautifulSoup(response.text, 'html.parser')

    if '/weekend/' in final_url:
        print(f"Daily data not available for {title}, using weekend data")
        return fetch_weekend_data(imdb_id, title)
    else:
        print(f"Using daily data for {title}")
        return fetch_daily_data(soup, imdb_id, title)

def fetch_daily_data(soup, imdb_id, title):
    table = soup.find('table')
    if not table:
        print(f"No daily table found for {title}")
        return []

    rows = table.find_all('tr')
    if len(rows) <= 1:
        print(f"Daily table found but no data for {title}")
        return []

    headers = [th.get_text(strip=True) for th in rows[0].find_all('th')]
    data = []
    for row in rows[1:]:
        cells = row.find_all('td')
        if not cells:
            continue
        values = [td.get_text(strip=True) for td in cells]
        if len(values) == len(headers):
            record = dict(zip(headers, values))
            record['IMDB_ID'] = imdb_id
            record['Title'] = title

            # Extract date logic similar to old code
            link = cells[0].find('a', href=True)
            if link and 'date' in link['href']:
                date_str = link['href'].split('/')[2]  # Extract date from URL part
                try:
                    date = datetime.strptime(date_str, "%Y-%m-%d").date()
                    record['Date'] = date.strftime("%Y-%m-%d")
                except ValueError:
                    print(f"Error parsing date for {title}")
                    continue

            data.append(record)

    return data

def fetch_weekend_data(imdb_id, title):
    url = f"https://www.boxofficemojo.com/release/{imdb_id}/weekend/"
    response = requests.get(url)
    if response.status_code != 200:
        print(f"Failed to fetch weekend data for {title} ({imdb_id})")
        return []

    soup = BeautifulSoup(response.text, 'html.parser')
    table = soup.find('table')
    if not table:
        print(f"No weekend table found for {title}")
        return []

    rows = table.find_all('tr')
    if len(rows) <= 1:
        print(f"Weekend table found but no data for {title}")
        return []

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
                    "Date": day.strftime("%Y-%m-%d"),  # Updated to use formatted date
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
            print(f"Error parsing weekend data for {title}: {e}")
            continue

    return weekend_data

# Process movies
today = datetime.today().date()
unique_movies = set()

for person in people_movies:
    for movie in person["movies"]:
        title = movie.get("title")
        imdb_id = movie.get("imdb_id")
        pull_through = movie.get("pull_through")

        if not imdb_id or not title:
            continue
        if pull_through:
            try:
                pull_through_date = datetime.strptime(pull_through, "%Y-%m-%d").date()
                if pull_through_date <= today:
                    continue
            except ValueError:
                continue

        unique_movies.add((imdb_id, title))

for imdb_id, title in unique_movies:
    print(f"Fetching data for {title} ({imdb_id})")
    movie_data = fetch_data(imdb_id, title)
    if movie_data:
        all_data.extend(movie_data)

if all_data:
    final_df = pd.DataFrame(all_data)
    final_df.to_json(output_file, orient='records', indent=4)
    print(f"Data saved to {output_file}")
else:
    print("No data found.")

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
    print(f"Git error: {e}")
    subprocess.run(['git', 'rebase', '--abort'], check=False)
