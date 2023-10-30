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
import datetime as dt

import configs

UTCOFFSETS = {
        'AST': '-0400',
        'EDT': '-0400',
        'EST': '-0500',
        'CDT': '-0500',
        'CST': '-0600',
        'MDT': '-0600',
        'MST': '-0700',
        'PDT': '-0700',
        'PST': '-0800'
    }


def process_hurricane_data(disaster_input_folder, disaster_config):
    if disaster_config['type'] != 'hurricane':
        print(f"---> {disaster_input_folder} is not a hurricane. Skipping.")
        return

    out_folder = f"{disaster_input_folder.replace('input/', 'output/')}/noaa/"

    # flush output directory
    try:
        shutil.rmtree(out_folder)
    except Exception as e:
        pass
    os.makedirs(out_folder, exist_ok=True)

    process_tracks(f"{disaster_input_folder}/noaa-5day-advisories/", out_folder, disaster_config)
    process_cones(f"{disaster_input_folder}/noaa-5day-advisories/", out_folder, disaster_config)
    process_wind_probabilities(f"{disaster_input_folder}/noaa-wind-probabilities/", out_folder, disaster_config)
    process_wind_radii(f"{disaster_input_folder}/noaa-wind-radii/", out_folder, disaster_config)
    process_flood_warnings(f"{disaster_input_folder}/noaa-flood-warnings/", out_folder, disaster_config)


def add_utc_offset(timestring):
    timestring_lst = timestring.split(" ")
    #print(timestring_lst)
    tzname = timestring_lst[2]
    utcoffset = UTCOFFSETS[tzname]
    return  " ".join(timestring_lst[0:2]) + " " + utcoffset + " " + " ".join(timestring_lst[3:])


def process_tracks(in_folder, out_folder, disaster_config):

    in_files = glob.glob(f"{in_folder}/*")
    print(f"---> processing tracks for {in_folder}")
    if in_files:
        out_file = f"{out_folder}/hurricane-tracks.geojson"
        tracks = []
        for in_file in in_files:
            try:
                print(f"---> processing {os.path.basename(in_file)}...")
                storm_id, _, advisory_id = os.path.splitext(os.path.basename(in_file))[0].split("_")

                # forecast hurricane tracks
                # read the correct shapefile directly out of the zip archive
                in_shp_file = f"{in_file}!{storm_id}-{advisory_id}_5day_pts.shp"
                forecast_track_gdf = gpd.read_file(in_shp_file)

                # code to convert date instead of parseADVDATE() function in hurricane-tracks.js
                #forecast_track_gdf['ADVDATE'] = forecast_track_gdf['ADVDATE'].apply(add_utc_offset)
                #forecast_track_gdf['ADVDATE'] = forecast_track_gdf['ADVDATE'].astype('str').apply(
                #                                    dt.datetime.strptime, args=("%I%M %p %z %a %b %d %Y",))
                #forecast_track_gdf['ADVDATE'] = forecast_track_gdf['ADVDATE'].dt.tz_convert('UTC')

                forecast_track_gdf = forecast_track_gdf.to_crs('epsg:4326')
                tracks.append(forecast_track_gdf)
            except Exception as e:
                print(f"---> error processing {in_file}")
                print(f"---> error: {e}")

        all_tracks = gpd.GeoDataFrame(
            pd.concat(tracks, ignore_index=True),
            crs='epsg:4326'
        )
        all_tracks.to_file(out_file, driver='GeoJSON')
    else:
        print(f"---> no files found for {in_folder}")


def process_cones(in_folder, out_folder, disaster_config):
    in_files = glob.glob(f"{in_folder}/*")
    print(f"---> processing cones for {in_folder}")
    if in_files:
        out_file = f"{out_folder}/hurricane-cones.geojson"
        cones = []
        for in_file in in_files:
            try:
                print(f"---> processing {os.path.basename(in_file)}...")
                storm_id, _, advisory_id = os.path.splitext(os.path.basename(in_file))[0].split("_")

                # forecast cones
                # read the correct shapefile directly out of the zip archive
                in_shp_file = f"{in_file}!{storm_id}-{advisory_id}_5day_pgn.shp"
                forecast_cone_gdf = gpd.read_file(in_shp_file)
                forecast_cone_gdf = forecast_cone_gdf.to_crs('epsg:4326')
                cones.append(forecast_cone_gdf)
            except Exception as e:
                print(f"---> error processing {in_file}")
                print(f"---> error: {e}")

        all_cones = gpd.GeoDataFrame(
            pd.concat(cones, ignore_index=True),
            crs='epsg:4326'
        )
        all_cones.to_file(out_file, driver='GeoJSON')
    else:
        print(f"---> no files found for {in_folder}")


