# %%
import pandas as pd

# Read the CSV files
df = pd.read_csv("https://kameronyork.com/datasets/conference-quotes.csv", encoding="UTF-8")
talks = pd.read_csv("https://kameronyork.com/datasets/general-conference-talks.csv", encoding="UTF-8")

# Select required columns from df
quotes = df[['quote_id', 'talk_year', 'talk_month', 'talk_day', 'talk_session', 'speaker', 'title', 'talk_id', 'scripture', 'apostle_check']]

# Merge or join to add 'hyperlink' column
merged_df = pd.merge(quotes, talks[['id', 'hyperlink']], left_on='talk_id', right_on='id', how='left')

# Sort the DataFrame by 'quote_id' in descending order
merged_df.sort_values(by='quote_id', ascending=False, inplace=True)

# Define the file path for the JSON file with the long list
file_path_long = "C:/Users/theka/Desktop/Projects/Website_project/kameronyork.com/datasets/conference-quotes.json"

# Define the file path for the JSON file with the short list.  Grouped by scripture with the count of instances.
file_path_short = "C:/Users/theka/Desktop/Projects/Website_project/kameronyork.com/datasets/scriptures-quoted.json"

# %%
# Save the sorted and merged DataFrame as JSON
merged_df.to_json(file_path_long, orient='records')


# %%
scripture_counts = merged_df.groupby('scripture').size().reset_index(name='count')

scripture_counts.to_json(file_path_short, orient='records')
# %%
