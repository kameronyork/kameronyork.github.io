# %%
import pandas as pd

# Read the CSV file
df = pd.read_csv("https://kameronyork.com/datasets/conference-quotes.csv", encoding="UTF-8")

# Define the file path
file_path = "C:/Users/theka/Desktop/Projects/Website_project/kameronyork.com/datasets/conference-quotes.json"

quotes = df[['quote_id', 'talk_year', 'talk_month', 'talk_day', 'talk_session', 'speaker', 'title', 'talk_id', 'quad_book', 'overall_book', 'book_chapter', 'scripture', 'apostle_check']]
#%%
# Save the DataFrame as JSON
quotes.to_json(file_path)



# %%
