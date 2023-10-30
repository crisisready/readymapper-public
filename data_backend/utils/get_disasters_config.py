import requests
import os
import json

LOCAL_CONFIG_PATH = "output/disasters/disasters.json"


def get_disasters_config(use_local=False):
    if use_local is True:
        print(f'---> getting disaster data from local file: {LOCAL_CONFIG_PATH}')
        with open(LOCAL_CONFIG_PATH) as f:
            disasters = json.load(f)
            return disasters

    try:
        with open('../configs.json') as f:
            AIRTABLE_CONFIGS = json.load(f)['airtable']

        AIRTABLE_API_KEY = AIRTABLE_CONFIGS['apiKey']
        AIRTABLE_BASE_ID = AIRTABLE_CONFIGS['baseId']
        AIRTABLE_TABLE_NAME = AIRTABLE_CONFIGS['tableName']
        AIRTABLE_VIEW_NAME = AIRTABLE_CONFIGS['viewName']

        headers = {
            'Authorization': f'Bearer {AIRTABLE_API_KEY}',
        }
        params = (
            ('maxRecords', '1000'),
            ('view', AIRTABLE_VIEW_NAME),
        )

        print('---> getting disaster data from Airtable')
        response = requests.get(f'https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{AIRTABLE_TABLE_NAME}', headers=headers, params=params)
        data = response.json()
        records = [x['fields'] for x in data['records']]
        print(f'---> found {len(records)} disaster configs')
        return records
    except Exception as e:
        print('---> found an error getting disaster data from Airtable')
        print('---> Airtable response:')
        print(response.json())
        raise e


def save_disasters_config_locally():
    records = get_disasters_config()
    config_file_path = LOCAL_CONFIG_PATH
    print(f"---> saving config file to: {config_file_path}")
    with open(config_file_path, "w") as fp:
        json.dump(records, fp, indent=4)


if __name__ == '__main__':
    # run as a script, not imported as a module
    save_disasters_config_locally()
