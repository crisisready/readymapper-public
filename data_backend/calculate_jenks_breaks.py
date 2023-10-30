import jenkspy
import pandas as pd
import json
import numpy as np
import os

INPUT_FOLDER = 'input/hrsl'
OUTPUT_FOLDER = 'output'
OUTPUT_JSON_FILE = f"{OUTPUT_FOLDER}/jenks-breaks/intl_jenks_breaks.json"

def calculate_jenks_breaks(disaster_config):
    iso_codes = disaster_config.get('isoCode')
    id_value = disaster_config.get('id')

    if not iso_codes or not id_value:
        return "No ISO Code or ID specified in the airtable or the local disasters config JSON"

    hrsl_file_path = f"{INPUT_FOLDER}/adm_2_hrsl.csv"
    hrsl_data = pd.read_csv(hrsl_file_path)
    hrsl_data_filtered = hrsl_data[hrsl_data['iso_code'].isin(iso_codes)]
    hrsl_data_filtered.loc[hrsl_data_filtered['total_population'] == 0, 'total_population'] = np.nan

    column_mapping = {
        'elderly_60_plus_population': 'percentPopElderly',
        'women_population': 'percentPopWomen',
        'children_under_5_population': 'percentPopChildren',
    }

    result_dict = {id_value: {}}
    for category in column_mapping:
        percent_col = f'percent_{category}'
        
        if hrsl_data_filtered[category].isna().all():
            result_dict[id_value][column_mapping[category]] = None
            continue

        hrsl_data_filtered[percent_col] = hrsl_data_filtered[category] / hrsl_data_filtered['total_population']
        hrsl_data_filtered[percent_col] = np.where(np.isfinite(hrsl_data_filtered[percent_col]), hrsl_data_filtered[percent_col], 0)

        percent_values = hrsl_data_filtered[percent_col].dropna().to_list()
        if percent_values:
            result_dict[id_value][column_mapping[category]] = [round(x, 2) for x in jenkspy.jenks_breaks(percent_values, n_classes=4)]
        else:
            result_dict[id_value][column_mapping[category]] = None

    # Load existing data if JSON file exists
    if os.path.exists(OUTPUT_JSON_FILE):
        with open(OUTPUT_JSON_FILE, "r") as json_file:
            existing_data = json.load(json_file)
    else:
        existing_data = {}

    # Update the existing data with the new result
    existing_data.update(result_dict)

    # Save the updated data to the JSON file
    with open(OUTPUT_JSON_FILE, "w") as json_file:
        json.dump(existing_data, json_file)