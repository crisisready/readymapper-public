def filter_df_by_bbox(df, disaster_config, lat_col, lon_col):
    """
    Filters a df by a bounding box from a
    disaster config file.
    """
    try:
        swLng = disaster_config["swLng"]
        swLat = disaster_config["swLat"]
        neLng = disaster_config["neLng"]
        neLat = disaster_config["neLat"]
        if (neLat is not False and neLng is not False
           and swLat is not False and swLng is not False):
            print(f"------> clipping data to bounding box {[swLng, swLat]}, {[neLng, neLat]}")
            return df[(df[lon_col].between(swLng, neLng))
                      & (df[lat_col].between(swLat, neLat))]
        else:
            return df
    except Exception as e:
        print(f"------> could not clip to bounding box: {e}")
        return df


def filter_mobility_df_by_bbox(df, disaster_config, start_lat_col, start_lon_col, end_lat_col, end_lon_col):
    """
    Filters a df by a bounding box from a
    disaster config file, for mobility flows.
    This means that data start OR end of flows
    have to be inside of the bounding box
    """
    try:
        swLng = disaster_config["swLng"]
        swLat = disaster_config["swLat"]
        neLng = disaster_config["neLng"]
        neLat = disaster_config["neLat"]
        if (neLat is not False and neLng is not False
           and swLat is not False and swLng is not False):
            print(f"------> clipping (mobility) data to bounding box {[swLng, swLat]}, {[neLng, neLat]}")
            return df[
                      ((df[start_lon_col].between(swLng, neLng)) & (df[start_lat_col].between(swLat, neLat)))
                      |
                      ((df[end_lon_col].between(swLng, neLng)) & (df[end_lat_col].between(swLat, neLat)))
                      ]
        else:
            return df
    except Exception as e:
        print(f"------> could not clip to bounding box: {e}")
        return df
