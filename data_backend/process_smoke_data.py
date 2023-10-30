import inquirer
import requests
from pathlib import Path
import datetime as dt
import re
import os
import glob
import pandas as pd
import geopandas as gpd
from zipfile import ZipFile
import shutil


URL_BASE = 'https://satepsanone.nesdis.noaa.gov/pub/FIRE/web/HMS/Smoke_Polygons/Shapefile/'

def process_smoke_data(disaster_input_folder, disaster_config):
  if disaster_config['type'] != 'fire' and disaster_config['type'] != 'smoke':
    print(f"---> {disaster_input_folder} does not include smoke data. Skipping.")
    return
  
  out_folder = f"{disaster_input_folder.replace('input', 'output')}/noaa/"
  print("HERE",out_folder)
  # flush output directory
  try:
      shutil.rmtree(out_folder)
  except Exception as e:
      pass
  os.makedirs(out_folder, exist_ok=True)

  download_smoke_data(disaster_input_folder, disaster_config)
  process_smoke_perimeter(f"{disaster_input_folder}/noaa-smoke-perimeter/", out_folder, disaster_config)

def build_zip_url(day):  
    url = f'{URL_BASE}{str(day.year)}/{str(day.strftime("%m"))}/hms_smoke{dt.datetime.strftime(day,"%Y%m%d")}.zip'
    file_name = f'hms_smoke{dt.datetime.strftime(day,"%Y%m%d")}.zip'
    return url, file_name

def download_and_save_file(url, file_name):
    print(f'---> downloading {url}')
    try:
        r = requests.get(url, stream=True)
        with open(file_name, 'wb') as fd:
            for chunk in r.iter_content(chunk_size=128):
                fd.write(chunk)
    except Exception as e:
        print(f'!!! ---> error downloading {url}')

def build_url_and_download(day, out_folder, disaster_input_folder):
    print(f'---> getting smoke data for day {day}')
    zip_url, file_name = build_zip_url(day)
    
    # build folder to store output
    folder = f'{disaster_input_folder}/{out_folder}'
    Path(folder).mkdir(parents=True, exist_ok=True)
    
    download_and_save_file(zip_url, f'{folder}/{file_name}')

def download_smoke_data(disaster_input_folder, disaster_config):
    fire_name = disaster_config['name']
    print(f'---> Fire name is: {fire_name}')
    date_start = disaster_config["dateStart"]
    date_end = disaster_config["dateEnd"]
    print(f'---> disaster spans the following day(s): {date_start} to {date_end}')
    days_range = pd.date_range(start=date_start, end=date_end, freq='D',
                               inclusive="both").date
    for disaster_day in days_range:
        build_url_and_download(disaster_day, 'noaa-smoke-perimeter', disaster_input_folder)

def process_smoke_perimeter(disaster_input_folder, out_folder, disaster_config):
  required_columns = ["Date", "Density", "geometry"]
  in_files = glob.glob(f"{disaster_input_folder}/*")
  print(f"---> processing smoke perimeters {disaster_input_folder}")
  if in_files:
    out_file = f"{out_folder}/smoke-perimeters.geojson"
    smoke_files_combined = []
    for in_file in in_files:
      try:
          print(f"---> processing {os.path.basename(in_file)}...")
          with ZipFile(in_file) as myzip:
              in_shp_file = next(
                  name for name in myzip.namelist()
                  if name.endswith("shp")
              )
              gdf = gpd.read_file(f"{in_file}!{in_shp_file}")
              gdf = gdf.to_crs('epsg:4326')
              gdf['Date'] = pd.to_datetime(gdf['Start'], format="%Y%j %H%M").dt.strftime("%Y-%m-%d %H:%M")
              gdf = gdf[required_columns]
              smoke_files_combined.append(gdf)
      except Exception as e:
          print(f"---> error processing {in_file}")
          print(f"---> error: {e}")

      if smoke_files_combined:
        all_files = pd.concat(smoke_files_combined, ignore_index=True)
        all_files = gpd.GeoDataFrame(all_files, crs='epsg:4326')
        all_files.to_file(out_file, driver='GeoJSON')
      else:
        print(f"---> no valid files found for {disaster_input_folder}")
  else:
    print(f"---> no files found for {disaster_input_folder}")