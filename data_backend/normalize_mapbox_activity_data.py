import pandas as pd
import numpy as np
import geopandas as gpd
from pathlib import Path
import csv

REQUIRED_COLUMNS = [
    "xlon",
    "xlat",
    "agg_day_period",
    "percent_change",
]


def aggregate_by_poly(points, poly, groupby, name, geoid_zeros, out_folder):
    poly_points = gpd.sjoin(points, poly, op='within')
    poly_pop = (
        poly_points.groupby(groupby).agg({
            'percent_change': 'mean',
        })
        .reset_index()
    )

    poly_pop['GEOID'] = poly_pop['GEOID'].astype(str).str.zfill(geoid_zeros)

    cols_to_export = groupby + [
     'percent_change',
    ]

    Path(out_folder).mkdir(parents=True, exist_ok=True)
    out_file = f'{out_folder}/{name}-timeseries.csv'
    print(f"---> saving {out_file}")
    poly_pop[cols_to_export].to_csv(out_file, index=False, quoting=csv.QUOTE_NONNUMERIC)
    return poly_pop


def calculate_timeseries(df, out_folder, disaster_config):
    print("---> calculating timeseries for admin boundaries")
    gdf = gpd.GeoDataFrame(
        df, geometry=gpd.points_from_xy(df.xlon, df.xlat),
        crs='epsg:4326'
    )

    vintage = disaster_config['censusVintage']
    counties = gpd.read_file(f'output/census/{vintage}/all/acs-counties.geojson')
    places = gpd.read_file(f'output/census/{vintage}/all/acs-places.geojson')

    df["dt"] = df["agg_day_period"]
    df["dt"] = df["dt"] + "_0800"  # add hour and minute to match facebook data

    aggregate_by_poly(gdf, places, ['GEOID', 'NAME', 'dt'], 'place', 7, out_folder)
    aggregate_by_poly(gdf, counties, ['GEOID', 'NAME', 'dt'], 'county', 5, out_folder)


def normalize_mapbox_activity_data(disaster_input_folder, disaster_config, preserve_empty_tiles=True, empty_tiles_as_negative=False):
    disaster_output_folder = disaster_input_folder.replace("input/", "output/")
    input_file = f"{disaster_output_folder}/mapbox-activity/data.csv"
    print(f"---> processing data for {input_file}")
    df = pd.read_csv(input_file)

    disaster_date_start = pd.to_datetime(disaster_config["dateStart"]).date()
    df["date"] = pd.to_datetime(df["agg_day_period"]).dt.date
    df_base_period = df[df["date"] <= disaster_date_start]

    if len(df_base_period):
        df_base = df_base_period.groupby(["xlon", "xlat"])[["activity_index_total"]].mean().reset_index()
        df_base.rename(columns={"activity_index_total": "activity_index_mean"}, inplace=True)

        dates = df[df["date"] >= disaster_date_start]["agg_day_period"].unique()
        possible_dates = pd.DataFrame(dates).rename(columns={0: "agg_day_period"})
        print(f"---> mapbox data available for the following dates: {dates}")
        # generate a df with all possible dates for the baseline period
        df_base_dates = pd.merge(df_base, possible_dates, how="cross")

        if preserve_empty_tiles is True:
            # merge baseline to original dataframe, using outer join to consider tiles that exist only in baseline period
            # the assumption that if a tile disappears then it was a strong reduction in activity is generating
            df_merge = pd.merge(df, df_base_dates, how="outer", on=["xlon", "xlat", "agg_day_period"])
        else:
            df_merge = pd.merge(df, df_base_dates, how="left", on=["xlon", "xlat", "agg_day_period"])

        # calculate percent change in activity
        df_merge["percent_change"] = (df_merge["activity_index_total"] - df_merge["activity_index_mean"]) / df_merge["activity_index_mean"] * 100

        if preserve_empty_tiles is True and empty_tiles_as_negative is True:
            # consider columns that exist in baseline but not during disaster as a -999 activity percent change
            df_merge["percent_change"] = np.where(df_merge["percent_change"].isna() & df_merge["activity_index_total"].isna(), -999, df_merge["percent_change"])

        out_folder = f"{disaster_output_folder}/mapbox-activity"
        out_file = f"{out_folder}/data-normalized.csv"
        print(f"---> saving normalized data to {out_file}")
        df_merge[REQUIRED_COLUMNS].to_csv(out_file, index=False)

        calculate_timeseries(df_merge, out_folder, disaster_config)
    else:
        print(f"---> no data available before disaster start date ({disaster_date_start}), cannot calculate baseline")
