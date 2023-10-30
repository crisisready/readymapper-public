import pandas as pd
import numpy as np
import geopandas as gpd
import datetime as dt
import glob
import zipfile
import re
import os
import shutil
import requests
from pathlib import Path
from dbfread import DBF
from collections import Counter


def download_fire_perimeter_data_us(disaster_input_folder, disaster_config):
    folder = f"{disaster_input_folder}/spatial-data/disaster-perimeters"
    Path(folder).mkdir(parents=True, exist_ok=True)

    swLng = disaster_config["swLng"]
    swLat = disaster_config["swLat"]
    neLng = disaster_config["neLng"]
    neLat = disaster_config["neLat"]


    url = f"https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters/FeatureServer/0/query?where=1%3D1&outFields=*&geometry={swLng}%2C{swLat}%2C{neLng}%2C{neLat}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outSR=4326&f=geojson"
    print(f"---> downloading data from {url}")
    df = gpd.read_file(url)
    #df['dt'] = pd.to_datetime(df['poly_DateCurrent'], unit='ms')
    df['dt'] = pd.to_datetime(df['poly_PolygonDateTime'], unit='ms')
    df['day'] = df['dt'].dt.strftime('%Y%m%d')

    days = df['day'].unique()

    print(f"---> found {len(df)} fire perimeters in bounding box,")
    print(f"---> spanning the following dates: {days}")

    for day in days:
        fires = df['poly_IncidentName'].unique()
        for fire in fires:
            subset = df[(df['day'] == day) & (df['poly_IncidentName'] == fire)]
            if (len(subset) > 0):
                subfolder = f"{folder}/{fire}"
                Path(subfolder).mkdir(parents=True, exist_ok=True)
                file_name = f"{subfolder}/{day}.geojson"
                print(f"---> saving {file_name}")
                subset.to_file(file_name, driver='GeoJSON')


def date_copern_data(dbf_file):
    """
    Extract date of satellite image from DBF file 
    """
    dbf = DBF(dbf_file)
    df = pd.DataFrame(iter(dbf))
    post_event = df[df['eventphase']=='Post-event']
    src_date = post_event['src_date']
    src_date_dt = dt.datetime.strptime(src_date.values[0], '%d/%m/%Y')
    src_date_formatted = dt.datetime.strftime(src_date_dt, '%Y%m%d')
    
    return src_date_formatted


def prep_remainder_for_del(dup_prods, keyword, prod_prefix, dup_dt, disaster_perim_folder):
    """
    Get full paths for all products in dup_prods other than the one matching the provided keyword;
        will remove these to remove duplicating geometries
    """
    to_del = [prod for prod in dup_prods if not keyword in prod]
    to_del_names = [f"{disaster_perim_folder}/{prod_prefix}_{prod}_observedEventA_{dup_dt}.json" for prod in to_del]
    return to_del_names


