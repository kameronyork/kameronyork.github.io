# %%
import pandas as pd
import datetime
import os

# Define a function to convert time format to seconds
def time_to_seconds(time_str):
    if time_str == '--':
        return None
    minutes, seconds = map(int, time_str.split(':'))
    return minutes * 60 + seconds

# Try to read the existing JSON file into a DataFrame
json_file_path = 'C:/Users/theka/Desktop/Projects/Website_project/kameronyork.com/projects/crossword/mini-leaderboard.json'
if os.path.exists(json_file_path) and os.path.getsize(json_file_path) > 0:
    full_leaderboard = pd.read_json(json_file_path)
else:
    # If the file doesn't exist or is empty, initialize an empty DataFrame
    # Assuming 'rank', 'name', 'seconds', and 'crossword_date' as columns
    full_leaderboard = pd.DataFrame(columns=['rank', 'name', 'seconds', 'crossword_date'])

# Initialize an empty list to store the table rows
table = []

# Initialize variables to store the current state while reading the file
current_rank = None
current_name = None

# Open and read the file    
with open('C:/Users/theka/Desktop/Projects/Website_project/kameronyork.com/projects/crossword/leaderboard-output.txt', 'r') as file:
    for line in file:
        line = line.strip()  # Remove leading/trailing whitespace
        if line.isdigit():  # This line is a rank
            current_rank = line
        elif line.startswith('•') or line == 'Settings':  # Marks the end of relevant data
            if current_name:  # Add the last user without a time
                table.append({'rank': None, 'name': current_name, 'seconds': None})
                current_name = None
            current_rank = None  # Reset rank for users without completion
        elif line.endswith('(you)'):  # This line is a name, specifically the user
            current_name = line.split(' ')[0]  # Extract name before "(you)"
        elif ':' in line or line == '--' or line == 'Play Puzzle':  # This line is a time, '--', or 'Play Puzzle'
            time_in_seconds = None
            if ':' in line and line != '--':
                time_in_seconds = time_to_seconds(line)
            table.append({'rank': current_rank, 'name': current_name, 'seconds': time_in_seconds})
            current_rank, current_name = None, None  # Reset for the next entry
        else:  # This line is a name without '(you)' and without a preceding rank
            current_name = line

# Convert the table list of dictionaries to a pandas DataFrame
df = pd.DataFrame(table)

# Optionally, convert 'rank' and 'seconds' to a more suitable format
# This step is necessary because pandas might infer these columns as objects due to the presence of None values
df['rank'] = pd.to_numeric(df['rank'], errors='coerce').astype('Int64')
df['seconds'] = pd.to_numeric(df['seconds'], errors='coerce').astype('Int64')


# Get today's date
today = datetime.date.today()

# Format the date as "dd-MM-yyyy"
formatted_date = today.strftime("%m-%d-%Y")

# Add the 'crossword_date' column to the DataFrame
df['crossword_date'] = formatted_date

print(df)

# Append the new data to the full_leaderboard DataFrame
full_leaderboard = pd.concat([full_leaderboard, df], ignore_index=True)

# Save the full_leaderboard DataFrame to the JSON file in a standard JSON array format
full_leaderboard.to_json(json_file_path, orient='records', date_format='iso')


# %%
