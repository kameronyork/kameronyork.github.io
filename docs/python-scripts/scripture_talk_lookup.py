#%%
import pandas as pd
import re

# Read the dataset from the new URL
url = "https://www.kameronyork.com/datasets/conference-quotes.csv"
quotes = pd.read_csv(url, encoding='utf-8-sig')

# Define your hand-defined list of scripture references with a regex pattern
hand_defined_list = [r"Mark 4:5"]
search_string = {r"Mark 4:5"}


# Define a function to check if a talk has quoted any of the specified scriptures
def contains_any_scripture(references, scripture_list):
    for scripture in scripture_list:
        if re.search(scripture, references):
            return True
    return False

# Filter the talks that contain any references in the hand-defined list
matching_talks = quotes[quotes['scripture'].apply(contains_any_scripture, scripture_list=hand_defined_list)]

# Group the DataFrame by 'talk_id' and aggregate the 'combined_scripture' as a set
grouped = matching_talks.groupby('talk_id')['scripture'].agg(set)

# Find the talk_ids that have both "Alma 48:17" and "Alma 48:19"
talk_ids_both = grouped[grouped.apply(lambda x: search_string.issubset(x))]


talk_ids_list = talk_ids_both.index.tolist()


# Create a new DataFrame with the first row for each matching talk ID
result_df = quotes[quotes['talk_id'].isin(talk_ids_list)].groupby('talk_id').first().reset_index()

# Display the result
result_df

# Keep as a csv file:
# result_df.to_csv('wise-and-foolish-builders-matthew .csv', index=False, encoding='utf-8-sig')



# %%
