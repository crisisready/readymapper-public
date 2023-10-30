import pandas as pd
import glob
import json

with open('../configs.json') as f:
    CONFIGS = json.load(f)

disasters_input_folder = "input/disasters"
disasters_output_folder = "output/disasters"
disasters = glob.glob(f"{disasters_input_folder}/*")
disaster_types = [
    "fire",
    "hurricane",
    "cyclone",
]
s3_bucket = CONFIGS['s3']['bucket']
cloudfront_distribution_id = CONFIGS['s3']['cloudfrontDistributionId']
