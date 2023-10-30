# Data Backend

The Readymapper backend is a set of scripts and a command line utility to run them.

This readme explains how to install and use these scripts. If you want detailed information on the data used and how to download and process it, see the [input data sources section below](#input-data-sources).

- [Data Backend](#data-backend)
  * [Setup](#setup)
    + [Prerequisites](#prerequisites)
    + [AWS](#aws)
  * [Sample Usage](#sample-usage)
    + [To create a new disaster](#to-create-a-new-disaster)
      - [1. Go to Airtable and create a new disaster](#1-go-to-airtable-and-create-a-new-disaster)
      - [2. Create folders for new disaster](#2-create-folders-for-new-disaster)
      - [3. Load data](#3-load-data)
      - [4. Run data processing scripts](#4-run-data-processing-scripts)
      - [5. Upload the data (input and output)](#5-upload-the-data--input-and-output-)
      - [6. Invalidate cache (if necessary)](#6-invalidate-cache--if-necessary-)
    + [To update an existing disaster](#to-update-an-existing-disaster)
      - [1. Go to Airtable and update the disaster configs](#1-go-to-airtable-and-update-the-disaster-configs)
      - [2. Load new data](#2-load-new-data)
      - [3. Run data processing scripts](#3-run-data-processing-scripts)
      - [4. Upload the data (input and output)](#4-upload-the-data--input-and-output-)
      - [5. Invalidate cache (if necessary)](#5-invalidate-cache--if-necessary-)
    + [If you want to use a local disasters config file (and not Airtable)](#if-you-want-to-use-a-local-disasters-config-file--and-not-airtable-)

- [Input Data Sources](#input-data-sources)
    + [Fire Perimeters - From NIFC](#fire-perimeters---from-nifc)
    + [Fire Perimeters - From Satellite Data](#fire-perimeters---from-satellite-data)
    + [Hurricane Data](#hurricane-data)
    + [Healthcare - HHS Data](#healthcare---hhs-data)
    + [Healthcare - HIFLD](#healthcare---hifld)
    + [Healthcare - FQHC](#healthcare---fqhc)
    + [Power Outages](#power-outages)
    + [Power Dependent Medicare Users (DME)](#power-dependent-medicare-users-dme)
    + [Facebook Population Density](#facebook-population-density)
    + [Facebook Mobility](#facebook-mobility)
    + [Mapbox Activity](#mapbox-activity)
    + [Census Places + Counties](#census-places---counties)
    + [Mapbox Driving-time Isochrones](#mapbox-driving-time-isochrones)

## Setup

### Prerequisites

You must have these installed before starting.

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- Python 3.8
- [Pipenv](https://pipenv.pypa.io/en/latest/)

Then run:

```bash
pipenv install
```

#### Using other package managers

Although we recomend using pipenv, you can also use conda or even install the packages with pip if you prefer. To  make sure you have installed all the packages listed in the Pipfile, you can use the `requirements.txt` file provided.

Using conda:

```bash
conda create -n readymapper python=3.8 -y
conda activate readymapper
pip install -r requirements.txt
python backend.py
```

Using pip:

```bash
pip install -r requirements.txt
python backend.py
```

### AWS

Create a new [AWS CLI named profile](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html) called `dr` with the AWS credentials.

## Sample Usage

There's a single entrypoint for the backend scripts:

```bash
pipenv run python backend.py
```

If you don't want to use the user-friendly prompts in the backend, you can run it as a CLI tool. Run `pipenv run python backend.py -h` to see all possible options.

---

### To create a new disaster

#### 0. Make sure you have the latest scripts

Run `git pull` just to make sure you have the latest version of the scripts.

#### 1. Go to Airtable and create a new disaster

We use Airtable to manage the disaster configurations. This allows us to have a easy interface for users to edit this data, and prevent problems that could ocurr from two users editing data in the git repository simultaneously.

If you need help understading the fields on Airtable, follow the [airtable.schema.json file](/airtable.schema.json). You can also see the [airtable.sample.json file](/airtable.sample.json) if you need an example of values.

Link to Airtable: https://airtable.com/app3zBB0ivKnmM7Rq/tblBhKDAzfNkTcAw8/viwqNfkGq1XuMq7Zg

#### 2. Create folders for new disaster

Run the backend (`pipenv run python backend.py`) and pick "Create folders for a new disaster"

Or:

```bash
pipenv run python backend.py -d THE_DISASTER_ID -s create_folder_structure
```

#### 3. Load data

Load data into the corresponding `/input` folders created in the step above. See [input data sources section below](#input-data-sources) for more info.

#### 4. Run data processing scripts

Run the backend (`pipenv run python backend.py`) and pick "Process disaster data"

Or:

```bash
pipenv run python backend.py -d THE_DISASTER_ID -s process_fb_mobility_data
pipenv run python backend.py -d THE_DISASTER_ID -s process_fb_pop_density_data
pipenv run python backend.py -d THE_DISASTER_ID -s process_fire_perimeter  # if it is a fire
# etc.
```

#### 5. Upload the data (input and output)

Run the backend (`pipenv run python backend.py`) and pick "Upload disaster data"

Or:

```bash
pipenv run python backend.py -d THE_DISASTER_ID -s upload_data
```

#### 6. Invalidate cache (if necessary)

You might need to invalidate the AWS Cloudfront cache if you see that the data has not updated on the website.

Run the backend (`pipenv run python backend.py`) and pick "Invalidate cache"

Or:

```bash
pipenv run python backend.py -s invalidate_cache
```

#### 7. Set the disaster to "public" on Airtable

Once you go back to Airtable and check the disaster as public in the "isPublic," it will be accessible on the user interface.

If you want to check if it looks right before it goes public, you can always navigate to https://studio.stamen.com/direct-relief/show/latest/#/disaster?disasterId=YOUR-DISASTER-ID-HERE, substituting "YOUR-DISASTER-ID-HERE" for your disaster ID, as set on Airtable.

---

### To update an existing disaster

#### 0. Make sure you have the latest scripts and data

Run `git pull` just to make sure you have the latest version of the scripts.

Also, run Run the backend (`pipenv run python backend.py`) and pick "Download disaster data from S3" to make sure you have the latest data in your computer.

#### 1. Go to Airtable and update the disaster configs

You'll be probably changing things like the start and end dates, or maybe the disaster bounding box. Remember to do this first before running the backend scripts.

Link to Airtable: https://airtable.com/app3zBB0ivKnmM7Rq/tblBhKDAzfNkTcAw8/viwqNfkGq1XuMq7Zg

#### 2. Load new data

Add new data into the corresponding `/input` folders for your disaster.

#### 3. Run data processing scripts

Run the backend (`pipenv run python backend.py`) and pick "Process disaster data," then run scripts as needed. See [input data sources section below](#input-data-sources) for more info.

#### 4. Upload the data (input and output)

Run the backend (`pipenv run python backend.py`) and pick "Upload disaster data."

#### 5. Invalidate cache (if necessary)

You might need to invalidate the AWS Cloudfront cache if you see that the data has not updated on the website.

Run the backend (`pipenv run python backend.py`) and pick "Invalidate cache."

---

### If you want to use a local disasters config file (and not Airtable)

- Start by downloading the current disasters config from Airtable by running `pipenv run python utils/get_disasters_config.py`
- Manually modify the file located in `output/disasters/disasters.json`
- To run backend scripts and use that local file, remember to pass the `--local` flag to the script, for example: `pipenv run python backend.py -d THE_DISASTER_ID -s process_fb_mobility_data --local`

---

# Input Data Sources

Readymapper allows you to pull together data from many different sources. Each possible source is detailed below. Most data sources are optional. If data is missing, the relevant components will simply not appear on the map or in the generated reports.

- [Input Data Sources](#input-data-sources)
    + [Fire Perimeters - From NIFC](#fire-perimeters---from-nifc)
    + [Fire Perimeters - From Satellite Data](#fire-perimeters---from-satellite-data)
    + [Hurricane Data](#hurricane-data)
    + [Healthcare - HHS Data](#healthcare---hhs-data)
    + [Healthcare - HIFLD](#healthcare---hifld)
    + [Healthcare - FQHC](#healthcare---fqhc)
    + [Power Outages](#power-outages)
    + [Power Dependent Medicare Users (DME)](#power-dependent-medicare-users-dme)
    + [Facebook Population Density](#facebook-population-density)
    + [Facebook Mobility](#facebook-mobility)
    + [Mapbox Activity](#mapbox-activity)
    + [Census Places + Counties](#census-places---counties)
    + [Mapbox Driving-time Isochrones](#mapbox-driving-time-isochrones)

---

### Fire Perimeters - From NIFC

**Type**: GeoJSON MultiPolygon

**Filename**: YYYYMMDD.geojson

**Update frequency**: daily

One file per day, each file a geojson FeatureCollection with a single MultiPolygon feature representing the fire perimeter measured on that day. The date is parsed from the filename.

#### Steps to download and process

We have scripts to download and process this data automatically:

1. Update the Airtable table, making sure you have the updated start and end dates for the disaster.
2. Download the data (`pipenv run python backend.py`)
  - Pick "Process disaster data"
  - Pick the disaster
  - Pick "Download Fire Perimeter Data"
3. Process the data (`pipenv run python backend.py`)
  - Pick "Process disaster data"
  - Pick the disaster
  - Pick "Process Fire Perimeter Data"
4. Upload the data (`pipenv run python backend.py`)
  - Pick "Upload disaster data to S3"

#### Sources
- [WFIGS NIFC Current](https://data-nifc.opendata.arcgis.com/search?tags=Category%2C2021_wildlandfire_opendata) (well organized, TBD if multi-day progressions are available)
- [WFIGS NIFC Historic](https://data-nifc.opendata.arcgis.com/search?tags=Category%2Chistoric_wildlandfire_opendata) (well organized, TBD if multi-day progressions are available)
- http://ftp.wildfire.gov/ (weirdly organized, but the data is often there. E.g. [for Dixie](https://ftp.wildfire.gov/public/incident_specific_data/calif_n/!CALFIRE/!2021_Incidents/CA-BTU-009205_Dixie/IR/NIROPS/))

---

### Fire Perimeters - From Satellite Data

**Type**: Downloaded from API as CSV

**Update frequency**: Every 12 hours or ledd

This data is yet used in the app. It downloads data from MODIS and VIIRS satellites, using the NASA FIRMS API.

#### Steps to download and process

We have scripts to download and process this data automatically:

1. Update the Airtable table, making sure you have the updated start and end dates for the disaster.
2. Download and process the data (`pipenv run python backend.py`)
  - Pick "Process disaster data"
  - Pick the disaster
  - Pick "Download and Process Fire Pixel Data"
3. Upload the data (`pipenv run python backend.py`)
  - Pick "Upload disaster data to S3"

#### Sources
- [NASA FIRMS API](https://firms.modaps.eosdis.nasa.gov/api/)

---

### Hurricane Data

**Type**: Can be downloaded automatically using the script, or downloaded from NOAA website

**Update frequency**: During a hurricane, NOAA publishes new data from once per day to several times a day, depending on the data set

There are four different hurricane input data sets, each with its own input folder:

```
└── disasters
  ├── [DISASTER_ID]
      ├── noaa-5day-advisories
          ├── [PLACE THE DATA HERE]
      ├── noaa-flood-warnings
          ├── [PLACE THE DATA HERE]
      ├── noaa-wind-probabilities
          ├── [PLACE THE DATA HERE]
      ├── noaa-wind-radii
          ├── [PLACE THE DATA HERE]
```

#### Automatic download

We have scripts to download and process this data automatically:

1. Update the Airtable table, making sure you have the updated start and end dates for the disaster. Also make sure you fill in the `nhcStormId` field, otherwise this won't work. You can get the official NHC Storm ID from https://www.nhc.noaa.gov/gis/archive_forecast.php.
2. Download the data (`pipenv run python backend.py`)
  - Pick "Process disaster data"
  - Pick the disaster
  - Pick "Download Hurricane Data"
3. Process the data (`pipenv run python backend.py`)
  - Pick "Process disaster data"
  - Pick the disaster
  - Pick "Process Hurricane Data"
4. Upload the data (`pipenv run python backend.py`)
  - Pick "Upload disaster data to S3"

#### Manual download

If you have any issues with the automatic download, you can download manually by following the steps below.

All NOAA data comes from https://www.nhc.noaa.gov/gis/. See below for detailed instructions about where and how to download.

#### noaa-5day-advisories

**Type**: ZIP (zipped shapefile)

1. Go to https://www.nhc.noaa.gov/gis/archive_forecast.php
2. Select the year and click Choose Data
3. Select the hurricane or tropical storm for which you want to download data
4. Download all new .zip files for the selected hurricane into the `noaa-5day-advisories` directory. Ignore the .kmz files.

#### noaa-flood-warnings

**Type**: KML

1. Go to https://www.nhc.noaa.gov/gis/archive_wsurge.php
2. Select the year and click Show Data
3. Select the hurricane or tropical storm for which you want to download data
4. Download all new .kml files for the selected hurricane into the `noaa-flood-warnings` directory.

#### noaa-wind-probabilities

**Type**: ZIP (zipped shapefile)

1. Go to https://www.nhc.noaa.gov/gis/archive_wsp.php
2. Select the year and click Show Data
3. Unlike the other data sets, this one is not organized by storm name. You have to scroll down to the date you are looking for. The filenames are in the format YYYYMMDDHH.
4. For each timestamp you are interested in, download the file ending in `_wsp_120hr5km.zip` into the `noaa-wind-probabilities` directory. Ignore the .kmz files and the `120hrhalfDeg.zip` file.

#### noaa-wind-radii

**Type**: ZIP (zipped shapefile)

1. Go to https://www.nhc.noaa.gov/gis/archive_forecast_info.php
2. Select the year and click Show Data
3. Select the hurricane or tropical storm for which you want to download data
4. Download all new .zip files for the selected hurricane into the `noaa-wind-radii` directory. Ignore the .kmz files.

#### Steps to process

After downloading the latest hurricane input data as described above:

1. Process the data (`pipenv run python backend.py`)
  - Pick "Process disaster data"
  - Pick the disaster
  - Pick "Hurricane Data"
2. Upload the data (`pipenv run python backend.py`)
  - Pick "Upload disaster data to S3"

#### Sources
- [NHC Data in GIS Formats](https://www.nhc.noaa.gov/gis/)
- [NHC Tropical Cyclone Graphical Product Descriptions
](https://www.nhc.noaa.gov/aboutnhcgraphics.shtml)
- [National Hurricane Center Product Description Document:
A User’s Guide to Hurricane Products](https://www.nhc.noaa.gov/pdf/NHC_Product_Description.pdf)

---

### Healthcare - HHS Data

**Type**: Downloaded from API as JSON

**Update frequency**: It is worth trying to update the data daily, even though data will frequently have a week lag

HHS data provides the most update healthcare data (usually about a week old) with bed occupancy rates. However, it only contains hospitals, and does not cointain other types of healthcare facilities.

We use this data only to display the bed occupancy rates; for all other purposes, we use the HIFLD data for national healthcare data and a California specific dataset for disaster that are only in California.

#### Steps to download and process

We have scripts to download and process this data automatically:

1. Update the Airtable table, making sure you have the updated start and end dates for the disaster.
2. Download and process the data (`pipenv run python backend.py`)
  - Pick "Process disaster data"
  - Pick the disaster
  - Pick "HHS Bed Capacity Data"
3. Upload the data (`pipenv run python backend.py`)
  - Pick "Upload disaster data to S3"

#### Sources

- https://healthdata.gov/resource/anag-cw7u.json

---

### Healthcare - HIFLD

**Type**: Downloaded from API

**Update frequency**: Unknown; depends on how frequently HIFLD updates it

We use HIFLD data for any disaster not in California. It provides locations and information of healthcare facilities nationally, sometimes with bed capacities, but does not have bed occupancy data. For disaster that are only in California, we use a more detailed dataset that is CA-only, located in S3 as the file `output/current-california-healthcare-facility-listing.csv`. This CSV was provided by Direct Relief.

#### Steps to download and process

We have scripts to download and process this data automatically:

1. This data is not specific to a particular disaster, so you don't need to worry about updating Airtable.
2. Download and process the data (`pipenv run python backend.py`)
  - Pick "Download and process HIFLD data"
3. Upload the data (`pipenv run python backend.py`)
  - Pick "Upload HIFLD data"

#### Sources

- https://opendata.arcgis.com/api/v3/datasets/78c58035fb3942ba82af991bb4476f13_0/

---

### Healthcare - FQHC

**Type**: Downloaded from API

**Update frequency**: Unknown; depends on how frequently FQHC updates it

We use FQHC data for any disaster not in California. It provides locations and information of primary care facilities nationally. We combine it with HIFLD data to have a comprehensive list of healthcare facilities outside of California.

#### Steps to download and process

We have scripts to download and process this data automatically:

1. This data is not specific to a particular disaster, so you don't need to worry about updating Airtable.
2. Download and process the data (`pipenv run python backend.py`)
  - Pick "Download and process FQHC data"
3. Upload the data (`pipenv run python backend.py`)
  - Pick "Upload FQHC data"

#### Sources

- https://services1.arcgis.com/ZGrptGlLV2IILABw/arcgis/rest/services/FQHC_LAL_AllSites_2021/FeatureServer/0/

---

### Power Outages

**Type**: Manual CSV input, or downloaded from API

**Update frequency**: Source data updated continuously

This data is provided by Poweroutages.us. Running the script will automatically download the latest snapshot of data at both city and county granularities. The script can be run multiple times and it will merge previous downloads and remove duplicate data. This script should be run periodically for good coverage of data during a disaster as historical data is not available automatically from the source API.

The script also checks for the presence of manual input files and use those instead of downloaded files if possible. Manual city level data must be named `city-power-outages.csv` and manual county level data must be named `county-power-outages.csv`. Data files downloaded automatically from the source API are named with their collection date timestamp.

#### In case you have CSV data and don't want to download it from the API

Place manual data files here, in case you have them, otherwise you can skip the step and the script will try to fetch data from the API:

```
  └── disasters
    ├── [DISASTER_ID]
        ├── power-outages
```

#### Steps to download and process

1. Update the Airtable table, making sure you have the updated start and end dates for the disaster.
2. Download (if no manual CSV input is in the folder) and process the data (`pipenv run python backend.py`)
  - Pick "Process disaster data"
  - Pick the disaster
  - Pick "Power Outage Data"
3. Upload the data (`pipenv run python backend.py`)
  - Pick "Upload disaster data to S3"

---

### Power Dependent Medicare Users DME

**Type**: CSV

**Update frequency**: ?

This data was provided by Direct Relief in a CSV format, for all US counties. It was uploaded to S3 at `output/dme/dme_all_states_202209.csv`. Right now the processing is all done by the web application in the [dme.js file](proto-app/src/layers/dme.js).

---

### Facebook Population Density

**Type**: CSV

**Update frequency**: Depends on Facebook, usually every 8 hours

#### Steps to download and process

This data is downloaded manually from Facebook, then processed using scripts. The script will clip the data to the bounding box of the disaster and between the start and end dates of the disaster.

1. Update the Airtable table, making sure you have the updated start and end dates for the disaster.
2. Download the data manually and place it in the input folder
  ```
  └── disasters
    ├── [DISASTER_ID]
        ├── facebook
            ├── population-density
                └── tile
                    ├── [PLACE THE DATA HERE]
                └── admin
                    ├── [PLACE THE DATA HERE]
  ```
3. Process the data (`pipenv run python backend.py`)
  - Pick "Process disaster data"
  - Pick the disaster
  - Pick "Facebook Population Density Data"
4. Upload the data (`pipenv run python backend.py`)
  - Pick "Upload disaster data to S3"

Note: this requires that you have downloaded Census data locally, as it is used in the processing of the FB data. If you don't the script will try to download it from S3. In case it is not on S3, check out the [Census Places + Counties](#census-places---counties) section of this readme to download it.

#### Sources

- Facebook, manual download

---

### Facebook Mobility

**Type**: CSV

**Update frequency**: Depends on Facebook, usually every 8 hours

#### Steps to download and process

This data is downloaded manually from Facebook, then processed using scripts. The script will clip the data to the bounding box of the disaster and between the start and end dates of the disaster.

1. Update the Airtable table, making sure you have the updated start and end dates for the disaster.
2. Download the data manually and place it in the input folder
  ```
  └── disasters
    ├── [DISASTER_ID]
        ├── facebook
            ├── mobility
                └── tile
                    ├── [PLACE THE DATA HERE]
                └── admin
                    ├── [PLACE THE DATA HERE]
  ```
3. Process the data (`pipenv run python backend.py`)
  - Pick "Process disaster data"
  - Pick the disaster
  - Pick "Facebook Population Mobility Data"
4. Upload the data (`pipenv run python backend.py`)
  - Pick "Upload disaster data to S3"

- Facebook, manual download

#### Sources

- Mapbox, manual download

---

### Mapbox Activity

**Type**: Parquet

**Update frequency**: Depends on Mapbox

#### Steps to download and process

This data is downloaded manually from Mapbox, then processed using scripts. The script will clip the data to the bounding box of the disaster and between the start and end dates of the disaster.

1. Update the Airtable table, making sure you have the updated start and end dates for the disaster.
2. Download the data manually and place it in the input folder
  ```
  └── disasters
    ├── [DISASTER_ID]
        ├── mapbox-activity
            ├── [PLACE THE DATA HERE]
  ```
3. Process the data (`pipenv run python backend.py`)
  - Pick "Process disaster data"
  - Pick the disaster
  - Pick "Process Mapbox Mobility Data"
4. Normalize the data (`pipenv run python backend.py`)
  - Pick "Process disaster data"
  - Pick the disaster
  - Pick "Normalize Mapbox Mobility Data"
5. Upload the data (`pipenv run python backend.py`)
  - Pick "Upload disaster data to S3"

#### Sources

- Mapbox, manual download

---

### Census Places + Counties

**Type**: Downloaded from API as GEOJSON

**Update frequency**: Only when there is a new Census vintage, no more frequent than yearly

#### Steps to download and process

We have scripts to download and process this data automatically:

Fetch the raw census data:
```
cd census-data-fetcher  # cd into the directory
npm install  # install packages
node fetch.js  # fetch the data
```

Process it:
```
pipenv run python process_census_data.py
```

Upload it:
```
pipenv run python backend.py -s upload_census_data
```

If you want to fetch census data for more recent years, bump the census vintage year [here](./census-data-fetcher/fetch.js).

#### Sources

- US Census, via API using the Census Bureau's [citysdk npm package](https://www.npmjs.com/package/citysdk)

---

### GADM Admin Boundaries

We use GADM admin boundaries for disasters outside of the US (those marked in Airtable as checked in the `isInternational` columns).

Note: this is currently a bit of a hack, as the app was originally designed only with US disasters in mind. When we process the GADM data, we add columns to it so that it will match the schema of US counties and places.

**Type**: Downloaded from GADM website as Geopackage

**Update frequency**: Only when you need to add a new country, or when country admin boundaries change

#### Steps to download and process

We've currently downloaded GADM data for all of the world. If you need to update some of the data, you need to download it manually from the GADM website.

1. First, run the script to make sure you have the most up to date input data by running `pipenv run python backend.py -s download_gadm_data`
2. Go to the [GADM website](https://gadm.org/download_country.html)
3. Pick the country you need to update
4. Download it as a Geopackage file
5. Save it in the `data_backend/input/gadm`
6. Process the data `pipenv run python process_gadm_data.py`
7. Upload the data `pipenv run python backend.py -s upload_gadm_data`


#### Sources

- [GADM website](https://gadm.org/)

---

### Mapbox Driving-time Isochrones

This data is fetched automatically by the web browser running the application, so you don't need to worry about it. It reflects the driving times in current conditions, not historical ones. For more information check out the [Mapbox documentation here](https://docs.mapbox.com/api/navigation/isochrone/).
