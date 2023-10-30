import numpy as np
import pandas as pd
from pathlib import Path

NURSING_HOMES_URL = "https://opendata.arcgis.com/api/v3/datasets/78c58035fb3942ba82af991bb4476f13_0/downloads/data?format=csv&spatialRefId=4326&where=1%3D1"
HOSPITALS_URL = "https://opendata.arcgis.com/api/v3/datasets/6ac5e325468c4cb9b905f1728d6fbf0f_0/downloads/data?format=csv&spatialRefId=4326&where=1%3D1"

REQUIRED_COLUMNS = [
    "NAME",
    "ADDRESS",
    "CITY",
    "STATE",
    "STATUS",
    "COUNTYFIPS",
    "LATITUDE",
    "LONGITUDE",
    "SOURCEDATE",
    "BEDS",
    "TYPE",
    "source_type",  # we create this one
]

NUMERIC_COLUMNS = [
    "LATITUDE",
    "LONGITUDE",
    "BEDS",
]

ROUNDING = {
}

FACILITY_TYPES = [
]


def get_and_process_data(url, facility_type):
    print(f"---> fetching {facility_type} data from {url}")
    df = pd.read_csv(url)
    print(f"---> found {len(df)} rows")
    print(f"---> processing data")
    df = df.round(ROUNDING)
    df = df[df["STATUS"] == "OPEN"]
    print(f"---> filtered {len(df)} rows as OPEN facilities")
    df["source_type"] = facility_type
    for col in NUMERIC_COLUMNS:
        df[col] = pd.to_numeric(df[col])
    # set the -999 beds values to null
    df["BEDS"] = np.where(df["BEDS"] == -999, None, df["BEDS"])
    return df


def save_data(df):
    # save
    out_folder = "output/hifld"
    Path(out_folder).mkdir(parents=True, exist_ok=True)
    file_name = f"{out_folder}/data.csv"
    print(f"---> saving as {file_name}, total of {len(df)} facilities")
    df = df[REQUIRED_COLUMNS]
    df.columns = [x.lower() for x in df.columns]  # lowercase columns
    df.to_csv(file_name, index=False)


def process_hifld_healthcare_facilities():
    print(f"---> processing HIFLD healthcare facilities data")
    df_nursing = get_and_process_data(NURSING_HOMES_URL, 'nursing')
    df_hospitals = get_and_process_data(HOSPITALS_URL, 'hospitals')
    df_all = pd.concat([df_nursing, df_hospitals])
    print("---> facility count by type")
    print(df_all.groupby(["source_type", "TYPE"]).size())
    save_data(df_all)
