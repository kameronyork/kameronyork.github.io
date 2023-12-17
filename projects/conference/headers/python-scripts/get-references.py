#%%
import pandas as pd
import re
from tqdm import tqdm


#%% Reading in the data.

# Sample DataFrame
df = pd.read_csv("https://kameronyork.com/datasets/general-conference-talks.csv", encoding="utf_8")
all_verses = pd.read_csv("https://kameronyork.com/datasets/all-verses.csv", encoding="utf_8")
all_chapters = pd.read_csv("https://kameronyork.com/datasets/all-chapters.csv", encoding="utf_8")

#%% 

# Determining if footnotes AND talk should be included.
def contains_scripture_reference(text, scripture_dataframe):
    # Create a regular expression pattern to match scripture references
    scripture_list = scripture_dataframe["all chapters"].tolist()
    scripture_pattern = '|'.join(map(re.escape, scripture_list))
    
    # Apply tqdm to track the progress
    result = []
    for item in tqdm(df["text"], desc="Processing references"):
        # Use regex to search for any scripture references in the text
        if re.search(scripture_pattern, item):
            result.append(True)
        else:
            result.append(False)
    return result

# Apply the modified function to create the "check" column
df["check"] = contains_scripture_reference(df["text"], scripture_dataframe=all_chapters)

#%%
# Create Transformations column
def create_transformations(row):
    if row['check']:
        return row['text'] + row['footnotes']
    elif row['footnotes'] != '-':
        return row['footnotes']
    else:
        return row['text']

# Apply the function and create the "Transformations" column
df['Transformations'] = df.apply(create_transformations, axis=1)
# df.to_csv('extracted_quotes.csv', index=False, encoding='utf-8')

# # %%
# # Printing to csv:
# df.to_csv('testing-errors.csv', index=False, encoding='utf-8')

#%% 
# Extracting all scripture references.
def extract_scripture_references(text):
    references = re.findall(r'\(([^)]*(?:\([^)]*\)[^)]*)*)\)', text)
    formatted_references = '[' + ']*** ['.join(references) + ']'
    return formatted_references

# Apply the function to each row in the "Text" column and create a new "quote_output" column
df['quote_output'] = df['Transformations'].apply(extract_scripture_references)

# Replace df['quote_output'] with your actual column name if different
df['quote_output'] = df['quote_output'].str.replace(r'\s+', ' ', regex=True)

all_chapters['all chapters'] = all_chapters['all chapters'].str.replace(r'\s+', ' ', regex=True)

# Display the DataFrame with the new column
# df.to_csv('extracted_quotes.csv', index=False, encoding='utf-8')


# %% 
# Pivoting the scripture references on "]*** ["
def split_references(row):
    references = row['quote_output'].strip('[]').split(']*** [')
    return references

# Apply the function and explode the list into separate rows
df['quote_output'] = df.apply(split_references, axis=1)
df = df.explode('quote_output')

# # %%
# df.to_csv('extracted_quotes_pivot.csv', index=False, encoding='utf-8-sig')

#%% 
# # Removing rows that start with see
# df['quote_output'] = df['quote_output'].str.split('; emphasis|; see|. see|; Emphasis|; See|. See|, note|; italics added|. italics added').str[0]


# %%
# Creating reference_type column:
results = []

# Initialize tqdm for tracking progress
with tqdm(total=len(df)) as pbar:
    for index, row in df.iterrows():
        chapters = all_chapters['all chapters'].values
        is_scrip = any(chapter in row['quote_output'] for chapter in chapters)
        if is_scrip:
            results.append("Scrip")
        else:
            results.append("Non-Scrip")
        pbar.update(1)  # Update the progress bar

# Create a new column "reference_type" in the "no_see" DataFrame
df["reference_type"] = results

# %% 
# Save the DataFrame
df = df.drop(columns=["text", "footnotes", "check", "Transformations"])
df.to_csv('full_quotes.csv', encoding='utf-8-sig')


# %%
# Create two data frames.
scripture_quotes = (df.query("reference_type == 'Scrip'"))
non_scrip_quotes = (df.query("reference_type == 'Non-Scrip'"))


# %%
# Printing to csv:
scripture_quotes.to_csv('scriptures.csv', encoding="UTF-8",index=False)
non_scrip_quotes.to_csv('non-scrip.csv', encoding="UTF-8", index=False)

# %%
import os

output_folder = "outputs"  # Specify the output folder name

# Define the full path to the output folder
output_path = os.path.join(os.getcwd(), "general_conference", output_folder)

# Make sure the output folder exists
os.makedirs(output_path, exist_ok=True)

# Save the DataFrames with overwriting
scripture_quotes.to_csv(os.path.join(output_path, 'new-testing.csv'), index=False, encoding='utf-8-sig')
# non_scrip_quotes.to_csv(os.path.join(output_path, 'extracted_non_scrip_quotes_pivot4.csv'), index=False, encoding='utf-8-sig')

# %%
