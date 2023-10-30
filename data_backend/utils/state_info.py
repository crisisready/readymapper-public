import pandas as pd

def fips_to_name(df, matchOn, newField):
    return set(df, newField, "Name", "FIPS", matchOn)

def fips_to_code(df, matchOn, newField):
    return set(df, newField, "Code","FIPS", matchOn)

def name_to_fips(df, matchOn, newField):
    return set(df, newField, "FIPS","Name", matchOn)

def name_to_code(df, matchOn, newField):
    return set(df, newField, "Code","Name", matchOn)

def code_to_fips(df, matchOn, newField):
    return set(df, newField, "FIPS","Code", matchOn)

def code_to_name(df, matchOn, newField):
    return set(df, newField, "Name","Code", matchOn)

def set(df, newField, a, b, bMatch):
    try:
        states = pd.read_csv(f"utils/state_info.csv", dtype=str)
        states.set_index(a)
        df = df.merge(states[[a, b]], left_on=bMatch, right_on=b)
        # TODO: add some logic here to deal with merge collisions
        df = df.rename(columns={a: newField})
        df = df.drop(columns=b)
        return df
    except Exception as e:
        print(f"------> {e}")
