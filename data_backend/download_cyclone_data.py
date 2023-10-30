import inquirer
import requests
from pathlib import Path
import pandas as pd
import geopandas as gpd
import ast
import datetime as dt


def generateToken(username, password, portalUrl):
    # script to generate token taken from 
    # https://community.esri.com/t5/arcgis-api-for-python-questions/error-code-498-message-invalid-token/td-p/1007319

    headers = {'content-type': 'application/x-www-form-urlencoded',
               'content-length': '1000'}
    parameters = {'username': username,
                  'password': password,
                  'client': 'requestip',
                  'expiration': 20,
                  'f': 'json'}
    url = portalUrl + '/tokens/generateToken?'
    response = requests.post(url, data=parameters, headers=headers)

    try:
        jsonResponse = response.json()
        
        if 'token' in jsonResponse:
            return jsonResponse['token']
        elif 'error' in jsonResponse:
            print (jsonResponse['error']['message'])
            for detail in jsonResponse['error']['details']:
                print (detail)
    except ValueError:
        print('An unspecified error occurred generating access token.')
        print(ValueError)


def download_and_save_file(url,out_folder, disaster_input_folder,today_date,today_mon, today_year,
                             adv_field, storm_id=None, storm_name=None):
    """
    Either storm_id or storm_name must be filled in to filter for the correct storm.
        adv_field: the field in the dataset containing the advisory number (differs for each dataset)
    """

    try:
        session = requests.Session()
        session.auth = ('', '')

        r = session.get(url)
        
        all_gdf = gpd.GeoDataFrame.from_features(r.json())
        # hazard_id field in storm_positions and storm_segments
        # wind_radii has DIFFERENT hazard_id, so use different 
        if storm_name:
            storm_gdf = all_gdf[all_gdf['storm_name']==storm_name]
        else:
            storm_gdf = all_gdf[all_gdf['hazard_id']==storm_id]

        if storm_gdf.shape[0] == 0:
            print(f'---> No data available for storm {storm_id}')
            return "NoData"
        adv_num = storm_gdf[adv_field].unique()[0]
        
        folder = f"{disaster_input_folder}/{out_folder}"
        Path(folder).mkdir(parents=True, exist_ok=True)

        out_file = f"{folder}/pdc{today_date}{today_mon}{today_year}_fcst_{adv_num}.geojson"
        print(f'---> saving file {out_file}')
        storm_gdf.to_file(out_file, driver='GeoJSON')

        # if has storm_name field, return it for use in wind_radii download
        try:
            return storm_gdf[storm_gdf['forecast_date_time']==storm_gdf['forecast_date_time'].max()
                             ]['storm_name'].values[0]
        except KeyError:
            pass
    except Exception as e:
        print(f'!!! ---> error downloading {url}')


def download_storm_positions_data(token,disaster_input_folder, disaster_config,today_date, today_mon, today_year, storm_id):
    print('---> getting storm positions data from https://partners.pdc.org/arcgis/rest/services/partners/pdc_active_hazards_partners/MapServer/9')
    url = f'https://partners.pdc.org/arcgis/rest/services/partners/pdc_active_hazards_partners/MapServer/9/query?where=1=1&outFields=*&f=geojson&token='+token
    storm_name = download_and_save_file(url, 'spatial-data/pdc-storm-positions', disaster_input_folder,today_date,today_mon, today_year,
                                         adv_field='curr_adv_num',storm_id=storm_id)
    return storm_name

def download_storm_segments_data(token,disaster_input_folder, disaster_config,today_date, today_mon, today_year, storm_id):
    print('---> getting storm segments data from https://partners.pdc.org/arcgis/rest/services/partners/pdc_active_hazards_partners/MapServer/10')
    url = f'https://partners.pdc.org/arcgis/rest/services/partners/pdc_active_hazards_partners/MapServer/10/query?where=1=1&outFields=*&f=geojson&token='+token
    download_and_save_file(url, 'spatial-data/pdc-storm-segments', disaster_input_folder, today_date,today_mon, today_year, 
                                            adv_field='advisory',storm_id=storm_id)

def download_wind_radii_data(token,disaster_input_folder, disaster_config, days_range, today_date, today_mon, today_year, storm_name):
    print('---> getting wind radii data from https://partners.pdc.org/arcgis/rest/services/partners/pdc_active_hazards_partners/MapServer/11')
    url = f'https://partners.pdc.org/arcgis/rest/services/partners/pdc_active_hazards_partners/MapServer/11/query?where=1=1&outFields=*&f=geojson&token='+token
    download_and_save_file(url, 'spatial-data/pdc-wind-radii', disaster_input_folder, today_date,today_mon, today_year, 
                                            adv_field='advisory_number', storm_id=None, storm_name=storm_name)

def download_5_day_uncertainty(token,disaster_input_folder, disaster_config, today_date, today_mon, today_year, storm_name):
    print('---> getting 5-day uncertainty data from https://partners.pdc.org/arcgis/rest/services/partners/pdc_active_hazards_partners/MapServer/13')
    url = f'https://partners.pdc.org/arcgis/rest/services/partners/pdc_active_hazards_partners/MapServer/13/query?where=1=1&outFields=*&f=geojson&token='+token
    download_and_save_file(url, 'spatial-data/pdc-5-day-uncertainty', disaster_input_folder,today_date, today_mon, today_year, 
                                            adv_field='advisory_number', storm_id=None, storm_name=storm_name)

def download_cyclone_data(disaster_input_folder, disaster_config):

    # generate token to use for all downloads
    portalUrl = 'https://partners.pdc.org/arcgis'
    username = ''
    password = ''
    print('---> generating token to download cyclone data from PDC portal')
    token = generateToken(username, password, portalUrl)

    storm_id = disaster_config['storm_id']
    print(f'---> Storm ID is: {storm_id}')
    date_start = disaster_config["dateStart"]
    date_end = disaster_config["dateEnd"]
    days_range = pd.date_range(start=date_start, end=date_end, freq='D',
                               inclusive="both").date
    disaster_years = list(set([date.strftime('%Y') for date in days_range]))
    print(f'---> disaster spans the following year(s): {disaster_years}')
    
    today_date = dt.date.today().strftime("%d")
    today_mon = dt.date.today().strftime("%m")
    today_year = dt.date.today().strftime("%Y")

    
    storm_name = download_storm_positions_data(token,disaster_input_folder, disaster_config,
                                   today_date, today_mon, today_year, storm_id = storm_id)
    if storm_name == "NoData":
        print(f'---> Stopping download attempt')
        return
    print(f'---> PDC storm name {storm_name}')
    download_storm_segments_data(token,disaster_input_folder, disaster_config,
                                    today_date, today_mon, today_year, storm_id = storm_id)
    download_wind_radii_data(token,disaster_input_folder, disaster_config, days_range, 
                                today_date, today_mon, today_year, storm_name=storm_name)
    download_5_day_uncertainty(token,disaster_input_folder, disaster_config,  
                                today_date, today_mon, today_year, storm_name=storm_name)

