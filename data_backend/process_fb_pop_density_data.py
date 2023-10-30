import pandas as pd
import geopandas as gpd
import numpy as np
import glob
import csv
import json
from pathlib import Path

from utils.filter_df_by_bbox import filter_df_by_bbox
from utils.filter_df_by_date import filter_df_by_date

REQUIRED_COLUMNS_IN = [
    "date_time",
    "lon",
    "lat",
    "percent_change",
    "n_baseline",
    "n_crisis",
]

REQUIRED_COLUMNS_OUT = [
    "dt",
    "lon",
    "lat",
    "percent_change",
]

ROUNDING = {
    "percent_change": 2,
    "lon": 6,
    "lat": 6,
}


def process_csv_files(files, out_folder, disaster_config):
    print("---> loading files")
    frames = []
    errors = []
    for file in files:
        try:
            chunksize = 10000
            print(f"---> reading {file} in chunks of {chunksize} rows")
            csv_chunks = pd.read_csv(file, iterator=True, chunksize=chunksize)
            # filter out where rows are all null values
            file_df = pd.concat([c[~(c["percent_change"].isna() & c["n_crisis"].isna() & c["n_baseline"].isna())] for c in csv_chunks])
            print(f"---> after filtering empty rows, {len(file_df)} rows")
            file_df = file_df.rename(columns={
                "longitude": "lon",
                "latitude": "lat",
            })
            frames.append(file_df[REQUIRED_COLUMNS_IN])
        except Exception as e:
            print(f"---> found an error while reading file {file}")
            print(f"-------> error: {e}")
            errors.append(e)
    if len(errors) > 0:
        print("---> stopping because of errors")
        raise ValueError
    df = pd.concat(frames)
    print(f"---> total of {len(df)} rows")
    print(f"---> processing data for {out_folder}")
    df['dt'] = df['date_time'].str.replace(" ", "_").str.replace(":", "")
    df = df.round(ROUNDING)
    df_filter = df.copy()
    df_filter = df_filter[~(
            (df_filter["percent_change"].isna()) & (
                (df_filter["n_crisis"].isna() | df_filter["n_baseline"].isna())
            )
        )]
    print(f"---> {len(df_filter)} rows after ignoring rows where percent_change IS NULL AND (n_crisis IS NULL OR n_baseline IS NULL)")
    # clip to bounding box
    df_filter = filter_df_by_bbox(df_filter, disaster_config, "lat", "lon")
    print(f"---> {len(df_filter)} rows after clipping by bounding box")
    # clip to disaster start/end date
    df_filter["date_time"] = pd.to_datetime(df_filter["date_time"])
    df_filter = filter_df_by_date(df_filter, disaster_config, "date_time")
    print(f"---> {len(df_filter)} rows after clipping by start and end time for disaster")
    # sort by date
    df_filter = df_filter.sort_values(by="date_time")
    # save
    Path(out_folder).mkdir(parents=True, exist_ok=True)
    # ingore values between -10 and 10
    df_clean = df_filter[~(df_filter["percent_change"].between(-10, 10))]
    df_clean[REQUIRED_COLUMNS_OUT].to_csv(f"{out_folder}/data.csv", index=False)
    df_clean[REQUIRED_COLUMNS_OUT].pivot_table(index=['lon', 'lat'], columns='dt', values='percent_change', aggfunc='first').to_csv(f"{out_folder}/data-pivot.csv", index=True)
    return df_filter


def fill_missing_values_in_timeseries(df):
    """
    When n_baseline is NaN, we know it is because it is under 10 persons,
    so we assume n_baseline to be 1 where missing
    """
    print("------> filling missing values in timeseries data")
    dc = df
    dc['is_n_estimated'] = np.where(
        dc['n_baseline'].isna(), True, False
    )
    dc['n_baseline'] = np.where(
        dc['n_baseline'].isna(), 1, dc['n_baseline']
    )
    dc['n_crisis'] = np.where(
        dc['is_n_estimated'] == True,
        (dc['n_baseline'] + (dc['n_baseline'] * (dc['percent_change'] / 100))),
        dc['n_crisis']
    )
    dc['n_estimated'] = dc['n_baseline'] * dc['is_n_estimated']
    return dc


