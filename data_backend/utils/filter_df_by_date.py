import pandas as pd


def filter_df_by_date(df, disaster_config, date_col):
    """
    Filters a df by a date range, throws out all rows outside of the range.
    """
    date_start = pd.Timestamp(disaster_config["dateStart"])
    if disaster_config["isOngoing"] is True:
        print(f"---> this is an ongoing disaster, filtering for dates >= than {date_start}")
        return df[df[date_col] >= date_start]
    date_end = pd.Timestamp(disaster_config["dateEnd"])
    print(f"---> filtering data between dates {date_start} and {date_end}")
    return df[df[date_col].between(date_start, date_end)]
