from pathlib import Path
from argparse import (ArgumentParser, ArgumentTypeError)
import re
import json

import configs
from constants.census import US_STATES

DISASTERS_INPUT_FOLDER = configs.disasters_input_folder
US_STATES_ABBREV = [x['abbrev'] for x in US_STATES]


def disaster_id_regex_type(arg_value, pat=re.compile(r"^[0-9a-z\-]+$")):
    if not pat.match(arg_value):
        print("---> Error: disaster ID must contain only lower case letters, hyphens, and numbers")
        print(f"---> your disaster ID: '{arg_value}'")
        raise ArgumentTypeError
    return arg_value


def disaster_base_folder(disaster_id):
    return f"{DISASTERS_INPUT_FOLDER}/{disaster_id}"


def create_config_file(disaster_base_folder, disaster_id, disaster_type, disaster_name, latitude, longitude, zoom, date_start, date_end, hour_interval, states_affected):
    config = {
        "id": args['disaster_id'],
        "type": args['disaster_type'],
        "name": args['disaster_name'],
        "lat": args['latitude'],
        "lng": args['longitude'],
        "zoom": args['zoom'],
        "dateStart": args['date_start'],
        "dateEnd": args['date_end'],
        "dataReportingIntervalHours": args['hour_interval'],
        "usStatesAffected": args['states_affected'],
        "boundingBox": {
          "sw": {
            "lng": False,
            "lat": False
          },
          "ne": {
            "lng": False,
            "lat": False
          }
        },
        "draft": True,
        "default": False,
    }

    config_file_path = f"{disaster_base_folder(args['disaster_id'])}/config.json"
    print(f"---> saving config file to: {config_file_path}")
    with open(config_file_path, "w") as fp:
        json.dump(config, fp, indent=4)


if __name__ == '__main__':
    # run as a script, not imported as a module
    parser = ArgumentParser(description='Create folder structure for a new disaster')
    parser.add_argument('-d', '--disaster', help='Disaster ID',
                        required=True, type=disaster_id_regex_type)
    parser.add_argument('-n', '--name', help='Disaster name',
                        required=True, type=str)
    parser.add_argument('-t', '--type', help='Disaster type',
                        required=True, choices=configs.disaster_types)
    parser.add_argument('-s', '--states', help='A list of US state(s) affected',
                        required=True, choices=US_STATES_ABBREV, nargs='+')
    parser.add_argument('-hi', '--hourInterval', help='The interval between two data reporting times, in hours. Controls the timeslider',
                        nargs='?', default=8, type=int)
    parser.add_argument('-lat', '--latitude', help='The starting latitude for the map view',
                        nargs='?', default=0, type=float)
    parser.add_argument('-lng', '--longitude', help='The starting longitude for the map view',
                        nargs='?', default=0, type=float)
    parser.add_argument('-z', '--zoom', help='The starting zoom level for the map view, 1-22',
                        nargs='?', default=9, type=float)
    parser.add_argument('-ds', '--dateStart', help='The starting date and time for the disaster',
                        nargs='?', default='2022-01-01 0:00', type=str)
    parser.add_argument('-de', '--dateEnd', help='The end date and time for the disaster',
                        nargs='?', default='2022-01-06 0:00', type=str)
    args = vars(parser.parse_args())
    create_folder_structure(args['disaster_id'])
    create_config_file(args)


def create_folder_structure(disaster_id):
    def create_folder(disaster_id, path):
        full_path = f"{disaster_base_folder(disaster_id)}/{path}"
        print(f"---> creating folder: {full_path}")
        Path(full_path).mkdir(parents=True, exist_ok=True)

    folders_to_create = [
        "",  # root dir
        "facebook/mobility/admin",
        "facebook/mobility/tile",
        "facebook/population-density/tile",
        "facebook/population-density/admin",
        "mapbox-activity",
        "spatial-data/disaster-perimeters",
        "power-outages",
    ]

    for folder in folders_to_create:
        create_folder(disaster_id, folder)