def aggregate_by_poly(points, poly, groupby, name, geoid_zeros, ignore_estimated, out_folder):
    if ignore_estimated == True:
        points = points[points['is_n_estimated'] == False]
    poly_points = gpd.sjoin(points, poly, op='within')
    poly_pop = (
        poly_points.groupby(groupby).agg({
            'n_baseline': 'sum',
            'n_crisis': 'sum',
            'is_n_estimated': 'sum',
            'n_estimated': 'sum',
            'lat': 'count'
        })
        .reset_index()
    )

    # Removing all values where n_baseline and n_crisis are null
    poly_pop = poly_pop[poly_pop['n_baseline'] != 0]

    # Calculating percent change
    poly_pop['percent_change'] = round(((poly_pop['n_crisis'] - poly_pop['n_baseline'])/(poly_pop['n_baseline']))*100, 2)

    poly_pop['n_baseline'] = poly_pop['n_baseline'].round()
    poly_pop['n_crisis'] = poly_pop['n_crisis'].round()

    poly_pop['pct_estimated'] = round(poly_pop['n_estimated'] / poly_pop['n_baseline'], 2)

    poly_pop['GEOID'] = poly_pop['GEOID'].astype(str).str.zfill(geoid_zeros)

    # # filter out low baselines
    # poly_pop = poly_pop[poly_pop['n_baseline'] >= 20]

    cols_to_export = groupby + [
     'n_baseline',
     'n_crisis',
     'percent_change',
     'pct_estimated',
    ]

    Path(out_folder).mkdir(parents=True, exist_ok=True)
    poly_pop[cols_to_export].to_csv(f'{out_folder}/{name}-timeseries.csv', index=False, quoting=csv.QUOTE_NONNUMERIC)
    return poly_pop


def calculate_timeseries(df, out_folder, disaster_config, download_census_data, download_gadm_data):
    print("---> calculating timeseries for admin boundaries")
    fill_missing_values_in_timeseries(df)
    print('------> pct rows estimated', len(df[df.is_n_estimated == True]) / len(df))
    print('------> pct number of pop estimated', df[df.is_n_estimated == True]['n_baseline'].sum() / df['n_baseline'].sum())
    gdf = gpd.GeoDataFrame(
        df, geometry=gpd.points_from_xy(df.lon, df.lat),
        crs='epsg:4326'
    )

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

    aggregate_by_poly(gdf, places, ['GEOID', 'NAME', 'dt'], 'place', 7, True, out_folder)
    aggregate_by_poly(gdf, places, ['GEOID', 'NAME', 'dt'], 'place-estimated', 7, False, out_folder)
    aggregate_by_poly(gdf, counties, ['GEOID', 'NAME', 'dt'], 'county', 5, True, out_folder)
    aggregate_by_poly(gdf, counties, ['GEOID', 'NAME', 'dt'], 'county-estimated', 5, False, out_folder)


def process_fb_pop_density_data(disaster_input_folder, disaster_config, download_census_data, download_gadm_data):
    folders = glob.glob(f"{disaster_input_folder}/facebook/population-density/*")
    print(f"---> found the following scales of data {folders}")
    for folder in folders:
        files = glob.glob(f"{folder}/**/*.csv", recursive=True)
        print(f"---> found the following files {files}")
        if files:
            df = process_csv_files(files, folder.replace("input/", "output/"), disaster_config)
            if len(df) > 0:
                calculate_timeseries(df, folder.replace("input/", "output/"), disaster_config, download_census_data, download_gadm_data)
            else:
                print('------> no data for this scale, passing')
