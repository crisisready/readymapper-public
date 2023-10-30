import click
import pandas as pd
import glob
import os
import shutil
import json
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
from utils.filter_df_by_bbox import filter_df_by_bbox
import configs
import re
import mercantile
from shapely.geometry import Polygon
from functools import partial
import numpy as np


REQUIRED_COLUMNS = ["xlon", "xlat", "agg_day_period", "activity_index_total"]
DEFAULT_AGGREGATION_ZOOM = 16

def aggregate_dataframe(df, zoom):
    """Given a dataframe, zoom level, and aggregation function,
    aggregate into said zoom

    Parameters
    ----------
    df: pandas.DataFrame
        dataframe with values to aggregate
    zoom: int
        zoom to aggregate into
    aggregation_function: f(), optional
        function to calculate aggregated activity index
        (default = np.mean)
    """
    vector_qk_zoom = np.vectorize(len)
    current_zoom = np.unique(vector_qk_zoom(df["geography"]))

    aggregate_function = lambda x : np.sum(x) / 4 ** (current_zoom[0] - zoom)

    # dont do the work if the data is already the same zoom
    if len(current_zoom) == 1 and current_zoom[0] == zoom:
        return df

    aggregated = (
        df.groupby(by=lambda col: df.iloc[col]["geography"][:zoom])
        .agg({"activity_index_total": aggregate_function})
        .reset_index()
        .rename(columns={"index": "geography"})
    )

    aggregated["bounds"] = aggregated.apply(
        lambda row: list(
            mercantile.bounds(mercantile.quadkey_to_tile(row["geography"]))
        ),
        axis=1,
    )

    geometries = (
        Polygon([[w, s], [e, s], [e, n], [w, n], [w, s]])
        for (w, s, e, n) in aggregated["bounds"]
    )
    wkts, lngs, lats = zip(*[(p.wkt, *tuple(*p.centroid.coords)) for p in geometries])
    aggregated["wkt"] = wkts
    aggregated["xlon"] = lngs
    aggregated["xlat"] = lats

    return aggregated


def process_file(filename, disaster_config, zoom=None):
    """Process an individual file"""
    click.echo(f"---> reading parquet file {filename}...")
    agg_day_period = re.findall(r"agg_day_period\=(\d{4}\-\d{2}\-\d{2})", filename)[0]
    df = pd.read_parquet(filename)
    df = filter_df_by_bbox(df, disaster_config, "xlat", "xlon").reset_index()
    if len(df) > 0:
        if zoom is not None:
            print(f"---> aggregating data at {zoom} zoom")
            df = aggregate_dataframe(df, zoom)
        df["agg_day_period"] = pd.Timestamp(agg_day_period)
        return df
    else:
        return None


def process_mapbox_mobility_data(disaster_input_folder, disaster_config, zoom=DEFAULT_AGGREGATION_ZOOM):
    out_folder = f"{disaster_input_folder.replace('input/', 'output/')}/mapbox-activity/"
    os.makedirs(out_folder, exist_ok=True)

    # a flattened list of files means we can spread these out in parallel
    files_to_process = [
        f
        for day_folder in glob.glob(f"{disaster_input_folder}/mapbox-activity/*")
        for f in glob.glob(f"{day_folder}/*.parquet")
    ]

    if len(files_to_process):
        pool_func = ProcessPoolExecutor
        with pool_func(max_workers=4) as pool:
            frames = pool.map(
                partial(process_file, disaster_config=disaster_config, zoom=zoom), files_to_process, chunksize=10
            )

        frames = [f for f in frames if f is not None]  # remove empty
        click.echo(f"---> concatenating...", err=True)
        df = pd.concat(frames, ignore_index=True, copy=False)
        click.echo(f"---> sorting...", err=True)
        df = df.sort_values(by="agg_day_period")
        df[REQUIRED_COLUMNS].to_csv(f"{out_folder}/data.csv", index=False)
    else:
        click.echo(f"---> no files found for {disaster_input_folder}", err=True)