def id_duplicate_geometries_bydate(file_dates, file_types, prod_prefix, disaster_perim_folder):
    """
    For each date of a given EMS product, if there are multiple geometries per date,
        select only a single one to avoid adding unnecessary duplicate data to ReadyMapper.
        Select preferred geometry according to logic: (1a) if exists, take the most updated Monitoring version,
        (1b) if both Delineation and Grading monitoring products, select Delineation,
        (2) if no monitoring products, select Delineation if it exists,
        (3) if no monitoring or delineation, select Grading if it exists,
        (4) if no monitoring, delineation, or grading, should only have the First Estimate product, this 
            which would not be duplicated, so return without deleting but alert the user
    """
    dup_dates = [k for k, v in Counter(file_dates).items() if v > 1]
    print(f"---> Finding and removing duplicates in {prod_prefix} products for dates {dup_dates}")
    full_names_to_del = []

    for dup_dt in dup_dates:
        dup_prods = []
        print(f"---> Finding duplicates for date {dup_dt}")
        for i, str_dt in enumerate(file_dates):
            if dup_dt == str_dt:
                dup_prods.append(file_types[i])
        print(f"---> Selecting prefered geometry from duplicates {dup_prods}")
        # if monitoring product, prefer that above all else
        mon_prods = [prod for prod in dup_prods if 'MONIT' in prod]
        
        # if only a single monitoring product, use that as preferred, create list of others to remove
        if len(mon_prods)==1:
            to_del_names = prep_remainder_for_del(dup_prods, 'MONIT', prod_prefix, dup_dt, disaster_perim_folder)
        
        # if multiple monitoring products, select the one with the highest version number (MONITO2 vs MONIT01, eg)
        elif len(mon_prods) > 1:
            monit_nums = [int(prod[-2:]) for prod in mon_prods]
            max_monit_num = np.max(monit_nums)
            # if only one of the highest numbered monitoring version, select this one
            if len([num for num in monit_nums if num == max_monit_num]) == 1:
                to_del_names = prep_remainder_for_del(dup_prods, str(max_monit_num), prod_prefix, dup_dt, disaster_perim_folder)
            # else if multiple versions of this same monitoring number, choose the DEL file
            else:
                if len(str(max_monit_num)) == 1:
                    max_monit_str = '0' + str(max_monit_num)
                else:
                    max_monit_str = str(max_monit_num)
                preferred_monit = "DEL_MONIT" + max_monit_str
                to_del_names = prep_remainder_for_del(dup_prods, preferred_monit, prod_prefix, dup_dt, disaster_perim_folder)

        # if no monitoring products, check for Delineation product
        else:
            del_prods = [prod for prod in dup_prods if 'DEL' in prod]
            # if single Delineation product exists, prefer this one
            if len(del_prods)==1:
                to_del_names = prep_remainder_for_del(dup_prods, 'DEL', prod_prefix, dup_dt, disaster_perim_folder)
            # if no Delineation products, check for single Grading product
            elif len(del_prods) < 1:
                gra_prods = [prod for prod in dup_prods if 'GRA' in prod]
                if len(gra_prods)==1:
                    to_del_names = prep_remainder_for_del(dup_prods, 'GRA',prod_prefix, dup_dt, disaster_perim_folder)
                # if none of the above logic is met, don't id any files for removal and alert the user
                # to double-check the logic
                elif len(gra_prods) < 1:
                    print(f"Unaccounted for duplicate geometry products in {prod_prefix}; please manually examine and adjust logic as needed")
                    to_del_names = []
        
        # add any files to be deleted for a given date to the master list
        print(f"---> Adding to delete list {to_del_names}")            
        full_names_to_del.extend(to_del_names)
    
    return full_names_to_del


def collect_copernicus_products(product_zips, temp_download, disaster_perim_folder):
    """
    Extract the zip file containing a specific type of product (eg, delineation monitoring), 
        get the date of the satellite imagery used, and save the perimeter geojson named by date
    """

    file_dates = []
    file_types = []
    for prod_zip in product_zips:
        with zipfile.ZipFile(prod_zip) as zip_file:  
            for member in zip_file.namelist():
                if re.search('observedEventA_v\d+.json', member):
                    json_file = member
                elif re.search('source_v\d+.dbf', member):
                    #print(member)
                    zip_file.extract(member, temp_download)
                    source_file = f"{temp_download}/{member}"
            prod_dt = date_copern_data(source_file)
            print(f"---> Processing perimeter data in {prod_zip} with file date {prod_dt}")
            file_dates.append(prod_dt)

            split_path = prod_zip.split("/")
            file_root = str.strip(split_path[-1],'.zip')
            file_root = re.match(r'(\w+)_v\d+',file_root)[1]
            prefix_and_type = re.match(r'(\w+\_AOI\d+)_(.*)$', file_root)
            file_types.append(prefix_and_type.group(2))

            fin_perim_file = f"{disaster_perim_folder}/{file_root}_observedEventA_{prod_dt}.json"
            temp_perim_file = zip_file.extract(json_file, temp_download)
            shutil.move(temp_perim_file, fin_perim_file)
            print(f'---> Json file {fin_perim_file} created')

    # check for multiple files for a given day of imagery - would be duplicating polygons for mapping
    prod_prefix = prefix_and_type.group(1)
    dups_to_del = id_duplicate_geometries_bydate(file_dates, file_types, prod_prefix, disaster_perim_folder)
    print(f"---> Removing identified duplicates {dups_to_del}")
    for dup in dups_to_del:
        os.remove(dup)

    # remove all created temporary files and directories for this set of products
    temp_path = "/".join(prod_zip.split("/")[:-1])
    print(f'---> Removing temporary folder {temp_path}')
    shutil.rmtree(temp_path)    


