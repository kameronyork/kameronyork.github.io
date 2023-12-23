# %%
import pandas as pd
from tqdm import tqdm

# Read the CSV file into a DataFrame
df = pd.read_csv("https://kameronyork.com/datasets/all-footnotes.csv", encoding='utf-8')

# Define the file path for the JSON file with the short list.  Grouped by scripture with the count of instances.
file_path_short = "C:/Users/theka/Desktop/Projects/Website_project/kameronyork.com/datasets/all-footnotes-lookup.json"


# %%
# Save the sorted and merged DataFrame as JSON
# df.to_json(file_path_long, orient='records')


# %%
scripture_counts = df.groupby('scripture').size().reset_index(name='count')

scripture_counts.to_json(file_path_short, orient='records')
# %%
