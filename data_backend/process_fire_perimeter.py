import pandas as pd
import numpy as np
import geopandas as gpd
import glob
import re
from pathlib import Path

SQ_METERS_TO_ACRES = 0.000247105
HA_TO_ACRES = 2.47105381
SIMPLIFY_TOLERANCE_METERS = 100

REQUIRED_COLUMNS = [
    'YYYYMMDD',
    'acres',
    'geometry',
    'poly_IncidentName',
    'irwin_FireDiscoveryDateTime'
]


def combine_geojsons(files, out_folder, disaster_config):
    print(f"---> combining geojsons for {out_folder}")
    frames = []
    for f in files:
        print(f"------> {f}")
        df = gpd.read_file(f, crs='epsg:4326')
        date = f.split('/')[-1].replace('.geojson', '')
        df['YYYYMMDD'] = str(date)

        # df = df.to_crs('epsg:3857')
        df = df.to_crs('epsg:6933')
        if 'poly_GISAcres' in df.columns.values:
            # use official number
            df['acres'] = df['poly_GISAcres']
        else:
            df['acres'] = df.area * SQ_METERS_TO_ACRES
            df['acres'] = df.acres.round()

        if 'irwin_FireDiscoveryDateTime' in df.columns.values:
            df['irwin_FireDiscoveryDateTime'] = pd.to_datetime(df['irwin_FireDiscoveryDateTime'], unit='ms')
        else:
            df['irwin_FireDiscoveryDateTime'] = np.NaN

        df['geometry'] = df.geometry.simplify(
            tolerance=SIMPLIFY_TOLERANCE_METERS,
            preserve_topology=True
        ).buffer(0)  # buffer 0 fixes invalid geoms

        df = df.to_crs('epsg:4326')
        if 'poly_IncidentName' not in df.columns.values:
            # support for older fire data where we didn't have the fire name
            df['poly_IncidentName'] = "N/A"
        frames.append(df[REQUIRED_COLUMNS])

    Path(out_folder).mkdir(parents=True, exist_ok=True)
    df = gpd.GeoDataFrame(pd.concat(frames, ignore_index=True),
                          crs='epsg:4326')

    fire_names = df['poly_IncidentName'].unique()
    frames = [fill_missing_dates(
                                 df[df['poly_IncidentName'] == fire].copy(),
                                 disaster_config,
                                 fire
                                 ) for fire in fire_names]

    file_name = f'{out_folder}/perimeters.geojson'
    print(f"---> saving {file_name}")
    fin_columns = REQUIRED_COLUMNS + ['latestPerimDate']
    pd.concat(frames)[fin_columns].to_file(file_name, driver='GeoJSON')
    return df


def fill_missing_dates(df_fire, disaster_config, fire_name, copernicus=False):
    print("---> filling missing dates")
    frames_to_fill = []
    # we need to do this because the initial disaster date might not have
    # a fire perimeter associated with it
    date_start = df_fire['YYYYMMDD'].min()
    if copernicus:
        date_end = df_fire['YYYYMMDD'].max()
    else:
        date_end = disaster_config["dateEnd"]
    days_range = pd.date_range(start=date_start, end=date_end, freq='D',
                               inclusive="both").date
    dates = [date.strftime('%Y%m%d') for date in days_range]
    print(f"---> running for the following dates: {dates}")
    for idx, date in enumerate(dates):
        print(f"---> {fire_name} {date}:")
        f = df_fire[df_fire['YYYYMMDD'] == date]
        print("f for date: ",f.head(2))
        if idx > 0 and len(frames_to_fill) > 0:
            previous_date = dates[idx - 1]
            frames_df_tmp = pd.concat(frames_to_fill)
            previous = frames_df_tmp[frames_df_tmp['YYYYMMDD'] == previous_date]
        else:
            previous = []
        if len(f) == 0 and len(previous) > 0:
            print(f"------> missing fire perimeter for {date}, repeating previous")
            previous['YYYYMMDD'] = date
            frames_to_fill.append(previous)
        elif len(f) > 0:
            print(f"------> using perimeter found for {date}")
            frames_to_fill.append(f)
        else:
            print(f"------> no perimeter for {date}, no previous, not doing anything")

    if len(frames_to_fill) > 1:
        filled_frames = pd.concat(frames_to_fill).reset_index(drop=True)
    else:
        filled_frames = frames_to_fill[0]
    
    filled_frames['latestPerimDate'] = df_fire['YYYYMMDD'].max()
    
    return filled_frames


