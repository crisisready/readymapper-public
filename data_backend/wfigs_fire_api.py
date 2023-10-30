import requests
import sys
import json


"""
E.g. usage for now: pipenv run python wfigs_fire_api.py washburn
"""


def download_latest_fire_perimeter(query_fire_id):
    fields = [
        'poly_IncidentName',
        'irwin_IncidentName',
        'poly_PolygonDateTime',
        'poly_DateCurrent',
        'poly_CreateDate',
        'poly_GlobalID',
        'irwin_UniqueFireIdentifier'
    ]

    params = (
        ('where', f'poly_GlobalID=\'{query_fire_id}\''),
        ('outFields', ','.join(fields)),
        ('returnGeometry', 'true'),
        ('outSR', '4326'),
        ('f', 'geoJSON')
    )
    response = requests.get(
        'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Current_WildlandFire_Perimeters/FeatureServer/0/query',
        params=params
    )
    data = response.json()
    print(json.dumps(data, indent=4))


def search_active_fire_perimeters(query_fire_name=None):
    """
    Returns active perimeter names and ids where incident name
    partially matches queried name
    """

    fields = [
        'poly_IncidentName',
        'irwin_IncidentName',
        'poly_PolygonDateTime',
        'poly_DateCurrent',
        'poly_CreateDate',
        'poly_GlobalID',
        'irwin_UniqueFireIdentifier'
    ]

    params = (
        ('where', '1=1'),
        ('outFields', ','.join(fields)),
        ('returnGeometry', 'false'),
        ('outSR', '4326'),
        ('f', 'geoJSON')
    )
    response = requests.get(
        'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Current_WildlandFire_Perimeters/FeatureServer/0/query',
        params=params
    )
    data = response.json()
    fire_names = [
        dict(name=f['properties']['poly_IncidentName'], id=f['properties']['poly_GlobalID'])
        for f in data['features']
    ]
    if query_fire_name is not None:
        fire_names = [
            f for f in fire_names
            if query_fire_name.lower() in f['name'].lower()
        ]

    if len(fire_names) > 0:
        print('\n'.join([f"{f['name']} {f['id']}" for f in fire_names]))
    else:
        print(f"Found no active fire perimeters matching '{query_fire_name}'")


if __name__ == "__main__":
    search_active_fire_perimeters(sys.argv[1])
    # download_latest_fire_perimeter('{EE5EAB88-C564-45B1-9B99-20A2AC618AA0}')