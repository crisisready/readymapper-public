import json

def filter_df_by_bbox_fips(df, disaster_config, fipsField):
    """
    Filters a df by a bounding box from a
    disaster config file.
    """
    try:
        with open(f"utils/geojson-counties-fips.json") as f:
            geojson_counties_fips = json.load(f)
        bounds = {
            "ne": {
                "lat": disaster_config["neLat"],
                "lng": disaster_config["neLng"]
            },
            "sw": {
                "lat": disaster_config["swLat"],
                "lng": disaster_config["swLng"]
            }
        }
        print(f"------> clipping data to bounding box ne: {bounds['ne']}, sw: {bounds['sw']}")
        filtered_fips = [county["id"] for county in geojson_counties_fips["features"] if bounds_contain_county(bounds, county)]
        print(f"------> filtered fips: {filtered_fips}")
        return df[df[fipsField].isin(filtered_fips)]
    except Exception as e:
        print(f"------> could not clip to bounding box: {e}")
        return df

def bounds_contain_county(bounds, county):
    if county["geometry"]["type"] == "Polygon":
        return bounds_contain_some_polygon_points(bounds, [county["geometry"]["coordinates"][0]])
    elif county["geometry"]["type"] == "MultiPolygon":
        return bounds_contain_some_polygon_points(bounds, county["geometry"]["coordinates"][0])

# Not really an intersection, just a fast check for contained points,
# given that we expect the bounds to be far larger than county polygons.
def bounds_contain_some_polygon_points(bounds, polygons):
    contains_some_points = False
    for polygon in polygons:
        for point in polygon:
            if point_within(bounds, point):
                contains_some_points = True
                break
        if contains_some_points:
            break
    return contains_some_points

def point_within(bounds, point):
    if (point[0] > bounds["sw"]["lng"] and point[0] < bounds["ne"]["lng"]) and (point[1] > bounds["sw"]["lat"] and point[1] < bounds["ne"]["lat"]):
        return True
    else:
        return False
