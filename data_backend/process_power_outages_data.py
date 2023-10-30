from urllib.request import urlopen
import urllib.parse
from datetime import datetime
import pandas as pd
import geopandas as gpd
import numpy as np
import glob
import csv
import json
from pathlib import Path
from argparse import ArgumentParser
import os
import re

import configs
from utils.filter_df_by_bbox import filter_df_by_bbox
from utils.filter_df_by_bbox_fips import filter_df_by_bbox_fips
from utils.filter_df_by_date import filter_df_by_date
from utils.state_info import fips_to_name


API_KEY = "DirRelief6!uvt64!53"

REQUIRED_COLUMNS_CITY = [
    "CityName",
    "CountyFIPS",
    "CustomersOut",
    "RecordDateTime"
]

REQUIRED_COLUMNS_COUNTY = [
    "CountyFIPS",
    "CustomersOut",
    "RecordDateTime"
]


def s2int(df, column):
    # df[column] = np.floor(pd.to_numeric(df[column], errors='coerce'))
    # df[column] = df[column].astype('Int64')
    df[column] = pd.to_numeric(df[column])


def normalize_columns_and_filter(df, disaster_config):
    '''Normalize column names and filter rows. Works for county and city data,
    from manual dumps or from API'''

    # The power outages API uses different column names than those
    # in the manual data dumps. We normalize them here.
    print(f"---> renaming columns")
    df = df.rename(columns={
        "RecordedDateTime": "RecordDateTime",
        "LastUpdatedDateTime": "RecordDateTime",
        "TrackedCount": "CustomersTracked",
        "OutageCount": "CustomersOut",
    })

    print(f"---> RecordDateTime to_datetime")
    df["RecordDateTime"] = pd.to_datetime(df["RecordDateTime"])

    # Handle strange float formats of downloaded data.
    print(f"---> US_State_FIPS fix")
    if 'US_County_FIPS' in df:
        df["US_State_FIPS"] = df["US_State_FIPS"].astype(float).fillna(0.0).astype(int).astype(str)
        df["US_State_FIPS"] = df["US_State_FIPS"].str.zfill(2)
        df["US_County_FIPS"] = df["US_County_FIPS"].astype(float).fillna(0.0).astype(int).astype(str)
        df["US_County_FIPS"] = df["US_County_FIPS"].str.zfill(3)
        df["CountyFIPS"] = df["US_State_FIPS"] + df["US_County_FIPS"]

    # Zero pad, if necessary
    df['CountyFIPS'] = df['CountyFIPS'].str.zfill(5)

    # Parse strings to ints
    s2int(df, 'CustomersTracked')
    s2int(df, 'CustomersOut')

    # clip to bounding box
    df = filter_df_by_bbox_fips(df, disaster_config, "CountyFIPS")
    if df.empty:
        print("----> No power outage data for bounding box.")

    # clip to disaster start/end date
    df = filter_df_by_date(df, disaster_config, "RecordDateTime")
    if df.empty:
        print("----> No power outage data for time range.")

    # sort by date
    df = df.sort_values(by="RecordDateTime", ignore_index=True)

    return df


def county_timeseries_from_manual_city_data(df):
    '''Aggregates CustomersOut over all cities in a county. We only do
    this if we for some reason have a city data dump but no county data
    to go with it.'''
    return aggregate_customers_out_timeseries(df, aggregate_key="CityName")


def county_timeseries_from_manual_county_data(df):
    '''Aggregates CustomersOut over all utilities in a county. Only
    manually uploaded county data needs to go through this process. Data from
    the county API is already aggregated like this.'''
    return aggregate_customers_out_timeseries(df, aggregate_key="UtilityName")


def aggregate_customers_out_timeseries(df, aggregate_key):
    all_fips_codes = df[["CountyFIPS"]].drop_duplicates()
    all_fips_codes = all_fips_codes["CountyFIPS"].values.tolist()

    # We want to end up with a time series for each county that
    # combines the CustomersOut values from e.g. multiple utilities
    # or multiple places.

    # We iterate once through the entire dataset, keeping track
    # of running totals as we go

    running_totals = {fips: dict() for fips in all_fips_codes}
    rows_out = []

    print(f"---> Building county timeseries")
    for _, row in df.iterrows():
        fips_code = row["CountyFIPS"]
        aggregator = row[aggregate_key]
        record_date_time = row["RecordDateTime"]
        customers_out = row["CustomersOut"]

        # Update the current customers out value in the running totals dict
        county_running_totals = running_totals[fips_code]
        county_running_totals[aggregator] = customers_out

        # Sum the customers out values for all utilities in the county
        county_total_customers_out = sum(county_running_totals.values())

        # Write a new time series data point for the summed
        # customers out for the county
        rows_out.append({
            "CountyFIPS": fips_code,
            "CustomersOut": county_total_customers_out,
            "RecordDateTime": record_date_time
        })

    print(f"---> Converting to data frame")
    df_out = pd.DataFrame(rows_out)
    return df_out


def process_power_outages_data(disaster_input_folder, disaster_config):
    print(f"---> process_power_outages_data for {disaster_input_folder}")
    folder = f"{disaster_input_folder}/power-outages"
    # Manually uploaded data ends in power-outages.csv
    # Data downloaded from the API ends in a timestamp
    files = glob.glob(f"{folder}/*power-outages.csv", recursive=True)
    if files:
        process_manual_data(disaster_input_folder, disaster_config, folder)
    else:
        download_and_process_live_data(disaster_input_folder, disaster_config, folder)


