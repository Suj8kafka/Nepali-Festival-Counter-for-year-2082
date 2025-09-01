import requests
from bs4 import BeautifulSoup
import csv

# URL of the holidays page on HamroPatro
url = 'https://english.hamropatro.com/nepali-public-holidays'

# Send a GET request to the webpage
response = requests.get(url)

# If the request was successful (status code 200), proceed
if response.status_code == 200:
    # Parse the HTML content of the page
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Find all the tables that contain the holiday information
    tables = soup.find_all('table')

    # List to store holiday data
    holidays = []

    # Loop through each table (there might be multiple for each year or section)
    for table in tables:
        # Loop through each row in the table, skipping the header
        for row in table.find_all('tr')[1:]:
            cells = row.find_all('td')  # Find all columns (cells) in the row
            
            if len(cells) >= 3:  # Check if the row contains valid holiday data
                nepali_date = cells[0].text.strip()  # Nepali date in the first column
                english_date = cells[1].text.strip()  # English date in the second column
                event = cells[2].text.strip()  # Event name in the third column

                # Append the data to the holidays list
                holidays.append({
                    'Nepali Date': nepali_date,
                    'English Date': english_date,
                    'Event': event
                })
    
    # Save the data into a CSV file
    with open('nepali_holidays.csv', 'w', newline='', encoding='utf-8') as file:
        writer = csv.DictWriter(file, fieldnames=['Nepali Date', 'English Date', 'Event'])
        writer.writeheader()  # Write the header row
        writer.writerows(holidays)  # Write all holiday data

    print(f"Successfully scraped and saved {len(holidays)} holidays into 'nepali_holidays.csv'.")

else:
    print(f"Failed to retrieve the webpage. Status code: {response.status_code}")
