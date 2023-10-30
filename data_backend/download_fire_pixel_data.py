import pandas as pd
import numpy as np
import geopandas as gpd
import glob
from pathlib import Path

REQUIRED_COLUMNS = [
    "geometry",
    "date_time",
    "date_time_unix",
    "instrument",
]

API_KEY = ''
DAY_RANGE = '2'
SOURCES = [
    {'name': 'MODIS - Near Real-Time', 'id': 'MODIS_NRT', 'sensor_res_m': 1000},
    {'name': 'VIIRS NOAA-20 - Near Real-Time', 'id': 'VIIRS_NOAA20_NRT', 'sensor_res_m': 375},
    {'name': 'VIIRS S-NPP - Near Real-Time', 'id': 'VIIRS_SNPP_NRT', 'sensor_res_m': 375},
]


def download_fire_pixel_data(disaster_input_folder, disaster_config):
    swLng = disaster_config["swLng"]
    swLat = disaster_config["swLat"]
    neLng = disaster_config["neLng"]
    neLat = disaster_config["neLat"]

    date_start = disaster_config["dateStart"]
    date_end = disaster_config["dateEnd"]
    days_range = pd.date_range(start=date_start, end=date_end, freq='D',
                               inclusive="both").date

    sources_frames = []
    for source in SOURCES:
        urls = [
            f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{API_KEY}/{source['id']}/{swLng},{swLat},{neLng},{neLat}/{DAY_RANGE}/{date}"
            for date in days_range
        ]
        frames = []
        for url in urls:
            print(f"---> downloading data from {url}")
            frames.append(pd.read_csv(url))
        source_df = pd.concat(frames).drop_duplicates()
        source_df['source_id'] = source['id']
        source_df['sensor_res_m'] = source['sensor_res_m']
        sources_frames.append(source_df)

    df = pd.concat(sources_frames)
    print(f"---> a total of {len(df)} points downloaded")
    df = gpd.GeoDataFrame(df, geometry=gpd.points_from_xy(df.longitude, df.latitude))
    df.crs = "epsg:4326"
    df = df.to_crs('epsg:6933')
    df['geometry'] = df.buffer(df['sensor_res_m'], cap_style=3)  # square buffer
    df = df.to_crs('epsg:4326')

    df['date_time'] = df['acq_date'].astype(str) + df['acq_time'].astype(str).str.zfill(4)
    df['date_time'] = pd.to_datetime(df['date_time'], format='%Y-%m-%d%H%M')
    df['date_time_unix'] = pd.to_datetime(df['date_time']).map(pd.Timestamp.timestamp)
    df['date_time'] = df['date_time'].dt.strftime('%Y%m%d%H%M')

    folder = f"{disaster_input_folder}/spatial-data/fire/disaster-pixels"
    out_folder = folder.replace("input/", "output/")
    Path(out_folder).mkdir(parents=True, exist_ok=True)
    file_name = f"{out_folder}/data.geojson"
    print(f"---> saving {file_name}")
    filtered_df = df[REQUIRED_COLUMNS]
    filtered_gdf = gdf = gpd.GeoDataFrame(filtered_df, geometry='geometry')
    filtered_gdf.to_file(file_name, driver='GeoJSON')
