# %%
import pandas as pd
from tqdm import tqdm

# Read the CSV file into a DataFrame
df = pd.read_csv("C:/Users/theka/Desktop/Projects/all-sequence.csv", encoding='utf-8')

# Initialize an empty list to store the modified rows
new_rows = []

# Iterate over each row in the DataFrame
with tqdm(total=len(df)) as pbar:
    for index, row in df.iterrows():
        # Split the reference into chapter and verses
        parts = row['Quote'].split(':')
        chapter = parts[0]
        verses_range = parts[1]

        # Check if the verses are a range
        if '–' in verses_range:
            start_verse, end_verse = map(int, verses_range.split('–'))

            # Create new rows for each verse in the range
            for verse in range(start_verse, end_verse + 1):
                new_row = row.copy()
                new_row['Quote'] = f'{chapter}:{verse}'
                new_rows.append(new_row)
        else:
            # If the verses are not a range, just append the original row
            new_rows.append(row)

        pbar.update(1)  # Update the progress bar

# Create a new DataFrame from the modified rows
new_df = pd.DataFrame(new_rows)

# Save the new DataFrame to a new CSV file
new_df.to_csv('output.csv', index=False, encoding='utf-8')


# %%
