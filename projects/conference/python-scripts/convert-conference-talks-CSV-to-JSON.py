# %%
import os
import pandas as pd

# Construct relative paths using `../` and `./`
csv_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'datasets', 'general-conference-talks.csv')
json_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'datasets', 'general-conference-talks.json')

# Resolve absolute paths
csv_path = os.path.abspath(csv_path)
json_path = os.path.abspath(json_path)

# Check if the CSV file exists
if not os.path.exists(csv_path):
    raise FileNotFoundError(f"CSV file not found at {csv_path}")

# Read CSV and convert to JSON
df = pd.read_csv(csv_path)
df.to_json(json_path, orient='records', indent=4)
print(f"Converted CSV to JSON and saved to: {json_path}")

# %%
