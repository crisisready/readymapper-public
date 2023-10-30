import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
import glob
import csv
from pathlib import Path
import json
import numpy as np 

from utils.filter_df_by_bbox import filter_mobility_df_by_bbox
from utils.filter_df_by_date import filter_df_by_date

REQUIRED_COLUMNS = [
    "ds",
    "date_time",
    "start_lon",
    "start_lat",
    "end_lon",
    "end_lat",
    "percent_change",
    "n_crisis",
    "n_baseline",
    "length_km",
]

ROUNDING = {
    "percent_change": 2,
    "start_lon": 8,
    "start_lat": 8,
    "end_lon": 8,
    "end_lat": 8,
}


def process_csv_files(files, out_folder, disaster_config):
    frames = [pd.read_csv(f) for f in files]
    df = pd.concat(frames)
    print(f"---> number of total mobility flows {len(df)}")
    df = df.round(ROUNDING)
    # account for when data source columns change
    df = df.rename(columns={
        "start_longitude": "start_lon",
        "start_latitude": "start_lat",
        "end_longitude": "end_lon",
        "end_latitude": "end_lat",
    })
    df['dt'] = df['date_time'].str.replace(" ", "_").str.replace(":", "")
    # clip to bounding box
    df = filter_mobility_df_by_bbox(df, disaster_config, "start_lat", "start_lon", "end_lat", "end_lon")
    print(f"---> flows after bounding box filtering: {len(df)}")
    # clip to disaster start/end date
    df["date_time"] = pd.to_datetime(df["date_time"])
    df = filter_df_by_date(df, disaster_config, "date_time")
    print(f"---> flows after date and bounding box filtering: {len(df)}")
    # filter out flows with NaN percent change
    df = df[df["percent_change"].notna()]
    print(f"---> flows after filtering for null percent_change: {len(df)}")
    # filter out flows with zero length_km
    df = df[df["length_km"] > 0]
    print(f"---> flows after filtering for zero length_km: {len(df)}")

    # sort by date
    df = df.sort_values(by="date_time")
    Path(out_folder).mkdir(parents=True, exist_ok=True)
    df[REQUIRED_COLUMNS].to_csv(f"{out_folder}/data.csv", index=False)
    return df


def aggregate_by_poly(df, origin_points, destination_points, poly, name, out_folder):
    
    origin = gpd.sjoin(origin_points, poly, how = 'inner', op='within')
    destination = gpd.sjoin(destination_points, poly, how = 'inner', op='within')
    
    idx_map_origin = dict(zip(origin.id, origin.NAME))
    idx_map_destination = dict(zip(destination.id, destination.NAME))

    df['origin_polygon'] = df['id'].map(idx_map_origin.get)
    df['destination_polygon'] = df['id'].map(idx_map_destination.get)

    #### Fetching GEOID for start polygon
    df = df.merge(origin[['id','GEOID']], on = 'id', how = 'left')

    #### Deleting all points within water
    df = df.dropna()
    
    #### Grouping the columns
    df_grouped = df.groupby(['GEOID','origin_polygon','destination_polygon','ds']).agg({'n_baseline':'sum','n_crisis':'sum'}).reset_index()
    df_grouped['percent_change'] = round(((df_grouped['n_crisis'] - df_grouped['n_baseline'])/(df_grouped['n_baseline']))*100, 2)

    #### Sorting with percent change
    df_grouped = df_grouped.sort_values(by = 'origin_polygon', ascending = False)

    Path(out_folder).mkdir(parents=True, exist_ok=True)
    df_grouped.to_csv(f'{out_folder}/{name}-matrix.csv', index=False, quoting=csv.QUOTE_NONNUMERIC)
    df_dummy = pd.read_csv(f'{out_folder}/{name}-matrix.csv')
    return df_grouped


def calculate_origin_destination_matrix(df, out_folder, disaster_config, download_census_data, download_gadm_data):

    # create a new unique index for the dataframe
    df = df.reset_index(drop=True)

    # create a unique identifier
    df['id'] = np.arange(len(df))

    origin_df = df.copy()
    destination_df = df.copy()

    origin_geometry = [Point(xy) for xy in zip(origin_df.start_lon, origin_df.start_lat)]
    origin_gdf = gpd.GeoDataFrame(origin_df, geometry=origin_geometry, crs='EPSG:4326')

    destination_geometry = [Point(xy) for xy in zip(destination_df.end_lon, destination_df.end_lat)]
    destination_gdf = gpd.GeoDataFrame(destination_df, geometry=destination_geometry, crs='EPSG:4326')

    if 'isInternational' in disaster_config and disaster_config['isInternational'] is True:
        # if user doesn't have gadm data, download it automatically
        # as it is a prerequisite for some of the data processing
        if Path(f'output/gadm').is_dir() is False:
            print('---> seems like you do not have gadm data downloaded, let me get it for you...')
            download_gadm_data()
        counties = gpd.read_file(f'output/gadm/adm_1.geojson')
        places = gpd.read_file(f'output/gadm/adm_2.geojson')
    else:
        vintage = disaster_config['censusVintage']
        # if user doesn't have census data, download it automatically
        # as it is a prerequisite for some of the data processing
        if Path(f'output/census/{vintage}/all').is_dir() is False:
            print('---> seems like you do not have census data downloaded, let me get it for you...')
            download_census_data()
        counties = gpd.read_file(f'output/census/{vintage}/all/acs-counties.geojson')
        places = gpd.read_file(f'output/census/{vintage}/all/acs-places.geojson')

    aggregate_by_poly(df, origin_gdf, destination_gdf, places, 'place', out_folder)
    aggregate_by_poly(df, origin_gdf, destination_gdf, counties, 'county', out_folder)


def process_fb_mobility_data(disaster_input_folder, disaster_config, download_census_data, download_gadm_data):
    folders = glob.glob(f"{disaster_input_folder}/facebook/mobility/*")
    for folder in folders:
        files = glob.glob(f"{folder}/**/*.csv", recursive=True)
        if files:
            print(f"---> processing data for {folder}")
            df = process_csv_files(files, folder.replace("input/", "output/"), disaster_config)
            if len(df) > 0:
                if folder.rsplit('/', 1)[1] == 'tile':
                    calculate_origin_destination_matrix(df, folder.replace("input/", "output/"), disaster_config, download_census_data, download_gadm_data)
            else:
                print('------> no data for this scale, passing')