def calculate_perimeter_difference(df_fire, disaster_config, fire_name):
    frames = []

    for idx, row in df_fire.iterrows():
        if idx == 0:
            f = df_fire.iloc[0]
            frames.append(gpd.GeoDataFrame({
                'poly_IncidentName': f.poly_IncidentName,
                'irwin_FireDiscoveryDateTime': f.irwin_FireDiscoveryDateTime,
                'YYYYMMDD': f.YYYYMMDD,
                'geometry': gpd.GeoSeries(f.geometry)
            }, crs=4326))
        if idx > 0:
            f = df_fire[idx: idx + 1]
            previous = df_fire[idx - 1: idx]
            diff = previous.symmetric_difference(f, align=False)
            diff_area = diff.area
            date = f.iloc[0].YYYYMMDD
            fire_name = f.iloc[0].poly_IncidentName
            discovery_date = f.iloc[0].irwin_FireDiscoveryDateTime
            if (diff_area == 0).all():
                print(f"------> last perimeter was repeated for {date}, repeating again previous")
                frames.append(gpd.GeoDataFrame({
                    'poly_IncidentName': fire_name,
                    'irwin_FireDiscoveryDateTime': discovery_date,
                    'YYYYMMDD': date,
                    'geometry': gpd.GeoSeries(previous.geometry)
                }, crs=4326))
            else:
                frames.append(gpd.GeoDataFrame({
                    'poly_IncidentName': fire_name,
                    'irwin_FireDiscoveryDateTime': discovery_date,
                    'YYYYMMDD': date,
                    'geometry': gpd.GeoSeries(diff)
                }, crs=4326))

    df_all = pd.concat(frames).reset_index(drop=True)

    buffer_dist = 100
    # 6933 works for all world between 86 and -86 lat, so should be good for all use cases for ReadyMapper
    df_all = df_all.to_crs('epsg:6933')
    df_all['geometry'] = df_all.buffer(-buffer_dist).buffer(+buffer_dist)
    df_all['geometry'] = df_all.simplify(buffer_dist)
    df_all = df_all.to_crs('epsg:4326')
    return df_all


def process_geojsons(gdf, out_folder, disaster_config):
    print(f"---> calculating difference for {out_folder}")
    df = gdf.sort_values('YYYYMMDD').reset_index(drop=True)

    fires_frames = []
    fire_names = df['poly_IncidentName'].unique()
    for fire in fire_names:
        df_fire = df[df['poly_IncidentName'] == fire].copy().reset_index()
        df_all = calculate_perimeter_difference(df_fire, disaster_config, fire)
        fires_frames.append(df_all)

    df_all_fires = gpd.GeoDataFrame(pd.concat(fires_frames, ignore_index=True),
                          crs='epsg:4326')
    file_name = f'{out_folder}/perimeters-difference.geojson'
    print(f"---> saving {file_name}")
    df_all_fires.to_file(file_name, driver='GeoJSON')


def combine_geojsons_copernicus(files, out_folder, disaster_config):
    print(f"---> combining geojsons for {out_folder}")
    frames = []
    for f in files:
        print(f"------> {f}")
        df = gpd.read_file(f, crs='epsg:4326')

        file_name = f.split('/')[-1]
        file_components = re.match(r'(\w+)\_AOI\d+_(.*)_observedEventA_(\d+).json', file_name)
        df['YYYYMMDD'] = str(file_components.group(3))

        # df = df.to_crs('epsg:3857')
        # df = df.to_crs('epsg:6933')
        df['acres'] = df['area'] * HA_TO_ACRES
        df['acres'] = df.acres.round()
        
        # we'll never have this field for Copernicus data
        df['irwin_FireDiscoveryDateTime'] = np.NaN

        df['geometry'] = df.geometry.buffer(0)  # buffer 0 fixes invalid geoms

        df = df.to_crs('epsg:4326')
        df['poly_IncidentName'] = file_components.group(1)
        print("to append to frames: ",df.head(2))
        frames.append(df[REQUIRED_COLUMNS])

    Path(out_folder).mkdir(parents=True, exist_ok=True)
    df = gpd.GeoDataFrame(pd.concat(frames, ignore_index=True),
                          crs='epsg:4326')

    fire_names = df['poly_IncidentName'].unique()
    frames = [fill_missing_dates(
                                 df[df['poly_IncidentName'] == fire].copy(),
                                 disaster_config,
                                 fire,
                                 copernicus=True
                                 ) for fire in fire_names]
    print("frames head: ",frames[0].head(2))
    file_name = f'{out_folder}/perimeters.geojson'
    print(f"---> saving {file_name}")
    pd.concat(frames)[REQUIRED_COLUMNS].to_file(file_name, driver='GeoJSON')
    return df


def process_fire_perimeter(disaster_input_folder, disaster_config):
    folder = f"{disaster_input_folder}/spatial-data/disaster-perimeters"
    files = glob.glob(f"{folder}/**/*.*json", recursive=True)
    if files:
        out_folder = folder.replace("input/", "output/")
        if "localTimezone" in disaster_config:
            if disaster_config["localTimezone"] == "Europe/Istanbul":
                gdf = combine_geojsons_copernicus(files, out_folder, disaster_config)
        else:
            gdf = combine_geojsons(files, out_folder, disaster_config)
        process_geojsons(gdf, out_folder, disaster_config)
    else:
        print(f"---> no files found for {folder}")
