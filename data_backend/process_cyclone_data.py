import geopandas as gpd
import pandas as pd
import glob
import os
import shutil
import json
from argparse import ArgumentParser
from utils.smooth_polygon_corners import smooth_coords
from shapely.geometry import Polygon, Point
from shapely.ops import unary_union
import alphashape
from zipfile import ZipFile
import fiona
import re
import numpy as np

import configs


def process_cyclone_data(disaster_input_folder, disaster_config):
    if disaster_config['type'] != 'cyclone':
        print(f"---> {disaster_input_folder} is not a cyclone. Skipping.")
        return

    out_folder = f"{disaster_input_folder.replace('input/', 'output/')}/pdc/"

    # flush output directory
    try:
        shutil.rmtree(out_folder)
    except Exception as e:
        pass
    os.makedirs(out_folder, exist_ok=True)

    process_tracks(f"{disaster_input_folder}/spatial-data/pdc-storm-positions/", out_folder, disaster_config)
    process_cones(f"{disaster_input_folder}/spatial-data/pdc-5-day-uncertainty/", out_folder, disaster_config)
    #process_wind_probabilities(f"{disaster_input_folder}/noaa-wind-probabilities/", out_folder, disaster_config)
    process_wind_radii(f"{disaster_input_folder}/spatial-data/pdc-wind-radii/", out_folder, disaster_config)
    #process_flood_warnings(f"{disaster_input_folder}/noaa-flood-warnings/", out_folder, disaster_config)


def find_realtime_rad(gdf):
    day = gdf['dayhr'].str[0:2].astype('int').values
    hr = gdf['dayhr'].str[2:4].astype('int').values

    if len(np.unique(day)) == 1:
        min_hr = str(min(hr))
        if len(min_hr) == 1:
            min_hr = '0' + min_hr
        str_day = str(np.unique(day)[0])
        if len(str_day) == 1:
            str_day = '0' + str_day
        
        earliest_dayhr = str_day + min_hr + "Z"
    else:
        min_day = str(min(day))
        if len(min_day) == 1:
            min_day = '0' + min_day
        idx_minday = np.argmin(day)
        str_hr = str(hr[idx_minday])
        if len(str_hr) == 1:
            str_hr = '0' + str_hr
        earliest_dayhr = min_day + str_hr + "Z"
        
    return earliest_dayhr
    

def process_wind_radii(in_folder, out_folder, disaster_config):
    required_columns = [
        'rad_wind_kt',
        'advisory_number',
        'geometry'
    ]
    final_col_names = [
        "RADII",
        "ADVNUM",
        "geometry"
    ]

    in_files = glob.glob(f"{in_folder}/*.geojson")
    print(f"---> processing wind radii for {in_folder}")
    if in_files:
        out_file = f"{out_folder}/cyclone-wind-radii.geojson"
        radii = []
        for in_file in in_files:
            try:
                print(f"---> processing {os.path.basename(in_file)}...")

                # read in geojson as geoDataframe
                gdf = gpd.read_file(in_file)
                # we only care about the highest wind-radii
                desired_radii = [64.0]
                gdf = gdf[gdf["rad_wind_kt"].isin(desired_radii)]
                try:
                    earliest_dayhr = find_realtime_rad(gdf)
                    gdf = gdf[gdf['dayhr'] == earliest_dayhr]
                except:
                    pass
                gdf = gdf.reset_index(drop=True)

                gdf = gdf[required_columns]
                
                # rename columns to match NOAA naming 
                gdf = gdf.rename(columns=dict(zip(required_columns, final_col_names)))

                gdf = gdf.to_crs('epsg:4326')
                radii.append(gdf)
            except Exception as e:
                print(f"---> error processing {in_file}")
                print(f"---> error: {e}")

        try:
            concat_radii = pd.concat(radii, ignore_index=True)
        # if only single dataset
        except ValueError:
            concat_radii = radii
        
        all_radii = gpd.GeoDataFrame(
            concat_radii,
            crs='epsg:4326'
        )
        all_radii.to_file(out_file, driver='GeoJSON')
    else:
        print(f"---> no files found for {in_folder}")