def download_eu_fire_perimeter_data(disaster_input_folder, disaster_config):
    """
    To Use: must first download zip file(s) for each Copernicus EMS Rapid Mapping activation of interest
        (multiple if multiple fires within region of interest, or only single activation) and save
        the zip file(s) in disaster_input_folder/spatial-data/temp-spatial. These files will be 
        removed after processing to allow for the next day's files to be downloaded if there are updates
    """

    folder = f"{disaster_input_folder}/spatial-data/disaster-perimeters"
    temp_folder = f"{disaster_input_folder}/spatial-data/temp-spatial"
    Path(folder).mkdir(parents=True, exist_ok=True)
    Path(temp_folder).mkdir(parents=True, exist_ok=True)
    
    # download all fire product zip files from EMS Rapid Mapping site, save in temp_folder
    fire_ids = disaster_config['wfigsIncidentName'].replace(" ","").split(",")
    zip_names = []
    for fire_id in fire_ids:
        url = f"https://rapidmapping.emergency.copernicus.eu/backend/{fire_id}/{fire_id}_products.zip"
        r = requests.get(url, stream=True)
        temp_loc = f"{disaster_input_folder}/spatial-data/temp-spatial/{fire_id}_products.zip"
        print(f"---> downloading data from {url}")
        zip_names.append(f"{temp_folder}/{fire_id}_products.zip")
        with open(temp_loc, 'wb') as fd:
            for chunk in r.iter_content(chunk_size=128):
                fd.write(chunk)
    
    # for all the EMSR event zip files downloaded, process and extract each day's perimeter geometries
    for zip_name in zip_names:
        print(f"---> Files downloaded to {zip_name}")
        zip_name_folder = zip_name[:-4]

        zip_file_name = zip_name.split('/')[-1]
        file_components = re.match(r'(\w+?)\_\w+.zip', zip_file_name)
        emsr_code = file_components.group(1)
        print(f"---> Files downloaded for EMSR code {emsr_code}")
        
        # remove all existing files for the given emsr code from the perimeter file
        # need to manually remove in case version has been updated for a given 
        # product - name will be different, but we want the updated / corrected version
        emsr_existing = glob.glob(f"{folder}/{emsr_code}_*.json") 
        print(f"---> Removing existing files for EMSR: {emsr_existing}")
        for emsr_file in emsr_existing:
            os.remove(emsr_file)
        
        # unzip outer folder
        with zipfile.ZipFile(zip_name) as outer_zip:
            for member in outer_zip.namelist():
                outer_zip.extract(member, zip_name_folder)

        # collect names of products in zipped file
        prod_files = glob.glob(f"{zip_name_folder}/*.zip", recursive=True)
        
        # for all products, save geojson to spatial-data/disaster-perimeters 
        collect_copernicus_products(prod_files, zip_name_folder, folder)
    
    print(f"---> Deleting all zip files and intermediate products in {temp_folder}")
    to_del = glob.glob(f"{temp_folder}/*.zip")
    for del_path in to_del:
        os.remove(del_path)


def download_fire_perimeter_data(disaster_input_folder, disaster_config):
    if "localTimezone" in disaster_config:
        if disaster_config["localTimezone"] == "Europe/Istanbul":
            download_eu_fire_perimeter_data(disaster_input_folder, disaster_config)
        else:
            download_fire_perimeter_data_us(disaster_input_folder, disaster_config)

    else:
        download_fire_perimeter_data_us(disaster_input_folder, disaster_config)
