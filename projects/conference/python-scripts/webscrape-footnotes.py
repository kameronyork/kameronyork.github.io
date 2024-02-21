# Lines that begin with ##### indicate "failsafe lines"
# Lines that begin with ## # ## indicate a "save point" where the data is offloaded to the local computer.
# Because some sections of code take so long to run the datasets can be saved to the file directory and read back in to restart a section.  This is much easier than having to rerun the code to go back a few lines.

# %%
import pandas as pd
import requests
from bs4 import BeautifulSoup
from tqdm import tqdm  # Import tqdm for the progress bar

##### # %%
# Define a function to extract hrefs from a given section
def extract_hrefs(url, section_class):
    response = requests.get(url)
    soup = BeautifulSoup(response.content, 'html.parser')
    section = soup.find('div', class_=section_class)
    if section:
        # Exclude links within the action bar section
        action_bar = section.find('div', class_='ActionBar')
        if action_bar:
            action_bar.extract()  # Remove the action bar from the section
        hrefs = [a['href'] for a in section.find_all('a', href=True)]
        return hrefs
    else:
        return []

# Read the dataset into a pandas DataFrame
df = pd.read_csv("https://kameronyork.com/datasets/conference-talk-hyperlinks.csv", encoding="utf-8")


# Apply the function to each row in the DataFrame with tqdm
tqdm.pandas(desc="Processing rows")
df['main_body_hrefs'] = df['hyperlink'].progress_apply(lambda url: extract_hrefs(url, 'contentWrapper-n6Z8K'))
df['aside_hrefs'] = df['hyperlink'].progress_apply(lambda url: extract_hrefs(url, 'sidePanel-sfJHO'))


# Save the DataFrame to a new CSV file
## # ## df.to_csv("C:/Users/theka/Desktop/Projects/Gospel Buddy/conference-talk-hyperlinks-output.csv", encoding="utf-8", index=False)

##### # %%
## # ## df = pd.read_csv("C:/Users/theka/Desktop/Projects/Gospel Buddy/conference-talk-hyperlinks-output.csv", encoding="utf-8")

# Unlist the main_body_hrefs column and pivot the DataFrame
swap_df = df.explode('main_body_hrefs').reset_index(drop=True)


replace_strings = [
    "/study/scriptures/nt/",
    "/study/scriptures/ot/",
    "/study/scriptures/pgp/",
    "/study/scriptures/bofm/",
    "/study/scriptures/dc-testament/"
]
for string in replace_strings:
    swap_df['main_body_hrefs'] = swap_df['main_body_hrefs'].str.replace(string, '')
    

# Creating Ref_Check column.
# Create a list of scripture abbreviations
scripture_abbreviations = {
    'gen', 'ex', 'lev', 'num', 'deut', 'josh', 'judg', 'ruth', '1-sam', '2-sam', '1-kgs', '2-kgs', '1-chr', '2-chr', 'ezra', 'neh', 'esth', 'job', 'ps', 'prov', 'eccl', 'song', 'isa', 'jer', 'lam', 'ezek', 'dan', 'hosea', 'joel', 'amos', 'obad', 'jonah', 'micah', 'nahum', 'hab', 'zeph', 'hag', 'zech', 'mal', 'matt', 'mark', 'luke', 'john', 'acts', 'rom', '1-cor', '2-cor', 'gal', 'eph', 'philip', 'col', '1-thes', '2-thes', '1-tim', '2-tim', 'titus', 'philem', 'heb', 'james', '1-pet', '2-pet', '1-jn', '2-jn', '3-jn', 'jude', 'rev', '1-ne', '2-ne', 'jacob', 'enos', 'jarom', 'omni', 'w-of-m', 'mosiah', 'alma', 'hel', '3-ne', '4-ne', 'morm', 'ether', 'moro', 'dc', 'moses', 'abr', 'js-m', 'js-h', 'a-of-f',
}

# Create a new column to check if the string before the first "/" is in the list of scripture abbreviations
swap_df['ref_check'] = swap_df['main_body_hrefs'].str.split('/').str[0].isin(scripture_abbreviations)

## # ## swap_df.to_csv("C:/Users/theka/Desktop/Projects/Gospel Buddy/conference-talk-hyperlinks-output-2.csv", encoding="utf-8", index=False)

