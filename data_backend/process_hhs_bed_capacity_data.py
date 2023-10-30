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
import os

import configs
from utils.filter_df_by_bbox import filter_df_by_bbox
from utils.filter_df_by_date import filter_df_by_date

REQUIRED_COLUMNS = [
    "collection_week",
    "state",
    "hospital_name",
    "address",
    "city",
    "zip",
    "hospital_subtype",
    "hospital_general_type",
    "fips_code",
    "geocoded_hospital_address_lng",
    "geocoded_hospital_address_lat",
    "total_beds_7_day_avg",
    "inpatient_beds_7_day_avg",
    "inpatient_beds_used_7_day_avg",
]

ROUNDING = {
    "geocoded_hospital_address.coordinates.0": 6,
    "geocoded_hospital_address.coordinates.1": 6,
}

FACILITY_TYPES = [
  { "subtype": "Critical Access Hospitals", "general_type": "Acute Care Hospitals" },
  { "subtype": "Childrens Hospitals", "general_type": "Complex Evacuation Needs" },
  { "subtype": "Long Term", "general_type": "Complex Evacuation Needs" },
  { "subtype": "Short Term", "general_type": "Outpatient Services" },
  { "subtype": "Non Reporting", "general_type": "Non-Reporting" },
]


def s2int(df, column):
    # df[column] = np.floor(pd.to_numeric(df[column], errors='coerce'))
    # df[column] = df[column].astype('Int64')
    df[column] = pd.to_numeric(df[column])


def process_data(df, out_folder, disaster_config):
    print(f"---> processing data")
    df = df.round(ROUNDING)
    df["collection_week"] = pd.to_datetime(df["collection_week"])
    # Parse strings to ints
    s2int(df,'total_beds_7_day_avg')
    s2int(df,'inpatient_beds_7_day_avg')
    s2int(df,'inpatient_beds_used_7_day_avg')
    for index, row in df.iterrows():
        # Flatten long, lat
        df.at[index, "geocoded_hospital_address_lng"] = row["geocoded_hospital_address"]["coordinates"][0]
        df.at[index, "geocoded_hospital_address_lat"] = row["geocoded_hospital_address"]["coordinates"][1]
        # Hospital types
        subtype = row['hospital_subtype']
        general_type = [ mapping["general_type"] for mapping in FACILITY_TYPES if mapping["subtype"] == subtype ][0]
        df.at[index, "hospital_general_type"] = general_type
    # clip to bounding box
    df = filter_df_by_bbox(df, disaster_config, "geocoded_hospital_address_lat", "geocoded_hospital_address_lng")
    # clip to disaster start/end date
    df = filter_df_by_date(df, disaster_config, "collection_week")
    # sort by date
    df = df.sort_values(by="collection_week")
    # save
    Path(out_folder).mkdir(parents=True, exist_ok=True)
    df[REQUIRED_COLUMNS].to_csv(f"{out_folder}/data.csv", index=False)
    return df


def process_hhs_bed_capacity_data(disaster_input_folder, disaster_config):
    url = urllib.parse.quote(f"https://healthdata.gov/resource/anag-cw7u.json?$query=SELECT * WHERE within_box(geocoded_hospital_address, {disaster_config['neLat']}, {disaster_config['swLng']}, {disaster_config['swLat']}, {disaster_config['neLng']}) AND collection_week BETWEEN '{datetime.strptime(disaster_config['dateStart'],'%Y-%m-%d %H:%M').isoformat()}' AND '{datetime.strptime(disaster_config['dateEnd'],'%Y-%m-%d %H:%M').isoformat()}' ORDER BY collection_week DESC LIMIT 5000", safe=':/?$=')
    print(f"---> Fetching {url}")
    df = pd.read_json(url)
    if len(df) > 0:
        folder = f"{disaster_input_folder}/hhs-bed-capacity"
        df = process_data(df, folder.replace("input/", "output/"), disaster_config)
    else:
        print("---> no HHS data found for the period")
