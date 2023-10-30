from utils.convert_geojson_to_fgb import convert_geojson_to_fgb
import sys


def process_census_data(vintage):
    files = [
        f'output/census/{vintage}/all/acs-counties.geojson',
        f'output/census/{vintage}/all/acs-places.geojson',
        # f'output/census/{vintage}/all/acs-tracts.geojson',
    ]

    for file in files:
        print(f"--> Processing {file}")
        convert_geojson_to_fgb(
            file, file.replace('.geojson', '.fgb')
        )


if __name__ == '__main__':
    vintage = 2020
    if len(sys.argv) > 1:
        vintage = sys.argv[1]

    process_census_data(vintage)
