import inquirer
import requests
from bs4 import BeautifulSoup
from pathlib import Path
import pandas as pd
import re

BASE_URL = 'https://www.nhc.noaa.gov/gis'


def download_and_save_file(url, file_name):
    print(f'---> downloading {url}')
    try:
        r = requests.get(url, stream=True)
        with open(file_name, 'wb') as fd:
            for chunk in r.iter_content(chunk_size=128):
                fd.write(chunk)
    except Exception as e:
        print(f'!!! ---> error downloading {url}')


def get_and_parse_url(url):
    print(f'---> scraping {url}')
    page = requests.get(url)
    return BeautifulSoup(page.content, "html.parser")


def scrape_links_from_page_and_download(url, text_to_search, out_folder, disaster_input_folder):
    html = get_and_parse_url(url)
    links = html.find_all("a", href=True)
    links = [l for l in links if text_to_search in l.text]
    hrefs = [f"{BASE_URL}/{l['href']}" for l in links]
    print(f'---> found these links to download')
    print(f'---> {hrefs}')
    folder = f'{disaster_input_folder}/{out_folder}'
    Path(folder).mkdir(parents=True, exist_ok=True)
    for link in links:
        url = f"{BASE_URL}/{link['href']}"
        download_and_save_file(url, f'{folder}/{link.text}')


def scrape_links_from_page_and_download_wind_probabilities(url, text_to_search, out_folder, disaster_input_folder, dates):
    # specific for wind probabilities, file names follow a different pattern
    # where you need to search for the disaster dates, otherwise
    # you get data for the entire year
    html = get_and_parse_url(url)
    links = html.find_all("a", href=True)
    links = [l for l in links if text_to_search in l.text]
    if isinstance(dates, list):
        # get only for disaster dates
        links = [l for l in links if l.text[:8] in dates]
    hrefs = [f"{BASE_URL}/{l['href']}" for l in links]
    print(f'---> found these links to download')
    print(f'---> {hrefs}')
    folder = f'{disaster_input_folder}/{out_folder}'
    Path(folder).mkdir(parents=True, exist_ok=True)
    for link in links:
        url = f"{BASE_URL}/{link['href']}"
        download_and_save_file(url, f'{folder}/{link.text}')


def download_advisory_data(disaster_input_folder, disaster_config, storm_id, disaster_year):
    print('---> getting advisory data from https://www.nhc.noaa.gov/gis/archive_forecast.php')
    url = f'https://www.nhc.noaa.gov/gis/archive_forecast_results.php?id={storm_id}&year={disaster_year}'
    scrape_links_from_page_and_download(url, '.zip', 'noaa-5day-advisories', disaster_input_folder)


def download_flood_warnings_data(disaster_input_folder, disaster_config, storm_id, disaster_year):
    print('---> getting flood data from https://www.nhc.noaa.gov/gis/archive_wsurge.php')
    url = f'https://www.nhc.noaa.gov/gis/archive_wsurge_results.php?id={storm_id}&year={disaster_year}'
    scrape_links_from_page_and_download(url, 'WatchWarningSS', 'noaa-flood-warnings', disaster_input_folder)


def download_wind_radii_data(disaster_input_folder, disaster_config, storm_id, disaster_year):
    print('---> getting wind radii data from https://www.nhc.noaa.gov/gis/archive_forecast_info.php')
    url = f'https://www.nhc.noaa.gov/gis/archive_forecast_info_results.php?id={storm_id}&year={disaster_year}'
    scrape_links_from_page_and_download(url, '.zip', 'noaa-wind-radii', disaster_input_folder)


def download_wind_probabilities_data(disaster_input_folder, disaster_config, storm_id, disaster_year):
    print('---> getting wind probabilities data from https://www.nhc.noaa.gov/gis/archive_wsp.php')
    url = f'https://www.nhc.noaa.gov/gis/archive_wsp.php?year={disaster_year}'

    date_start = disaster_config["dateStart"]
    date_end = disaster_config["dateEnd"]
    days_range = pd.date_range(start=date_start, end=date_end, freq='D',
                               inclusive="both").date
    dates = [date.strftime('%Y%m%d') for date in days_range]
    scrape_links_from_page_and_download_wind_probabilities(url, '_wsp_120hr5km.zip', 'noaa-wind-probabilities', disaster_input_folder, dates)


def download_hurricane_data(disaster_input_folder, disaster_config):
    storm_id = disaster_config['nhcStormId']
    print(f'---> NHC storm ID is: {storm_id}')
    date_start = disaster_config["dateStart"]
    date_end = disaster_config["dateEnd"]
    days_range = pd.date_range(start=date_start, end=date_end, freq='D',
                               inclusive="both").date
    disaster_years = list(set([date.strftime('%Y') for date in days_range]))
    print(f'---> disaster spans the following year(s): {disaster_years}')
    for disaster_year in disaster_years:
        download_advisory_data(disaster_input_folder, disaster_config, storm_id, disaster_year)
        download_flood_warnings_data(disaster_input_folder, disaster_config, storm_id, disaster_year)
        download_wind_radii_data(disaster_input_folder, disaster_config, storm_id, disaster_year)
        download_wind_probabilities_data(disaster_input_folder, disaster_config, storm_id, disaster_year)