##### # %%
## # ## swap_df.pd.read_csv("C:/Users/theka/Desktop/Projects/Gospel Buddy/conference-talk-hyperlinks-output-2.csv", encoding="utf-8")

refs_df = swap_df.query("ref_check == True")


book_decoder = {
    'gen': 'Genesis',
    'ex': 'Exodus',
    'lev': 'Leviticus',
    'num': 'Numbers',
    'deut': 'Deuteronomy',
    'josh': 'Joshua',
    'judg': 'Judges',
    'ruth': 'Ruth',
    '1-sam': '1 Samuel',
    '2-sam': '2 Samuel',
    '1-kgs': '1 Kings',
    '2-kgs': '2 Kings',
    '1-chr': '1 Chronicles',
    '2-chr': '2 Chronicles',
    'ezra': 'Ezra',
    'neh': 'Nehemiah',
    'esth': 'Esther',
    'job': 'Job',
    'ps': 'Psalm',
    'prov': 'Proverbs',
    'eccl': 'Ecclesiastes',
    'song': 'Song of Solomon',
    'isa': 'Isaiah',
    'jer': 'Jeremiah',
    'lam': 'Lamentations',
    'ezek': 'Ezekiel',
    'dan': 'Daniel',
    'hosea': 'Hosea',
    'joel': 'Joel',
    'amos': 'Amos',
    'obad': 'Obadiah',
    'jonah': 'Jonah',
    'micah': 'Micah',
    'nahum': 'Nahum',
    'hab': 'Habakkuk',
    'zeph': 'Zephaniah',
    'hag': 'Haggai',
    'zech': 'Zechariah',
    'mal': 'Malachi',
    'matt': 'Matthew',
    'mark': 'Mark',
    'luke': 'Luke',
    'john': 'John',
    'acts': 'Acts',
    'rom': 'Romans',
    '1-cor': '1 Corinthians',
    '2-cor': '2 Corinthians',
    'gal': 'Galatians',
    'eph': 'Ephesians',
    'philip': 'Philippians',
    'col': 'Colossians',
    '1-thes': '1 Thessalonians',
    '2-thes': '2 Thessalonians',
    '1-tim': '1 Timothy',
    '2-tim': '2 Timothy',
    'titus': 'Titus',
    'philem': 'Philemon',
    'heb': 'Hebrews',
    'james': 'James',
    '1-pet': '1 Peter',
    '2-pet': '2 Peter',
    '1-jn': '1 John',
    '2-jn': '2 John',
    '3-jn': '3 John',
    'jude': 'Jude',
    'rev': 'Revelation',
    '1-ne': '1 Nephi',
    '2-ne': '2 Nephi',
    'jacob': 'Jacob',
    'enos': 'Enos',
    'jarom': 'Jarom',
    'omni': 'Omni',
    'w-of-m': 'Words of Mormon',
    'mosiah': 'Mosiah',
    'alma': 'Alma',
    'hel': 'Helaman',
    '3-ne': '3 Nephi',
    '4-ne': '4 Nephi',
    'morm': 'Mormon',
    'ether': 'Ether',
    'moro': 'Moroni',
    'dc': 'D&C',
    'moses': 'Moses',
    'abr': 'Abraham',
    'js-m': 'Joseph Smith Matthew',
    'js-h': 'Joseph Smith History',
    'a-of-f': 'Articles of Faith',
}


# Updated function to decode book abbreviation, chapter, and verse
def decode_book_and_reference(href):
    parts = href.split('/')
    book_abbreviation = parts[0]
    book_name = book_decoder.get(book_abbreviation, book_abbreviation.capitalize())  # Lookup long name or capitalize abbreviation
    chapter_and_verse = parts[1].split('?')[0]  # Extract chapter and verse section
    return book_name, chapter_and_verse

# Apply the decoding function to each row and create new columns 'book_name' and 'chapter_and_verse'
refs_df['book_name'], refs_df['chapter_and_verse'] = zip(*refs_df['main_body_hrefs'].apply(decode_book_and_reference))

# Replace '.' with ':' in chapter_and_verse column
refs_df['chapter_and_verse'] = refs_df['chapter_and_verse'].str.replace('.', ':', regex=False)

# Create the "scripture" column by combining "book_name" and "chapter_and_verse" with a space
refs_df['scripture'] = refs_df['book_name'] + ' ' + refs_df['chapter_and_verse']



