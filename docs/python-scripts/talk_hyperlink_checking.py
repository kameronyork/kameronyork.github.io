
# %%
import requests
from bs4 import BeautifulSoup
import pandas as pd

# Create an empty DataFrame to store the data
df = pd.DataFrame(columns=["year", "month", "speaker", "title", "hyperlink"])

# Define the DataFrame containing hyperlinks
data = {
    'Hyperlink': [
        'https://www.churchofjesuschrist.org/study/general-conference/2023/10',
        'https://www.churchofjesuschrist.org/study/general-conference/2023/04',
        'https://www.churchofjesuschrist.org/study/general-conference/2022/10',
        'https://www.churchofjesuschrist.org/study/general-conference/2022/04',
        'https://www.churchofjesuschrist.org/study/general-conference/2021/10',
        'https://www.churchofjesuschrist.org/study/general-conference/2021/04',
        'https://www.churchofjesuschrist.org/study/general-conference/2020/10',
        'https://www.churchofjesuschrist.org/study/general-conference/2020/04',
        'https://www.churchofjesuschrist.org/study/general-conference/2019/10',
        'https://www.churchofjesuschrist.org/study/general-conference/2019/04',
        'https://www.churchofjesuschrist.org/study/general-conference/2018/10',
        'https://www.churchofjesuschrist.org/study/general-conference/2018/04',
        'https://www.churchofjesuschrist.org/study/general-conference/2017/10',
        'https://www.churchofjesuschrist.org/study/general-conference/2017/04',
        'https://www.churchofjesuschrist.org/study/general-conference/2016/10',
        'https://www.churchofjesuschrist.org/study/general-conference/2016/04',
        'https://www.churchofjesuschrist.org/study/general-conference/2015/10',
        'https://www.churchofjesuschrist.org/study/general-conference/2015/04',
        'https://www.churchofjesuschrist.org/study/general-conference/2014/10',
        'https://www.churchofjesuschrist.org/study/general-conference/2014/04',
        'https://www.churchofjesuschrist.org/study/general-conference/2013/10',
        'https://www.churchofjesuschrist.org/study/general-conference/2013/04',
        'https://www.churchofjesuschrist.org/study/general-conference/2012/10',
        'https://www.churchofjesuschrist.org/study/general-conference/2012/04',
        'https://www.churchofjesuschrist.org/study/general-conference/2011/10',
        'https://www.churchofjesuschrist.org/study/general-conference/2011/04',
        'https://www.churchofjesuschrist.org/study/general-conference/2010/10',
        'https://www.churchofjesuschrist.org/study/general-conference/2010/04',
        'https://www.churchofjesuschrist.org/study/general-conference/2009/10',
        'https://www.churchofjesuschrist.org/study/general-conference/2009/04',
        'https://www.churchofjesuschrist.org/study/general-conference/2008/10',
        'https://www.churchofjesuschrist.org/study/general-conference/2008/04',
        'https://www.churchofjesuschrist.org/study/general-conference/2007/10',
        'https://www.churchofjesuschrist.org/study/general-conference/2007/04',
        'https://www.churchofjesuschrist.org/study/general-conference/2006/10',
        'https://www.churchofjesuschrist.org/study/general-conference/2006/04',
        'https://www.churchofjesuschrist.org/study/general-conference/2005/10',
        'https://www.churchofjesuschrist.org/study/general-conference/2005/04',
        'https://www.churchofjesuschrist.org/study/general-conference/2004/10',
        'https://www.churchofjesuschrist.org/study/general-conference/2004/04',
        'https://www.churchofjesuschrist.org/study/general-conference/2003/10',
        'https://www.churchofjesuschrist.org/study/general-conference/2003/04',
        'https://www.churchofjesuschrist.org/study/general-conference/2002/10',
        'https://www.churchofjesuschrist.org/study/general-conference/2002/04',
        'https://www.churchofjesuschrist.org/study/general-conference/2001/10',
        'https://www.churchofjesuschrist.org/study/general-conference/2001/04',
        'https://www.churchofjesuschrist.org/study/general-conference/2000/10',
        'https://www.churchofjesuschrist.org/study/general-conference/2000/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1999/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1999/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1998/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1998/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1997/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1997/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1996/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1996/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1995/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1995/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1994/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1994/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1993/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1993/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1992/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1992/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1991/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1991/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1990/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1990/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1989/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1989/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1988/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1988/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1987/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1987/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1986/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1986/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1985/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1985/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1984/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1984/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1983/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1983/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1982/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1982/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1981/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1981/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1980/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1980/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1979/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1979/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1978/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1978/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1977/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1977/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1976/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1976/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1975/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1975/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1974/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1974/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1973/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1973/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1972/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1972/04',
        'https://www.churchofjesuschrist.org/study/general-conference/1971/10',
        'https://www.churchofjesuschrist.org/study/general-conference/1971/04',
    ]
}

# Iterate through the hyperlinks
for url in data['Hyperlink']:
    # Extract year and month from the URL
    url_parts = url.split("/")
    year = url_parts[-2]
    month = url_parts[-1]

    # Send an HTTP GET request to the URL
    response = requests.get(url)

    # Check if the request was successful
    if response.status_code == 200:
        # Parse the HTML content of the page
        soup = BeautifulSoup(response.text, 'html.parser')

        # Find the section containing the table of contents
        table_of_contents = soup.find("section", class_="sidePanel-sfJHO tableOfContentsPanel-qvxa4")

        if table_of_contents:
            # Initialize lists to store the data
            speakers, titles, hyperlinks = [], [], []

            # Find the list of talks within the table of contents
            talk_items = table_of_contents.find_all("a", class_="item-U_5Ca")

            # Extract data for each talk
            for talk_item in talk_items:
                speaker_element = talk_item.find("p", class_="subtitle-LKtQp")
                title_element = talk_item.find("span")
                speaker = speaker_element.text.strip() if speaker_element else "N/A"
                title = title_element.text.strip() if title_element else "N/A"
                hyperlink = "https://www.churchofjesuschrist.org" + talk_item['href']

                # Append the data to the lists
                speakers.append(speaker)
                titles.append(title)
                hyperlinks.append(hyperlink)

            # Create a temporary DataFrame for the current URL
            temp_df = pd.DataFrame({
                "year": year,
                "month": month,
                "speaker": speakers,
                "title": titles,
                "hyperlink": hyperlinks
            })

            # Append the temporary DataFrame to the main DataFrame
            df = pd.concat([df, temp_df], ignore_index=True)

        else:
            print(f"Table of contents not found on the page: {url}")

    else:
        print(f"Failed to retrieve the webpage {url}. Status code: {response.status_code}")

# Print the final DataFrame with data from all hyperlinks
print(df)


# %%
# Save the DataFrame to a CSV file with UTF-8 encoding
df.to_csv('hyperlinks.csv', index=False, encoding='utf-8-sig')

# %%