def process_wind_probabilities(in_folder, out_folder, disaster_config):
    in_files = glob.glob(f"{in_folder}/*")
    print(f"---> processing wind probabilities for {in_folder}")
    if in_files:
        out_file = f"{out_folder}/wind-probabilities.geojson"

        def process_file(in_file, frames):
            print(f"---> processing {os.path.basename(in_file)}...")
            date = os.path.basename(in_file).split("_")[0]

            in_shp_file = f"{in_file}!{date}_wsp64knt120hr_5km.shp"
            gdf = gpd.read_file(in_shp_file)
            gdf = gdf.to_crs('epsg:4326')

            # We only want 3 of the contours
            desired_percentages = ['5-10%', '40-50%', '80-90%']
            gdf = gdf[gdf['PERCENTAGE'].isin(desired_percentages)]
            gdf = gdf.reset_index(drop=True)

            # Each percentage category is represented by either a Polygon
            # or a MultiPolygon. Sometimes MultiPolygon is appropriate, because
            # there might be two totally different storms on different parts
            # of the globe. Other times, a single wind probability contour
            # is represented as a MultiPolygon by mistake, or by an invalid
            # polygon that overlaps itself. These are the polygons we want to
            # fix in this next step.
            for i in range(len(gdf)):
                if (gdf.loc[i, "geometry"]):
                    if (gdf.loc[i, "geometry"].geom_type == "MultiPolygon"):
                        # Buffer each polygon in the MultiPolygon by
                        # a tiny amount, then try to merge them together
                        mergedGeom = unary_union([
                            g.buffer(0.0001)
                            for g in gdf.loc[i, "geometry"].geoms
                        ])

                        # This is a very complicated syntax for simply
                        # assigning our new merged geometry to the data frame.
                        # See: https://github.com/pandas-dev/pandas/issues/26333
                        gdf.loc[[i], "geometry"] = gpd.GeoDataFrame(
                            geometry=[mergedGeom]
                        ).geometry.values
                    elif (gdf.loc[i, "geometry"].geom_type == "Polygon"):
                        gdf.loc[i, "geometry"] = gdf.loc[i, "geometry"].buffer(0.0001)

                    # gdf.to_file(f"{year}-{month}-{day} {hour}.geojson", driver='GeoJSON')

            # multipolygons -> polygons
            gdf = gdf.explode(ignore_index=True)

            # throw out probability contours that are too far
            # away
            disaster_centroid = Polygon([
                Point(disaster_config['swLng'], disaster_config['swLat']),
                Point(disaster_config['neLng'], disaster_config['swLat']),
                Point(disaster_config['neLng'], disaster_config['neLat']),
                Point(disaster_config['swLng'], disaster_config['neLat']),
                Point(disaster_config['swLng'], disaster_config['swLat']),
            ]).centroid

            # magic number alert. any rows that are more than 10 units away are
            # not a part of this disaster.
            gdf = gdf[gdf["geometry"].centroid.distance(disaster_centroid) < 10]
            gdf = gdf.reset_index(drop=True)

            # simplify polygons to smooth ragged edges
            for i in range(len(gdf)):
                if (gdf.loc[i, "geometry"]):
                    polygon = Polygon(gdf.loc[i, "geometry"].exterior.coords)

                    # first reduce number of points in polygon to remove
                    # ragged edges
                    polygon = polygon.simplify(0.08)

                    # then increase number of points in polygon
                    # for smooth curves
                    polygon = Polygon(smooth_coords(
                        polygon.exterior.coords, refinements=2
                    ))

                    gdf.loc[i, "geometry"] = polygon

                    # polygonCoords = gdf.loc[i, "geometry"].exterior.coords

                    # print(polygonCoords)
                    # concaveHull = alphashape.alphashape(polygonCoords, alpha=1)

                    # # sometimes alphashape returns a polygon,
                    # # other times a geometry collection
                    # if concaveHull.geom_type == 'GeometryCollection':
                    #     print("EMPTY HULL")
                    #     print(concaveHull.geoms)
                    #     continue
                    #     # concaveHull = list(concaveHull.geoms)[0]

                    # if concaveHull.geom_type == 'MultiPolygon':
                    #     concaveHull = concaveHull.geoms[0]

                    # gdf.loc[i, "geometry"] = Polygon(concaveHull.exterior.coords)

            year = date[0:4]
            month = date[4:6]
            day = date[6:8]
            hour = date[8:] + ':00'
            gdf["dt"] = f"{year}-{month}-{day} {hour}"
            # gdf.to_file(f"{year}-{month}-{day} {hour}-exterior.geojson", driver='GeoJSON')

            frames.append(gdf)

        avocados = []
        for in_file in in_files:
            try:
                process_file(in_file, avocados)
            except Exception as e:
                print(f"---> found error processing {in_file}")
                print(f"---> error: {e}")

        all_avocados = gpd.GeoDataFrame(
            pd.concat(avocados, ignore_index=True),
            crs='epsg:4326'
        )
        all_avocados.to_file(out_file, driver='GeoJSON')
    else:
        print(f"---> no files found for {in_folder}")