## # ## refs_df.to_csv("C:/Users/theka/Desktop/Projects/Gospel Buddy/conference-talk-hyperlinks-output-3.csv", encoding="utf-8", index=False)

##### # %%
## # ## refs_df = pd.read_csv("C:/Users/theka/Desktop/Projects/Gospel Buddy/conference-talk-hyperlinks-output-3.csv", encoding="utf-8")

# Create an empty list to store the rows for the new DataFrame
new_rows = []

# Create a tqdm progress bar for the iteration
for _, row in tqdm(refs_df.iterrows(), total=len(refs_df), desc="Processing rows"):
    # Check if the scripture column contains a comma
    if ',' in row['scripture']:
        # Split the scripture by ":" to retain the book and chapter
        book_chapter, verses = row['scripture'].split(':')
        
        # Split the verses by commas
        verses_list = verses.split(',')
        
        # Iterate through each verse in the verses_list
        for verse in verses_list:
            # Create a new dictionary for the row with the modified scripture and chapter information
            new_row = row.to_dict()
            new_row['scripture'] = f"{book_chapter}:{verse}"
            new_row['chapter'] = book_chapter
            
            # Append the new row to the list
            new_rows.append(new_row)
    else:
        # If there's no comma in the scripture, just add the row to the list with the chapter information
        row['chapter'] = row['scripture'].split(':')[0]
        new_rows.append(row.to_dict())

# Create a new DataFrame from the list of rows
new_df = pd.DataFrame(new_rows)

# Create a function to determine the scripture type based on the scripture column
def determine_scripture_type(scripture):
    if ':' not in scripture:
        return 'FULL CHAPTER'
    elif '-' not in scripture:
        return 'SINGLE'
    else:
        return 'SEQUENCE'

# Apply the function to create the new "scripture_type" column
new_df['scripture_type'] = new_df['scripture'].apply(determine_scripture_type)

## # ## new_df.to_csv("C:/Users/theka/Desktop/Projects/Gospel Buddy/conference-talk-hyperlinks-output-4.csv", encoding="utf-8", index=False)

##### # %%
## # ## new_df = pd.read_csv("C:/Users/theka/Desktop/Projects/Gospel Buddy/conference-talk-hyperlinks-output-4.csv", encoding="utf-8")

# Creating a new df for single scriptures
single_df = new_df.query("scripture_type == 'SINGLE'")


sequence_df = new_df.query("scripture_type == 'SEQUENCE'")

sequence_rows = []

# Iterate over each row in the DataFrame
with tqdm(total=len(sequence_df)) as pbar:
    for _, row in sequence_df.iterrows():
        # Split the reference into chapter and verses
        parts = row['scripture'].split(':')
        chapter = parts[0]
        verses_range = parts[1]

        # Check if the verses are a range
        if '-' in verses_range:
            start_verse, end_verse = map(int, verses_range.split('-'))

            # Create new rows for each verse in the range
            for verse in range(start_verse, end_verse + 1):
                sequence_row = row.copy()
                sequence_row['scripture'] = f'{chapter}:{verse}'
                sequence_row['chapter'] = chapter  # Add the chapter column
                sequence_rows.append(sequence_row)
        else:
            # If the verses are not a range, just append the original row
            row['chapter'] = chapter  # Add the chapter column
            sequence_rows.append(row)

        pbar.update(1)  # Update the progress bar

# Create a new DataFrame from the modified rows
pivot_sequence_df = pd.DataFrame(sequence_rows)



# Selecting the required columns from each DataFrame
pivot_sequence_df_selected = pivot_sequence_df[['id', 'year', 'month', 'day', 'session', 'speaker', 'title', 'hyperlink', 'scripture']]
single_df_selected = single_df[['id', 'year', 'month', 'day', 'session', 'speaker', 'title', 'hyperlink', 'scripture']]

# Concatenating the DataFrames
scriptures_df = pd.concat([pivot_sequence_df_selected, single_df_selected], ignore_index=True)

# Rename the columns
scriptures_df = scriptures_df.rename(columns={
    'id': 'talk_id',
    'year': 'talk_year',
    'month': 'talk_month',
    'day': 'talk_day',
    'session': 'talk_session'
})