def process_manual_data(disaster_input_folder, disaster_config, folder):
    print(f"---> processing manual data for {folder}")

    out_folder = folder.replace("input/", "output/")
    Path(out_folder).mkdir(parents=True, exist_ok=True)

    # Manual county power outage data must be named county-power-outages.csv
    county_in_path = f"{folder}/county-power-outages.csv"
    county_out_path = f"{out_folder}/county-power-outages.csv"
    if os.path.exists(county_in_path):
        print(f"----> processing county data in {county_in_path}")
        county_df = pd.read_csv(county_in_path, dtype=str)
        county_df = normalize_columns_and_filter(county_df, disaster_config)
        county_df = county_timeseries_from_manual_county_data(county_df)
        print(f"---> saving {county_out_path}")
        county_df.to_csv(county_out_path, index=False)
    else:
        print(f"----> no manual county data in {county_out_path}")

    # Manual city power outage data must be named city-power-outages.csv
    city_in_path = f"{folder}/city-power-outages.csv"
    city_out_path = f"{out_folder}/city-power-outages.csv"
    if os.path.exists(city_in_path):
        print(f"----> processing city data in {city_in_path}")
        city_df = pd.read_csv(city_in_path, dtype=str)
        city_df = normalize_columns_and_filter(city_df, disaster_config)
        print(f"---> checking for required columns")
        city_df = city_df[REQUIRED_COLUMNS_CITY]
        print(f"---> dropping duplicates")
        city_df = city_df.drop_duplicates()
        print(f"---> saving {city_out_path}")
        city_df.to_csv(city_out_path, index=False)

        # Generate county timeseries data from city timeseries data if needed
        if not os.path.exists(county_in_path):
            county_df = county_timeseries_from_manual_city_data(city_df)
            print(f"---> saving {county_out_path}")
            county_df.to_csv(county_out_path, index=False)
    else:
        print(f"----> no manual city data in {city_in_path}")


def download_and_process_live_data(disaster_input_folder, disaster_config, folder):

    def get_fips_for_cities(dfCities, dfCounties):
        dfCities['LastUpdatedDateTime'] = dfCities['LastUpdatedDateTime'].apply(clean_json_dates)
        dfCities['RecordDateTime'] = pd.to_datetime(dfCities['LastUpdatedDateTime'], unit='ms').dt.strftime('%Y-%m-%d %H:%M:%S')
        dfCities = pd.merge(dfCities, dfCounties, how='left', on='CountyId')
        dfCities = dfCities.rename(columns={
            "TrackedCount_x": "CustomersTracked",
            "OutageCount_x": "CustomersOut",
            "RecordedDateTime": "RecordDateTime",
            "LastUpdatedDateTime": "RecordDateTime",
            "TrackedCount": "CustomersTracked",
            "OutageCount": "CustomersOut",
        })
        dfCities = dfCities[dfCities.CityName.notnull()]
        dfCities = dfCities[dfCities.CityName != "Unknown"]
        return dfCities[dfCities.US_County_FIPS.notnull()]

    def clean_json_dates(raw_string):
        if re.search(r'\/Date\((.+?)\)\/', raw_string):
            # Extract the position of beginning of pattern
            start = re.search(r'\/Date\(', raw_string).end()
            end = re.search(r'\)\/', raw_string).start()

            # return the cleaned name
            return raw_string[start:end]

        else:
            # if clean up needed return the same name
            return raw_string

    print("---> no manual input data found for power outages.")

    out_folder = folder.replace("input/", "output/")
    Path(out_folder).mkdir(parents=True, exist_ok=True)

    countyURL = urllib.parse.quote(f"https://poweroutage.us/api/csv/county?key={API_KEY}&IncludeFIPS=true", safe='!:/&?$=')
    print(f"---> downloading county power outage data from {countyURL}.")
    Path(folder).mkdir(parents=True, exist_ok=True)
    dfCounties = pd.read_csv(countyURL)
    dfCounties.to_csv(f"{folder}/county-power-outages-{datetime.now().strftime('%Y.%m.%d-%H.%M.%S')}.csv", index=False)

    cityURL = urllib.parse.quote(f"https://poweroutage.us/api/json_1_4/getcityoutageinfo?key={API_KEY}", safe='!:/&?$=')
    print(f"---> downloading city power outage data from {cityURL}.")
    dfCities = pd.read_json(cityURL)
    dfCities = get_fips_for_cities(dfCities, dfCounties)
    dfCities.to_csv(f"{folder}/city-power-outages-{datetime.now().strftime('%Y.%m.%d-%H.%M.%S')}.csv", index=False)

    county_files = glob.glob(f"{folder}/county-power-outages*.csv", recursive=True)
    print(f"---> concatting frames")
    county_df = pd.concat([pd.read_csv(f, dtype=str) for f in county_files])
    county_df = normalize_columns_and_filter(county_df, disaster_config)
    print(f"---> checking for required columns")
    county_df = county_df[REQUIRED_COLUMNS_COUNTY]
    print(f"---> dropping duplicates")
    county_df = county_df.drop_duplicates()
    county_df.to_csv(f"{out_folder}/county-power-outages.csv", index=False)

    city_files = glob.glob(f"{folder}/city-power-outages*.csv", recursive=True)
    print(f"---> concatting frames")
    city_df = pd.concat([pd.read_csv(f, dtype=str) for f in city_files])
    city_df = normalize_columns_and_filter(city_df, disaster_config)
    print(f"---> checking for required columns")
    city_df = city_df[REQUIRED_COLUMNS_CITY]
    print(f"---> dropping duplicates")
    city_df = city_df.drop_duplicates()
    city_df.to_csv(f"{out_folder}/city-power-outages.csv", index=False)
