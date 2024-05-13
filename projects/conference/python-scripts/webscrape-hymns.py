# %%
import requests
from bs4 import BeautifulSoup
import pandas as pd

# URL of the page to scrape
url = "https://www.churchofjesuschrist.org/study/manual/hymns"

# Send a GET request
response = requests.get(url)

# Check if the request was successful
if response.status_code == 200:
    # Parse the HTML content of the page with BeautifulSoup
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Find the <ul class="doc-map"> element
    ul = soup.find('ul', {'class': 'doc-map'})
    
    # Check if the element was found
    if ul:
        # Extract all <a> tags within this <ul>
        links = ul.find_all('a', href=True)
        
        # Create a list of dictionaries containing the hyperlinks
        data = [{'Title': link.get_text(strip=True), 'URL': link['href']} for link in links]
        
        # Create a pandas DataFrame
        df = pd.DataFrame(data)
        
        # Print the DataFrame
        print(df)
    else:
        print("The specific <ul class='doc-map'> was not found on the page.")
else:
    print("Failed to retrieve the page. Status code:", response.status_code)


import pandas as pd
import requests
from bs4 import BeautifulSoup
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed

# Function to extract hrefs from a given section
def extract_hrefs(url, section_class):
    try:
        full_url = "https://www.churchofjesuschrist.org" + url
        response = requests.get(full_url)
        soup = BeautifulSoup(response.content, 'html.parser')
        section = soup.find('div', class_=section_class)
        if section:
            action_bar = section.find('div', class_='ActionBar')
            if action_bar:
                action_bar.extract()  # Remove the action bar from the section
            hrefs = [a['href'] for a in section.find_all('a', href=True)]
            return hrefs
        else:
            return []
    except Exception as e:
        return []  # Handle exceptions

# Function to handle concurrent requests
def fetch_hrefs(urls, section_class):
    hrefs_dict = {}
    with ThreadPoolExecutor(max_workers=20) as executor:
        # Start the load operations and mark each future with its URL
        future_to_url = {executor.submit(extract_hrefs, url, section_class): url for url in urls}
        for future in tqdm(as_completed(future_to_url), total=len(urls), desc="Processing rows"):
            url = future_to_url[future]
            try:
                hrefs = future.result()
                hrefs_dict[url] = hrefs
            except Exception as e:
                hrefs_dict[url] = []  # Store empty list in case of error
    
    # Sort the results by the original url order
    sorted_hrefs_list = [hrefs_dict[url] for url in urls]
    return sorted_hrefs_list

# Base URL for the hymns
base_url = "https://www.churchofjesuschrist.org"

# Assuming the DataFrame `df` contains the relative URLs under the 'URL' column
urls = df['URL'].tolist()
results = fetch_hrefs(urls, 'contentWrapper-n6Z8K')  # Update 'contentWrapper-n6Z8K' to the actual class of the main content area
df['main_body_hrefs'] = results

# Display or process the DataFrame as needed
print(df.head())


# Ensure there are no empty lists in 'main_body_hrefs'
df = df[df['main_body_hrefs'].apply(lambda x: len(x) > 0)]

# Explode the 'main_body_hrefs' column to make each hyperlink a separate row
df_exploded = df.explode('main_body_hrefs')

# Clean up the scripture references by removing the domain and query parts
replace_strings = [
    "/study/scriptures/nt/", "/study/scriptures/ot/", "/study/scriptures/pgp/", "/study/scriptures/bofm/", "/study/scriptures/dc-testament/"
]
for string in replace_strings:
    df_exploded['main_body_hrefs'] = df_exploded['main_body_hrefs'].str.replace(string, '')

# Decoding scripture references
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

# Decoding function
def decode_scripture(href):
    parts = href.split('?')[0].split('/')
    book = book_decoder.get(parts[0], parts[0].capitalize())
    chapter_verse = parts[1].replace('.', ':')
    return f"{book} {chapter_verse}"

df_exploded['scripture'] = df_exploded['main_body_hrefs'].apply(decode_scripture)






# Updated function to decode book abbreviation, chapter, and verse
def decode_book_and_reference(href):
    parts = href.split('/')
    book_abbreviation = parts[0]
    book_name = book_decoder.get(book_abbreviation, book_abbreviation.capitalize())  # Lookup long name or capitalize abbreviation
    
    if 'id=' in href:  # Check if the new URL structure is present
        # Extract chapter and verse section according to the new format
        chapter_and_verse = parts[1].split('?')[0]  # Extract chapter from URL
        chapter_and_verse += ':'  # Add ":" separator
        chapter_and_verse += href.split('id=')[1].split('&')[0].replace('p', '').replace('-', ',')  # Extract verses from URL
        if '#' in chapter_and_verse:
            chapter_and_verse = chapter_and_verse.split('#')[0]  # Remove everything after "#"
    else:
        # Extract chapter and verse section according to the old format
        chapter_and_verse = parts[1].split('?')[0].replace('.', ':')  # Replace "." with ":"
        
    return book_name, chapter_and_verse

# Apply the decoding function to each row and create new columns 'book_name' and 'chapter_and_verse'
df_exploded['book_name'], df_exploded['chapter_and_verse'] = zip(*df_exploded['main_body_hrefs'].apply(decode_book_and_reference))

# Create the "scripture" column by combining "book_name" and "chapter_and_verse" with a space
df_exploded['scripture'] = df_exploded['book_name'] + ' ' + df_exploded['chapter_and_verse']


# Create an empty list to store the rows for the new DataFrame
new_rows = []

# Create a tqdm progress bar for the iteration
for _, row in tqdm(df_exploded.iterrows(), total=len(df_exploded), desc="Processing rows"):
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

## # ## 
new_df.to_csv("./backups/conference-talk-hyperlinks-output-4.csv", encoding="utf-8", index=False)

##### 
## # ## new_df = pd.read_csv("./backups/conference-talk-hyperlinks-output-4.csv", encoding="utf-8")

# Creating a new df for single scriptures
single_df = new_df.query("scripture_type == 'SINGLE'")


sequence_df = new_df.query("scripture_type == 'SEQUENCE'")

sequence_rows = []

# Iterate over each row in the DataFrame
with tqdm(total=len(sequence_df), desc="Checking for Sequences:") as pbar:
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
pivot_sequence_df_selected = pivot_sequence_df[['Title',	'URL', 'main_body_hrefs', 'scripture', 'book_name', 'chapter_and_verse', 'chapter', 'scripture_type']]
single_df_selected = single_df[['Title',	'URL', 'main_body_hrefs', 'scripture', 'book_name', 'chapter_and_verse', 'chapter', 'scripture_type']]

# Concatenating the DataFrames
scriptures_df = pd.concat([pivot_sequence_df_selected, single_df_selected], ignore_index=True)


# Create a new index column called "quote_id"
scriptures_df['quote_id'] = scriptures_df.reset_index().index

# Filter out rows where the value immediately following ":" in the 'scripture' column is not a number
scriptures_df = scriptures_df[scriptures_df['scripture'].str.split(':').str[1].str.isdigit()]



# %%
scriptures_df.to_csv("./backups/scriptures-inspire-hymns.csv", encoding="UTF-8")

# %%
