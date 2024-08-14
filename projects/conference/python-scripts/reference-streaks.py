# %%
import pandas as pd
from datetime import datetime
import itertools

df = pd.read_json("https://kameronyork.com/datasets/all-footnotes-apr-2024.json", encoding="UTF-8")

# %%
df = df[["talk_year", "talk_month", "scripture", "quote_id"]]

# Group by talk_year, talk_month, and scripture and get the count
grouped_df = df.groupby(['talk_year', 'talk_month', 'scripture']).size().reset_index(name='count')

# Step 1: Create a unique list of all scriptures in the current df
unique_scriptures = grouped_df['scripture'].unique()

# Step 2: Generate a unique list of all possible general conferences from 1970 to the most recent conference
start_year = 1970
current_year = datetime.now().year
current_month = datetime.now().month

# Determine the most recent conference
if current_month < 4:
    most_recent_conference_year = current_year - 1
    most_recent_conference_month = 'October'
elif current_month == 4:
    most_recent_conference_year = current_year
    most_recent_conference_month = 'April'
elif current_month < 10:
    most_recent_conference_year = current_year
    most_recent_conference_month = 'April'
else:
    most_recent_conference_year = current_year
    most_recent_conference_month = 'October'

# Generate list of all possible conferences
conferences = []
for year in range(start_year, most_recent_conference_year + 1):
    conferences.append({'year': year, 'month': 'April'})
    if year < most_recent_conference_year or (year == most_recent_conference_year and most_recent_conference_month == 'October'):
        conferences.append({'year': year, 'month': 'October'})

conferences_df = pd.DataFrame(conferences)
conferences_df['conference_id'] = conferences_df.index + 1

# Step 3: Create a matrix of scriptures x conferences
matrix_df = pd.DataFrame(index=unique_scriptures, columns=conferences_df['conference_id'])
matrix_df = matrix_df.fillna(0)  # Initialize with 0s

# Step 4: Populate the matrix with data from `grouped_df`
for _, row in grouped_df.iterrows():
    conference_id = conferences_df[(conferences_df['year'] == row['talk_year']) & (conferences_df['month'] == row['talk_month'])]['conference_id'].values[0]
    matrix_df.at[row['scripture'], conference_id] = 1

# Step 5: Calculate the longest streak of conferences for each scripture
def longest_streak(series):
    return max((sum(1 for _ in group) for key, group in itertools.groupby(series) if key), default=0)

streaks = matrix_df.apply(longest_streak, axis=1)
streaks.name = 'longest_streak'

# Combine the result with the scriptures
result_df = pd.concat([matrix_df, streaks], axis=1)

# Step 6: Calculate the current streak for each scripture
def current_streak(series):
    series = series[::-1]  # Reverse the series to start from the most recent conference
    streak = 0
    for value in series:
        if value == 1:
            streak += 1
        else:
            break
    return streak

current_streaks = matrix_df.apply(current_streak, axis=1)
current_streaks.name = 'current_streak'

# Combine the current streaks with the result dataframe
result_df = pd.concat([result_df, current_streaks], axis=1)

# Step 7: Calculate the total count of conferences where each scripture has been referenced
total_references = matrix_df.sum(axis=1)
total_references.name = 'total_references'

# Combine the total references with the result dataframe
result_df = pd.concat([result_df, total_references], axis=1)


# %%
# Creating the top 10 scriptures based on the longest streak
top_longest_streak = result_df.sort_values(by='longest_streak', ascending=False)
top_longest_streak['rank'] = top_longest_streak['longest_streak'].rank(method='min', ascending=False)
top_longest_streak = top_longest_streak[top_longest_streak['rank'] <= 10]
top_longest_streak = top_longest_streak[["longest_streak", "rank"]]

# Creating the top 10 scriptures based on the current streak
top_current_streak = result_df.sort_values(by='current_streak', ascending=False)
top_current_streak['rank'] = top_current_streak['current_streak'].rank(method='min', ascending=False)
top_current_streak = top_current_streak[top_current_streak['rank'] <= 10]
top_current_streak = top_current_streak[["current_streak", "rank"]]

# Creating the top 10 scriptures based on total references
top_total_references = result_df.sort_values(by='total_references', ascending=False)
top_total_references['rank'] = top_total_references['total_references'].rank(method='min', ascending=False)
top_total_references = top_total_references[top_total_references['rank'] <= 10]
top_total_references = top_total_references[["total_references", "rank"]]

# %%
result_df.to_csv("./backups/testing-matrix.csv", encoding="UTF-8")
# %%
