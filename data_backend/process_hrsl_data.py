from utils.convert_geojson_to_fgb import convert_geojson_to_fgb
import geopandas as gpd
import pandas as pd
import glob
import fiona
from pathlib import Path

OUTPUT_FOLDER = 'output/gadm'
HRSL_FOLDER = 'input/hrsl'


def join_gadm_hrsl(gadm_gdf, hrsl_file, merge_field='GEOID'):
    """
    Join GADM geoJSON with HRSL population csv to produce a geoJSON with 
        population and geometry by admin level
    Inputs:
        gadm_gdf (gdf): GADM geoDataFrame
        hrsl_file (str): file path for HRSL population csv
        merge_field (str): field to merge HRSL and GADM dataframes by
    Returns:
        (Geopandas GeoDataFrame): merged GeoDataFrame containing GADM geometries and HRSL populations
    """

    hrsl = pd.read_csv(hrsl_file)
    hrsl = hrsl.drop(columns=['COUNTRY'])

    

    gadm_hrsl = gadm_gdf.merge(hrsl, on=merge_field)

    return gadm_hrsl


def combine_gadm_hrsl():
    print('---> reading in geojson for adm_1')
    adm_1 = gpd.read_file(f'{OUTPUT_FOLDER}/adm_1.geojson')
    print('---> reading in geojson for adm_2')
    adm_2 = gpd.read_file(f'{OUTPUT_FOLDER}/adm_2.geojson')

    print('---> adding hrsl population to adm_1')
    adm_1_hrsl = f'{HRSL_FOLDER}/adm_1_hrsl.csv'
    # remove past hrsl data from adm1.geojson
    adm_1 = adm_1.loc[:,('NAME', 'GEOID', 'COUNTYFP', 'COUNTRY','geometry')]
    adm_1 = join_gadm_hrsl(adm_1, adm_1_hrsl, merge_field='GEOID')

    print('---> adding hrsl population to adm_2')
    adm_2_hrsl = f'{HRSL_FOLDER}/adm_2_hrsl.csv'
    # remove past hrsl data from adm2.geojson
    adm_2 = adm_2.loc[:,('NAME', 'GEOID', 'PLACEFP', 'COUNTRY','geometry')]
    adm_2 = join_gadm_hrsl(adm_2, adm_2_hrsl, merge_field='GEOID')

    print('---> saving combined file for adm_1')
    adm_1.to_file(f'{OUTPUT_FOLDER}/adm_1.geojson', driver='GeoJSON')
    print('---> saving combined file for adm_2')
    adm_2.to_file(f'{OUTPUT_FOLDER}/adm_2.geojson', driver='GeoJSON')


def process_hrsl_data():

    combine_gadm_hrsl()

    Path(OUTPUT_FOLDER).mkdir(parents=True, exist_ok=True)
    combined_files = [
        f'{OUTPUT_FOLDER}/adm_1.geojson',
        f'{OUTPUT_FOLDER}/adm_2.geojson'
    ]
    for file in combined_files:
        print(f"--> converting {file} to flatgeobuf")
        convert_geojson_to_fgb(
            file, file.replace('.geojson', '.fgb')
        )
