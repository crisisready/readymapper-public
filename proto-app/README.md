# direct-relief

## Project setup

Install dependencies:

```
npm install
```

Before running locally for the first time, you'll need to download data from S3.

Go to the `data_backend` directory and install the Python dependencies there.

Then, you have two options:

### 1. Download the entire `output/` folder

This is the simples solution, but you will download a lot of data. Just run `aws s3 sync s3://direct-relief-data/output ./output --profile dr`.

### 2. Downalod data for a specific disaster

- download the `disasters.json` file `pipenv run python utils/get_disasters_config.py`
- download Census data `pipenv run python backend.py -s download_census_data`
- if you're working on an international disaster, download GADM data `pipenv run python backend.py -s download_gadm_data`
- download DME data `pipenv run python backend.py -s download_dme_data`
- download specific disaster data `pipenv run python backend.py -s download_data -d YOUR_DISASTER_ID_HERE`, example: `pipenv run python backend.py -s download_data -d 2022-oak-fire`

## Run the app

### Runs in development mode, using local data

```
npm run dev
```

### Runs in production mode, using not local data but what's on S3

If you don't want to download the data, you can run the app with what's hosted on S3.

```
npm run dev-prod
```

## Deploy

```
npm run build && ./deploy.sh
```

## Data

The data can be being fetched from an AWS S3 bucket, being served from Cloudfront (URL defined in [configs.json](../configs.json)) or from the local `public/data` folder. When you run the app with `npm run dev`, it will be using the local folder. When building for production, it will use the Cloudfront data. See the `useLocalBackend` variable in [constants/settings.js](constants/settings.js) for more details.

When in production, the disaster configs are being fetched from Airtable (credentials defined in [configs.json](../configs.json)), and fetched by [the airtable client](src/store/utils/airtable-client.js). When running in development mode, the disaster configs are fetched from the `public/data/disasters/disasters.json` file.

For more information on how the data is downloaded and processed, see [the data backend readme](../data_backend/README.md).

## Static map generation

We generate the static map images for the report [here](src/components/utils/generateReportMaps.js). It does the following:

1. Saves the current map bounds (visible in the viewport)
2. Sets the map container dimensions to what we want the image to be
3. Resizes the map
4. Fits the map to the bounds saved in step 1
5. Grabs a screenshot of the map canvas by using `map.getCanvas().toDataURL()`
6. Resets map's size and bounds

Two important things to keep in mind:

- When initializing the mapboxgl map, you need to set `preserveDrawingBuffer: true` for this to work
- To make sure that the map has finished rendering, we listen to the `idle` map event, like this `await new Promise(resolve => map.once('idle', () => resolve()))`
