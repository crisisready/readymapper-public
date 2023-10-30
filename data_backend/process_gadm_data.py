from utils.convert_geojson_to_fgb import convert_geojson_to_fgb
import geopandas as gpd
import pandas as pd
import glob
import fiona
from pathlib import Path

INPUT_FOLDER = 'input/gadm'
OUTPUT_FOLDER = INPUT_FOLDER.replace('input/', 'output/')
TMP_FOLDER = 'input/tmp'
SIMPLIFY_DIST = 100


def flatten_list(list):
    return [item for sublist in list for item in sublist]


def simplify_gdf(df, dist=SIMPLIFY_DIST):
    df = df.to_crs('epsg:6933')
    df['geometry'] = df.simplify(dist)
    df = df.to_crs('epsg:4326')
    return df


def convert_geopackage_to_geojson(file):
    print(f'---> layers found: {fiona.listlayers(file)} in file: {file}')
    geojsons = []
    for layer_name in fiona.listlayers(file):
        layer_name = layer_name.lower()
        print(f'---> processing layer {layer_name}')
        if 'adm_1' in layer_name or 'adm_2' in layer_name:
            df = gpd.read_file(file, layer=layer_name)
            if 'adm_1' in layer_name:
                # HACK: faking US-county like IDs for GADM data
                df['NAME'] = df['NAME_1']
                df['GEOID'] = df['GID_1']
                df['COUNTYFP'] = df['GID_1']
                df = gpd.GeoDataFrame(df[['geometry', 'NAME', 'GEOID', 'COUNTYFP', 'COUNTRY']])
            if 'adm_2' in layer_name:
                # HACK: faking US-place like IDs for GADM data
                df['NAME'] = df['NAME_2']
                df['GEOID'] = df['GID_2']
                df['PLACEFP'] = df['GID_2']
                df = gpd.GeoDataFrame(df[['geometry', 'NAME', 'GEOID', 'PLACEFP', 'COUNTRY']])
            df = simplify_gdf(df)
            Path(f'{TMP_FOLDER}').mkdir(parents=True, exist_ok=True)
            file_name = f'{TMP_FOLDER}/{Path(file).stem}_{layer_name}.geojson'
            print(f'---> saving to {file_name}')
            df.to_file(file_name, driver='GeoJSON')
            geojsons.append(file_name)
        else:
            print(f'---> skipping {layer_name}')
            continue
    return geojsons


def concat_gdfs(frames):
    return gpd.GeoDataFrame(pd.concat(frames, ignore_index=True))


def combine_geojsons(geojsons):
    print('---> combining all geojsons for adm_1')
    adm_1 = concat_gdfs([gpd.read_file(x) for x in geojsons if 'adm_1' in x])
    print('---> combining all geojsons for adm_2')
    adm_2 = concat_gdfs([gpd.read_file(x) for x in geojsons if 'adm_2' in x])

    print(f"---> countries found for adm level 1: {adm_1.COUNTRY.unique()}")
    print(f"---> countries found for adm level 2: {adm_2.COUNTRY.unique()}")
    
    print('---> saving combined file for adm_1')
    adm_1.to_file(f'{OUTPUT_FOLDER}/adm_1.geojson', driver='GeoJSON')
    print('---> saving combined file for adm_2')
    adm_2.to_file(f'{OUTPUT_FOLDER}/adm_2.geojson', driver='GeoJSON')


def process_gadm_data():
    files = glob.glob(f'{INPUT_FOLDER}/*.gpkg')
    geojsons = flatten_list([convert_geopackage_to_geojson(f) for f in files])
    # geojsons = glob.glob(f'{TMP_FOLDER}/*.geojson')
    combine_geojsons(geojsons)

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


if __name__ == '__main__':
    process_gadm_data()