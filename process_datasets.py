import os
import json
from boxoffice_api import BoxOffice

# Initialize the BoxOffice API client
box_office = BoxOffice()

# Directory containing the datasets
datasets_dir = 'datasets'

# Iterate over all JSON files in the datasets folder that start with "movie-draft"
for filename in os.listdir(datasets_dir):
    if filename.startswith('movie-draft') and filename.endswith('.json'):
        input_filepath = os.path.join(datasets_dir, filename)
        output_filepath = os.path.join(datasets_dir, filename.replace('.json', '-data.json'))

        # Load the data from the input JSON file
        with open(input_filepath, 'r') as f:
            people_movies = json.load(f)

        # Create a list to store fetched data
        fetched_data = []

        # Fetch data for each person's movies
        for person in people_movies:
            person_data = {"name": person["name"], "movies": []}
            for movie_title in person["movies"]:
                try:
                    # Fetch daily box office data for the movie
                    movie_data = box_office.get_daily(movie_title)  # Adjust as needed for the API structure
                    person_data["movies"].append({
                        "title": movie_title,
                        "data": movie_data
                    })
                except Exception as e:
                    print(f"Error fetching data for {movie_title}: {e}")
                    person_data["movies"].append({
                        "title": movie_title,
                        "error": str(e)
                    })
            fetched_data.append(person_data)

        # Save the fetched data to a new output JSON file
        with open(output_filepath, 'w') as f:
            json.dump(fetched_data, f, indent=4)
