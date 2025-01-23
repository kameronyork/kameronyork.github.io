# %%
import requests
import pandas as pd
from datetime import datetime

# Step 1: Get the authentication token
auth_url = "https://api.thomsonreuters.com/gofileroom/api/v1/user/login"

auth_data = {
    "LoginName": "analytics@coopernorman.com",
    "Password": "CNAPIaccess<3",
    "Language": "en",
    "Capcha": "",
    "CapchaType": 0
}

# Headers for the token request
auth_headers = {
    "X-TR-API-APP-ID": "2y7Al06dtoQutiIXbyg3AA3OnHKGIOB6",
    "Content-Type": "application/x-www-form-urlencoded"
}

# Request to get the access token
auth_response = requests.post(auth_url, headers=auth_headers, data=auth_data)



# Check if the authentication was successful
if auth_response.status_code == 200:
    auth_token = auth_response.json().get("token")
    print(f"Access token retrieved successfully! {auth_token}")

    # URL for the FirmFlow report API
    report_url = "https://api.thomsonreuters.com/gofileroom/api/v2/firmflowreports/TrackingReportByWorkFlow"

    # Headers including the retrieved access token
    report_headers = {
        "X-TR-API-APP-ID": "2y7Al06dtoQutiIXbyg3AA3OnHKGIOB6",
        "Authorization": f"Basic {auth_token}",
        "Content-Type": "application/json"
    }

    # Initialize an empty DataFrame to hold the results
    all_data = pd.DataFrame()

    # First request to get initial report and pagination info
    report_data = {
        "DrawerID": "0000000001",
        "PageNumber": 1  # Start with page 1
    }

    report_response = requests.post(report_url, headers=report_headers, json=report_data)

    if report_response.status_code == 200:
        print("FirmFlow Report Request Successful!")
        report_json = report_response.json()

        # Extract pagination information
        total_records = report_json.get('totalRecords')
        page_number = report_json.get('pageNumber')
        page_size = report_json.get('pageSize')
        total_pages = report_json.get('totalPages')

        print(f"Total Records: {total_records}")
        print(f"Page Number: {page_number}")
        print(f"Page Size: {page_size}")
        print(f"Total Pages: {total_pages}")

        # Process the first page of data
        firmflow_data = report_json.get('firmFlowReportResponse', [])
        df = pd.DataFrame(firmflow_data)
        all_data = pd.concat([all_data, df], ignore_index=True)

        # Loop through the remaining pages and request data
        for page in range(2, total_pages + 1):
            print(f"Requesting page {page} of {total_pages}...")
            report_data['PageNumber'] = page
            report_response = requests.post(report_url, headers=report_headers, json=report_data)

            if report_response.status_code == 200:
                report_json = report_response.json()
                firmflow_data = report_json.get('firmFlowReportResponse', [])
                df = pd.DataFrame(firmflow_data)

                # Concatenate the data from each page into the main DataFrame
                all_data = pd.concat([all_data, df], ignore_index=True)
            else:
                print(f"Failed to retrieve page {page}. Status code: {report_response.status_code}")
                break

        # Final DataFrame with all pages of data
        print(f"Full DataFrame created with {len(all_data)} rows and {len(all_data.columns)} columns.")
        print(all_data.head())  # Show the first few rows of the full DataFrame

    else:
        print(f"Failed to retrieve report. Status code: {report_response.status_code}")
        print(report_response.text)  # Error message or details
else:
    print(f"Authentication failed. Status code: {auth_response.status_code}")
    print(auth_response.text)  # Error message or details


from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm
import time

# Function to get routing history for a given filing ID
def get_routing_history(filing_id, auth_token):
    url = f"https://api.thomsonreuters.com/gofileroom/firmflow/api/V1/Workflow/RoutingHistory"
    headers = {
        "X-TR-API-APP-ID": "2y7Al06dtoQutiIXbyg3AA3OnHKGIOB6",  # API key
        "Authorization": f"Basic {auth_token}"
    }
    params = {
        "filingId": filing_id
    }
    
    try:
        response = requests.get(url, headers=headers, params=params)
        if response.status_code == 200:
            return response.json()  # Return the routing history for the filing ID
        else:
            print(f"Failed to retrieve data for Filing ID {filing_id}. Status code: {response.status_code}")
            return None
    except Exception as e:
        print(f"Error occurred for Filing ID {filing_id}: {e}")
        return None

# Get the current year and previous year as strings
current_year = str(datetime.now().year)
previous_year = str(datetime.now().year - 1)

# Filter the DataFrame to include rows where 'year' is either the current year or the previous year
filtered_data = all_data[all_data['year'].isin([current_year, previous_year])]

# Step 2: Get unique filing IDs from the filtered data
unique_filing_ids = filtered_data['filingID'].unique()

# Number of concurrent threads and batch size
MAX_WORKERS = 20  # Number of concurrent threads (adjust based on API and system capacity)
BATCH_SIZE = 100  # Number of filing IDs per batch

# Function to process a batch of filing IDs
def process_batch(filing_ids_batch, auth_token):
    results = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(get_routing_history, filing_id, auth_token): filing_id for filing_id in filing_ids_batch}
        
        # As futures complete, aggregate the results with a progress bar
        for future in tqdm(as_completed(futures), total=len(futures), desc="Processing Filing IDs"):
            filing_id = futures[future]
            try:
                result = future.result()
                if result:
                    results.append(result)
            except Exception as e:
                print(f"Error processing Filing ID {filing_id}: {e}")
    return results

# Step 3: Iterate through filing IDs in batches
def process_filing_ids_in_batches(filing_ids, auth_token, batch_size):
    all_results = []
    total_batches = len(filing_ids) // batch_size + (1 if len(filing_ids) % batch_size > 0 else 0)
    
    for i in range(0, len(filing_ids), batch_size):
        filing_ids_batch = filing_ids[i:i + batch_size]
        print(f"Processing batch {i // batch_size + 1} of {total_batches}...")
        
        batch_results = process_batch(filing_ids_batch, auth_token)
        all_results.extend(batch_results)

        # Introduce a small delay between batches to avoid overwhelming the server (adjust if needed)
        time.sleep(2)

    return all_results

# Process all filing IDs in batches and collect the results
print(f"Processing {len(unique_filing_ids)} filing IDs in batches with {BATCH_SIZE} per batch...")

all_routing_history = process_filing_ids_in_batches(unique_filing_ids, auth_token, BATCH_SIZE)

# Step 4: Convert the collected routing history into a pandas DataFrame
routing_history_df = pd.DataFrame(all_routing_history)

# Display the full DataFrame with all routing history details
print(f"Routing history data collected for {len(routing_history_df)} records.")
print(routing_history_df.head())

# %%
