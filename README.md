**NOTE:** This codebase contains all scripts for processing ReadyMapper data and generating the application and reports; however, data sharing agreements with certain providers require credentials which have been removed in this repo, so the repository does not provide full functionality. For complete functionality, the user must obtain all necessary credentials on their own and include them in the code. For guidance on including credentials to obtain a fully functioning code base, reach out to the CrisisReady team. 

# ReadyMapper (direct-relief)

ReadyMapper provides a way to ingest and visualize data relevant to disasters, particularly their inpact on healthcare.

It is comprised of:

- A Vue web app
- Data downloading / processing / uploading scripts (the data backend)
- User configs hosted on [Airtable](https://airtable.com/)

## Web app

A Vue app, located in [proto-app folder](./proto-app). This is where all of the web app code lives.

## Data backend

Located in [data_backend folder](./data_backend). It contains a series of scripts and a CLI tool to run them. These scripts are responsible for downloading, proessing, and uploading the data to S3.

See [the data_backend readme](./data_backend/README.md) for more details.

## Infrastructure

All of the current infrastructure / deploy specific configs are located in [configs.json file](./configs.json).

### Web app: studio.stamen.com

The web app is currently deployed at http://studio.stamen.com/direct-relief, using the [deploy.sh script](./proto-app/deploy.sh). It can be deployed to any static site server or service, such as Netlify, GitHub Pages, or Cloudfront.

### Data: S3 / Cloudfront

This is where the data for the app lives. The web app will fetch data from here to display the disaster scenarios.

### Disater configs: Airtable

The disaster configs (name of disaster, start and end dates, bounding box, etc.) live on Airtable, in [this particular table](https://airtable.com/app3zBB0ivKnmM7Rq/tblBhKDAzfNkTcAw8/viwqNfkGq1XuMq7Zg). This gives users a nice GUI to edit them, avoids problems such as concurrent edits, and gives us a nice API to fetch the configs. If you need access to the table, please ask to one of the repo owners.

### Basemap: Mapbox

We are using a Mapbox basemap with the Stamen account.

## Deploying your own

If you want to deploy this app on your own, here are the steps you'll need to do:

1. Fork this repo
2. Go to [Airtable](https://airtable.com/)
    1. Create a new base, table, and view
    2. Follow the [airtable.schema.json file](./airtable.schema.json) to create the fields in your table. You can also see the [airtable.sample.json file](./airtable.sample.json) if you need an example of values
    3. Create a separate Airtable user to as a read-only user for this table. See more [instructions on this here](https://support.airtable.com/hc/en-us/articles/360056249614-Creating-a-read-only-API-key)
    4. Get this user's API credentials and include them in the [configs.json file](./configs.json). Remember that these credentials must be **read-only**
    5. Fill in the disasters table on Airtable with information on a disaster you want to create a scenario for
3. Setup your AWS account
    1. Create an S3 bucket for the data
    2. Create a Cloudfront distribution with public-read access for the S3 bucket
    3. Include the bucket name, Cloudfront URL and distribution ID [configs.json file](./configs.json)
4. Process and upload data to S3
    1. Go to the [data_backend folder](./data_backend) and run the backend CLI script to download, process, and upload data to S3. See the [the data_backend readme](./data_backend/README.md) for more instructions
5. Deploy the Vue app
    1. Go to the [proto-app folder](./proto-app) and build the app by running `npm run install && npm run build`. You can deploy it anywhere you would deploy a static website, e.g. GitHub Pages, Nelify, Cloudfront, or your own server