def process_tracks(in_folder, out_folder, disaster_config):
    required_columns = [
        'advisory_number',
        'wind_speed_kph',
        'geometry'
    ]

    in_files = glob.glob(f"{in_folder}/*.geojson")
    print(f"---> processing tracks for {in_folder}")
    if in_files:
        out_file = f"{out_folder}/cyclone-tracks.geojson"
        tracks = []
        for in_file in in_files:
            final_col_names = [
                            'ADVISNUM',
                            'MAXWIND',
                            'geometry'
                        ]
            try:
                print(f"---> processing {os.path.basename(in_file)}...")

                # forecast hurricane tracks
                forecast_track_gdf = gpd.read_file(in_file)
                # rename columns to match NOAA naming 
                forecast_track_gdf = forecast_track_gdf.rename(columns=
                                                               dict(zip(required_columns, final_col_names)))

                # covert date/time to same format used in NOAA for processing in hurricane-tracks.js
                adv_time = forecast_track_gdf['advisory_time'].str[:2]
                adv_datetime = forecast_track_gdf['advisory_date'] + pd.Series(adv_time)
                adv_datetime = pd.to_datetime(adv_datetime, format="%d-%b-%Y%H", utc=True)
                forecast_track_gdf['ADVDATE'] = adv_datetime
                
                # select only desired fields
                final_col_names.append('ADVDATE')
                forecast_track_gdf = forecast_track_gdf[final_col_names]
                forecast_track_gdf['ADVISNUM'] = forecast_track_gdf['ADVISNUM'].astype('str')

                forecast_track_gdf = forecast_track_gdf.to_crs('epsg:4326')
                tracks.append(forecast_track_gdf)
            except Exception as e:
                print(f"---> error processing {in_file}")
                print(f"---> error: {e}")

        try:
            concat_tracks = pd.concat(tracks, ignore_index=True)
        # if only single dataset
        except ValueError:
            concat_tracks = tracks

        all_tracks = gpd.GeoDataFrame(
            concat_tracks,
            crs='epsg:4326'
        )

        all_tracks.to_file(out_file, driver='GeoJSON')
    else:
        print(f"---> no files found for {in_folder}")

def process_cones(in_folder, out_folder, disaster_config):
    required_columns = [
        "STORMNAME",
        "ADVISNUM",
        "ADVDATE",
        "STORMNUM",
        "geometry"
    ]

    in_files = glob.glob(f"{in_folder}/*.geojson")
    print(f"---> processing cone of uncertainty for {in_folder}")
    if in_files:
        out_file = f"{out_folder}/cyclone-5-day-uncertainty.geojson"
        cones = []
        for in_file in in_files:
            try:
                print(f"---> processing {os.path.basename(in_file)}...")
                # read in geojson as geoDataframe
                gdf = gpd.read_file(in_file)
                date_str = os.path.basename(in_file).split("_")[0][3:]
                adv_datetime = pd.to_datetime(date_str, format="%d%m%Y", utc=True)
                gdf['ADVDATE'] = adv_datetime
                gdf = gdf.reset_index(drop=True)
                gdf = gdf.rename(columns={'storm_name':'STORMNAME','advisory_number':'ADVISNUM','hazard_id':'STORMNUM'})
                gdf = gdf[required_columns]
                gdf = gdf.to_crs('epsg:4326')
                cones.append(gdf)
            except Exception as e:
                print(f"---> error processing {in_file}")
                print(f"---> error: {e}")
        
        
        
        try:
            concat_cones = pd.concat(cones, ignore_index=True)
        # if only single dataset
        except ValueError:
            concat_cones = cones
        all_cones = gpd.GeoDataFrame(
            concat_cones,
            crs='epsg:4326'
        )
        all_cones.to_file(out_file, driver='GeoJSON')
    else:
        print(f"---> no files found for {in_folder}")