# Create a new index column called "quote_id"
scriptures_df['quote_id'] = scriptures_df.reset_index().index

# Filter out rows where the value immediately following ":" in the 'scripture' column is not a number
scriptures_df = scriptures_df[scriptures_df['scripture'].str.split(':').str[1].str.isdigit()]


##### # %%
# Loading all conference talk data to merge to scriptures_df.  This will return the text of the talk.
all_talks = pd.read_csv("https://kameronyork.com/datasets/general-conference-talks.csv", encoding="utf-8").filter(items=["id", "text"]).rename(columns={"id": "talk_id", "text": "talk_text"})

# Loading all scritpure verses.  This will return the full text of each verse.
all_verses = pd.read_csv("https://kameronyork.com/datasets/scripture-verses.csv", encoding="utf-8").filter(items=["scripture", "text"]).rename(columns={"text": "scripture_text"})

# Merge scriptures_df and all_talks on 'talk_id'
scriptures_df = pd.merge(scriptures_df, all_talks, on='talk_id', how='left')

# Merge scriptures_df and all_verses on 'scripture'
scriptures_df = pd.merge(scriptures_df, all_verses, on='scripture', how='left')


import re

def calculate_perc_quoted(row):
    # Function to remove punctuation and lower the case
    def preprocess_text(text):
        return re.sub(r'[^\w\s]', '', text).lower().split()

    scripture_words = preprocess_text(row['scripture_text'])
    talk_words = preprocess_text(row['talk_text'])

    # Initialize DP table
    dp = [[0] * (len(talk_words) + 1) for _ in range(len(scripture_words) + 1)]
    max_length, end_index = 0, 0

    # Fill DP table
    for i in range(1, len(scripture_words) + 1):
        for j in range(1, len(talk_words) + 1):
            if scripture_words[i-1] == talk_words[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
                if dp[i][j] > max_length:
                    max_length = dp[i][j]
                    end_index = i
    
    # Calculate percentage quoted
    perc_quoted = (max_length / len(scripture_words)) * 100 if max_length > 0 else 0

    # Simplified rounding logic
    if perc_quoted < 5:
        perc_quoted_rounded = round(perc_quoted)
    else:
        perc_quoted_rounded = round(perc_quoted / 5) * 5

    return perc_quoted_rounded


# Apply the function to each row to create the perc_quoted column
tqdm.pandas()
scriptures_df['perc_quoted'] = scriptures_df.progress_apply(calculate_perc_quoted, axis=1)


##### # %%
# Drop the 'talk_text' and 'scripture_text' columns from the dataframe
scriptures_df.drop(['talk_text', 'scripture_text'], axis=1, inplace=True)

# Define the file path for the JSON file with the short list.  Grouped by scripture with the count of instances.
file_path_short = "../../../datasets/all-footnotes-lookup.json"

# Define the file path for the JSON file with the long list
file_path_long = "../../../datasets/all-footnotes.json"

# Define the file path for the JSON file with the short list of only footnotes from apostles
apostle_path_short = "../../../datasets/apostle-all-footnotes-lookup.json"

# Define the file path for the JSON file with the long list of only footnotes from apostles
apostle_path_long = "../../../datasets/apostle-all-footnotes.json"

# Save the sorted and merged DataFrame as JSON
scriptures_df.to_json(file_path_long, orient='records')

scripture_counts = scriptures_df.groupby('scripture').size().reset_index(name='count')

scripture_counts.to_json(file_path_short, orient='records')

##### # %%
apostle_list = pd.read_csv("https://kameronyork.com/datasets/apostles.csv", encoding="utf-8")

apostle_names = apostle_list[['Name']]

# Define a function to check if the name is in the apostle_names DataFrame
def check_apostle(name):
    if name in apostle_names['Name'].values:
        return 'Apostle'
    else:
        return 'General'

# Apply the function to create a new column
scriptures_df['apostle_check'] = scriptures_df['speaker'].apply(check_apostle)

apostles_scriptures_df = scriptures_df.query("apostle_check == 'Apostle'")

# Save the sorted and merged DataFrame as JSON
apostles_scriptures_df.to_json(apostle_path_long, orient='records')

apostles_scripture_counts = apostles_scriptures_df.groupby('scripture').size().reset_index(name='count')

apostles_scripture_counts.to_json(apostle_path_short, orient='records')

# %%
