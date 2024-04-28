# %%
import pandas as pd
import numpy as np

# %%

# Read the dataset into a pandas DataFrame
df = pd.read_json("https://kameronyork.com/datasets/all-footnotes-apr-2024.json", encoding="utf-8")

# %%
all_conferences = [
    "April 2024", "October 2023", "April 2023", "October 2022", "April 2022", "October 2021", "April 2021", "October 2020", "April 2020", "October 2019", "April 2019", "October 2018", "April 2018", "October 2017", "April 2017", "October 2016", "April 2016", "October 2015", "April 2015", "October 2014", "April 2014", "October 2013", "April 2013", "October 2012", "April 2012", "October 2011", "April 2011", "October 2010", "April 2010", "October 2009", "April 2009", "October 2008", "April 2008", "October 2007", "April 2007", "October 2006", "April 2006", "October 2005", "April 2005", "October 2004", "April 2004", "October 2003", "April 2003", "October 2002", "April 2002", "October 2001", "April 2001", "October 2000", "April 2000", "October 1999", "April 1999", "October 1998", "April 1998", "October 1997", "April 1997", "October 1996", "April 1996", "October 1995", "April 1995", "October 1994", "April 1994", "October 1993", "April 1993", "October 1992", "April 1992", "October 1991", "April 1991", "October 1990", "April 1990", "October 1989", "April 1989", "October 1988", "April 1988", "October 1987", "April 1987", "October 1986", "April 1986", "October 1985", "April 1985", "October 1984", "April 1984", "October 1983", "April 1983", "October 1982", "April 1982", "October 1981", "April 1981", "October 1980", "April 1980", "October 1979", "April 1979", "October 1978", "April 1978", "October 1977", "April 1977", "October 1976", "April 1976", "October 1975", "April 1975", "October 1974", "April 1974", "October 1973", "April 1973", "October 1972", "April 1972", "October 1971", "April 1971"
]

# Create a DataFrame from the list
df_conferences = pd.DataFrame(all_conferences, columns=["Conference Date"])

# Add an explicit index column
df_conferences['Index'] = range(1, len(df_conferences) + 1)

# Reorder the DataFrame to have the index column first
df_conferences = df_conferences[['Index', 'Conference Date']]


# %%

# Example sorting of df_conferences if needed
df_conferences = df_conferences.sort_values(by='Index', ascending=False)

# Convert 'talk_year' to string and create a unique conference identifier
df['conference_id'] = df['talk_month'] + " " + df['talk_year'].astype(str)

# Merge df with df_conferences to align scripture quotes with indexed conference dates
df_merged = df.merge(df_conferences, left_on='conference_id', right_on='Conference Date', how='left')

# Sort df_merged by Index to ensure the order is maintained for pivoting
df_merged = df_merged.sort_values(by='Index', ascending=False)

# Add a column to indicate quoting (used for aggregation)
df_merged['quoted'] = 1

# Pivot table to show if a scripture is quoted in each conference
pivot_table = pd.pivot_table(df_merged, values='quoted', index='scripture', columns='Conference Date', aggfunc='sum', fill_value=0)

# Since the 'Conference Date' columns might not be in the perfect sequential order, reorder them
ordered_dates = df_conferences['Conference Date'].tolist()
pivot_table = pivot_table.reindex(columns=ordered_dates)

# %% 

pivot_table.to_csv("./testing_pivot.csv", encoding="UTF-8")


# %%

def calculate_streaks(dataframe):
    # Initialize dictionaries to store the streaks
    current_streaks = {}
    max_streaks = {}
    
    # Iterate through each row (scripture)
    for scripture, row in dataframe.iterrows():
        max_count = 0
        current_count = 0
        max_streak = 0
        current_streak = 0
        
        # Reverse iteration for current streak (starts from the most recent)
        reversed_row = list(reversed(row))
        for i in reversed_row:
            if i > 0:
                current_count += 1
                current_streak = max(current_streak, current_count)
            else:
                break
        
        # Forward iteration for maximum streak
        for i in row:
            if i > 0:
                max_count += 1
                max_streak = max(max_streak, max_count)
            else:
                max_count = 0

        # Save the streaks
        current_streaks[scripture] = current_streak if current_streak > 1 else 0
        max_streaks[scripture] = max_streak if max_streak > 1 else 0
    
    # Create DataFrame from dictionaries
    streaks_df = pd.DataFrame({
        "Scripture": list(current_streaks.keys()),
        "Current Conference Streak": list(current_streaks.values()),
        "Max Streak": list(max_streaks.values())
    })
    streaks_df.set_index('Scripture', inplace=True)
    return streaks_df

# Apply the function to calculate streaks
streaks_df = calculate_streaks(pivot_table.iloc[:, :-1])  # Exclude any non-relevant columns
streaks_df

# %%
streaks_df.to_csv("./testing_streaks.csv", encoding="UTF-8")


# %%