def process_wind_radii(in_folder, out_folder, disaster_config):
    required_columns = [
        "RADII",
        "ADVNUM",
        "geometry"
    ]

    in_files = glob.glob(f"{in_folder}/*")
    print(f"---> processing wind radii for {in_folder}")
    if in_files:
        out_file = f"{out_folder}/hurricane-wind-radii.geojson"
        radii = []
        for in_file in in_files:
            try:
                print(f"---> processing {os.path.basename(in_file)}...")
                with ZipFile(in_file) as myzip:
                    in_shp_file = next(
                        name for name in myzip.namelist()
                        if name.endswith("initialradii.shp")
                    )

                    # read the correct shapefile directly out of the zip archive
                    gdf = gpd.read_file(f"{in_file}!{in_shp_file}")

                    # we only care about the highest wind-radii
                    desired_radii = [64.0]
                    gdf = gdf[gdf["RADII"].isin(desired_radii)]
                    gdf = gdf.reset_index(drop=True)

                    gdf = gdf[required_columns]

                    gdf = gdf.to_crs('epsg:4326')
                    radii.append(gdf)
            except Exception as e:
                print(f"---> error processing {in_file}")
                print(f"---> error: {e}")

        all_radii = gpd.GeoDataFrame(
            pd.concat(radii, ignore_index=True),
            crs='epsg:4326'
        )
        all_radii.to_file(out_file, driver='GeoJSON')
    else:
        print(f"---> no files found for {in_folder}")


def process_flood_warnings(in_folder, out_folder, disaster_config):
    # enable KML parsing
    fiona.drvsupport.supported_drivers['KML'] = 'rw'

    in_files = glob.glob(f"{in_folder}/*")
    print(f"---> processing flood warnings for {in_folder}")
    if in_files:
        out_file = f"{out_folder}/hurricane-flood-warnings.geojson"
        frames = []
        for in_file in in_files:
            try:
                print(f"---> reading {in_file}")
                base_filename = os.path.splitext(os.path.basename(in_file))[0]
                # Parse the advisory id from the filename. No metadata (date, advisory #, etc) is in the kml.
                advisory_id = re.findall(r"_WatchWarningSS_(\d{3})", base_filename)[0].lstrip("0")
                print(f'------> parsed this ID from filename: {advisory_id}')
                gdf = gpd.read_file(in_file, driver='KML')
                gdf['ADVNUM'] = advisory_id
                gdf.to_crs('epsg:4326')
                frames.append(gdf)
                # gdf.to_file(out_file, driver='GeoJSON')
            except Exception as e:
                print(f"---> error processing {in_file}")
                print(f"---> error: {e}")

        all_frames = gpd.GeoDataFrame(
            pd.concat(frames, ignore_index=True),
            crs='epsg:4326'
        )
        all_frames.to_file(out_file, driver='GeoJSON')
    else:
        print(f"---> no files found for {in_folder}")


if __name__ == '__main__':
    disaster_input_folder = "/mnt/c/Users/natra/Documents/CrisisReady/ReadyMapper/international_expansion/direct-relief/data_backend/input/disasters/2022-hurricane-ian"
    from utils.get_disasters_config import get_disasters_config
    DISASTERS = get_disasters_config(use_local=True)
    disaster_config = [x for x in DISASTERS if "id" in x and x["id"] == "2022-hurricane-ian"][0]

    process_hurricane_data(disaster_input_folder, disaster_config)