import fiona
import json
from fiona.crs import from_epsg
from collections import OrderedDict


def convert_geojson_to_fgb(input_file, output_file):
    data = []
    with open(input_file) as f:
        data = json.load(f)

    properties_sample = data['features'][0]['properties']

    properties_order = OrderedDict([
        # assign everything as strings,
        # in the order of the first object
        (x, 'str') for x in properties_sample
    ])

    schema = {
        'geometry': 'MultiPolygon',
        'properties': properties_order
    }

    with fiona.open(output_file, 'w',
                    driver="FlatGeobuf",
                    crs=from_epsg(4326),
                    schema=schema) as src:
        for f in data['features']:
            reordered_props = {k: f['properties'][k] for k in properties_order}
            if f['geometry']['type'] == 'Polygon':
                coordinates = f['geometry']['coordinates']
                # convert Polygons into MultiPolygons to have only one type
                src.write({
                    "geometry": {
                        'type': 'MultiPolygon', 'coordinates': [coordinates]
                    },
                    "properties": reordered_props
                })
            elif f['geometry']['type'] == 'MultiPolygon':
                src.write({
                    "geometry": f['geometry'],
                    "properties": reordered_props
                })
            else:
                pass
