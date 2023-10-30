import inquirer
import configs
from argparse import ArgumentParser

from utils.get_disasters_config import get_disasters_config
from utils.run_bash_command import run_bash_command

from create_new_disaster import create_folder_structure
from process_fb_mobility_data import process_fb_mobility_data
from process_fb_pop_density_data import process_fb_pop_density_data
from download_fire_perimeter_data import download_fire_perimeter_data
from process_fire_perimeter import process_fire_perimeter
from download_fire_pixel_data import download_fire_pixel_data
from process_smoke_data import process_smoke_data
from process_hurricane_data import process_hurricane_data
from download_hurricane_data import download_hurricane_data
from process_cyclone_data import process_cyclone_data
from download_cyclone_data import download_cyclone_data
from process_hhs_bed_capacity_data import process_hhs_bed_capacity_data
from process_mapbox_mobility_data import process_mapbox_mobility_data
from normalize_mapbox_activity_data import normalize_mapbox_activity_data
from process_power_outages_data import process_power_outages_data
from process_hifld_healthcare_facilities import process_hifld_healthcare_facilities
from download_and_process_fqhc_healthcare_facilities import download_and_process_fqhc_healthcare_facilities
from process_gadm_data import process_gadm_data
from process_hrsl_data import process_hrsl_data
from calculate_jenks_breaks import calculate_jenks_breaks


def invalidate_cache(paths="/*"):
    print(f"---> invalidating cache for path: {paths}")
    run_bash_command(f"aws cloudfront create-invalidation --distribution-id {configs.cloudfront_distribution_id} --paths '{paths}' --profile dr")


def upload_hifld_healthcare_facilities():
    command = f"aws s3 sync ./output/hifld/ s3://{configs.s3_bucket}/output/hifld/ --profile dr"
    run_bash_command(command)
    # invalidate_cache(f"/{configs.s3_bucket}/output/hifld/*")


def upload_fqhc_healthcare_facilities():
    command = f"aws s3 sync ./output/fqhc/ s3://{configs.s3_bucket}/output/fqhc/ --profile dr"
    run_bash_command(command)
    # invalidate_cache(f"/{configs.s3_bucket}/output/fqhc/*")


def download_census_data():
    command = f"aws s3 sync s3://{configs.s3_bucket}/output/census ./output/census --profile dr"
    run_bash_command(command)


def upload_census_data():
    command = f"aws s3 sync ./output/census s3://{configs.s3_bucket}/output/census --profile dr"
    run_bash_command(command)


def download_dme_data():
    command = f"aws s3 sync s3://{configs.s3_bucket}/output/dme ./output/dme --profile dr"
    run_bash_command(command)


def upload_dme_data():
    command = f"aws s3 sync ./output/dme s3://{configs.s3_bucket}/output/dme --profile dr"
    run_bash_command(command)


def download_gadm_data():
    command = f"aws s3 sync s3://{configs.s3_bucket}/input/gadm ./input/gadm --profile dr"
    run_bash_command(command)
    command = f"aws s3 sync s3://{configs.s3_bucket}/output/gadm ./output/gadm --profile dr"
    run_bash_command(command)


def upload_gadm_data():
    command = f"aws s3 sync ./input/gadm s3://{configs.s3_bucket}/input/gadm --profile dr"
    run_bash_command(command)
    command = f"aws s3 sync ./output/gadm s3://{configs.s3_bucket}/output/gadm --profile dr"
    run_bash_command(command)

def download_hrsl_data():
    command = f"aws s3 sync s3://{configs.s3_bucket}/input/hrsl ./input/hrsl --profile dr"
    run_bash_command(command)

def upload_hrsl_data():
    command = f"aws s3 sync ./input/hrsl s3://{configs.s3_bucket}/input/hrsl --profile dr"
    run_bash_command(command)

def upload_jenks_breaks_data():
    command = f"aws s3 sync ./output/jenks-breaks s3://{configs.s3_bucket}/output/jenks-breaks --profile dr"
    run_bash_command(command)


def sync_data(disaster_id, root_folder, up_or_down):
    # root_folder is 'input' or 'output'
    # up_or_down is 'upload' or 'download'
    disaster_folder = f"{root_folder}/disasters/{disaster_id}/"

    local_folder = f'./{disaster_folder}'
    remote_folder = f's3://{configs.s3_bucket}/{disaster_folder}'

    from_folder = local_folder if up_or_down == 'upload' else remote_folder
    to_folder = remote_folder if up_or_down == 'upload' else local_folder

    command = f'aws s3 sync {from_folder} {to_folder} --profile dr'
    print(f'---> [PREVIEW] {up_or_down}ing {root_folder.upper()} data for disaster: {disaster_id}')
    run_bash_command(f'{command} --dryrun')
    confirm_prompt = [inquirer.Confirm('confirm', message=f"Do you really want to {up_or_down} the files above (an empty line means there are no files to {up_or_down})?")]
    confirm_answer = inquirer.prompt(confirm_prompt)['confirm']
    if confirm_answer is True:
        print(f'---> {up_or_down}ing {root_folder.upper()} data for disaster: {disaster_id}')
        run_bash_command(command)

        if up_or_down == 'upload':
            paths = f"{remote_folder.replace('s3://', '/')}*"
            # invalidate_cache(paths)


def prompt_user():
    ACTIONS = (
        "Create folders for a new disaster",
        "Download disaster data from S3",
        "Process disaster data",
        "Upload disaster data to S3",
        "Invalidate cache",
        "Download and process HIFLD data",
        "Upload HIFLD data",
        "Download and process FQHC data",
        "Upload FQHC data",
        "Download Census data",
        "Upload Census data",
        "Download DME data",
        "Upload DME data",
        "Download GADM data",
        "Process GADM data",
        "Upload GADM data",
        "Download HRSL data",
        "Process HRSL data",
        "Upload HRSL data",
        "Upload Jenks Breaks data"
    )
    action_prompt = [inquirer.List('action', message="What do you want to do?", choices=ACTIONS)]
    action_answer = inquirer.prompt(action_prompt)


    if action_answer['action'] in ACTIONS[0:4]:
        # these are the actions that require a disaster_id
        disaster_prompt = [inquirer.List('disaster_id', message="Pick a disaster", choices=DISASTER_IDS)]
        disaster_id = inquirer.prompt(disaster_prompt)['disaster_id']
        disaster_input_folder = f'{configs.disasters_input_folder}/{disaster_id}'
        disaster_config = [x for x in DISASTERS if x["id"] == disaster_id][0]

        if action_answer['action'] == "Create folders for a new disaster":
            create_folder_structure(disaster_id)

        if action_answer['action'] == "Upload disaster data to S3":
            sync_data(disaster_id, 'input', 'upload')
            sync_data(disaster_id, 'output', 'upload')

        if action_answer['action'] == "Download disaster data from S3":
            sync_data(disaster_id, 'input', 'download')
            sync_data(disaster_id, 'output', 'download')

        if action_answer['action'] == "Process disaster data":
            PROCESSING_OPTIONS = [
                "Facebook Mobility Data",
                "Facebook Population Density Data",
                "Download Fire Perimeter Data",
                "Process Fire Perimeter Data",
                "Download and Process Fire Pixel Data",
                "Download and Process Smoke Perimeter Data",
                "Download Hurricane Data",
                "Process Hurricane Data",
                "Download Cyclone Data",
                "Process Cyclone Data",
                "HHS Bed Capacity Data",
                "Process Mapbox Mobility Data",
                "Normalize Mapbox Mobility Data",
                "Power Outage Data",
                "Calculate Jenks Breaks for International Layers"
            ]
            processing_prompt = [inquirer.List('processing', message="What type of data do you want to process?", choices=PROCESSING_OPTIONS)]
            processing = inquirer.prompt(processing_prompt)['processing']

            if processing == "Facebook Mobility Data":
                process_fb_mobility_data(disaster_input_folder, disaster_config, download_census_data, download_gadm_data)
            if processing == "Facebook Population Density Data":
                process_fb_pop_density_data(disaster_input_folder, disaster_config, download_census_data, download_gadm_data)
            if processing == "Download Fire Perimeter Data":
                download_fire_perimeter_data(disaster_input_folder, disaster_config)
            if processing == "Process Fire Perimeter Data":
                process_fire_perimeter(disaster_input_folder, disaster_config)
            if processing == "Download and Process Fire Pixel Data":
                download_fire_pixel_data(disaster_input_folder, disaster_config)
            if processing == "Download and Process Smoke Perimeter Data":
                process_smoke_data(disaster_input_folder, disaster_config)
            if processing == "Download Hurricane Data":
                download_hurricane_data(disaster_input_folder, disaster_config)
            if processing == "Process Hurricane Data":
                process_hurricane_data(disaster_input_folder, disaster_config)
            if processing == "Download Cyclone Data":
                download_cyclone_data(disaster_input_folder, disaster_config)
            if processing == "Process Cyclone Data":
                process_cyclone_data(disaster_input_folder, disaster_config)
            if processing == "HHS Bed Capacity Data":
                process_hhs_bed_capacity_data(disaster_input_folder, disaster_config)
            if processing == "Process Mapbox Mobility Data":
                process_mapbox_mobility_data(disaster_input_folder, disaster_config)
            if processing == "Normalize Mapbox Mobility Data":
                normalize_mapbox_activity_data(disaster_input_folder, disaster_config)
            if processing == "Power Outage Data":
                process_power_outages_data(disaster_input_folder, disaster_config)
            if processing == "Calculate Jenks Breaks for International Layers":
                calculate_jenks_breaks(disaster_config)

    if action_answer['action'] == "Invalidate cache":
        invalidate_cache()

    if action_answer['action'] == "Download and process HIFLD data":
        process_hifld_healthcare_facilities()

    if action_answer['action'] == "Upload HIFLD data":
        upload_hifld_healthcare_facilities()

    if action_answer['action'] == "Download and process FQHC data":
        download_and_process_fqhc_healthcare_facilities()

    if action_answer['action'] == "Upload FQHC data":
        upload_fqhc_healthcare_facilities()

    if action_answer['action'] == "Download Census data":
        download_census_data()

    if action_answer['action'] == "Upload Census data":
        upload_census_data()

    if action_answer['action'] == "Download DME data":
        download_dme_data()

    if action_answer['action'] == "Upload DME data":
        upload_dme_data()

    if action_answer['action'] == "Download GADM data":
        download_gadm_data()

    if action_answer['action'] == "Process GADM data":
        process_gadm_data()

    if action_answer['action'] == "Upload GADM data":
        upload_gadm_data()

    if action_answer['action'] == "Download HRSL data":
        download_hrsl_data()

    if action_answer['action'] == "Process HRSL data":
        process_hrsl_data()

    if action_answer['action'] == "Upload HRSL data":
        upload_hrsl_data()

    if action_answer['action'] == "Upload Jenks Breaks data":
        upload_jenks_breaks_data()


def run(args):
    if args['disaster']:
        disaster_id = args['disaster']
        disaster_input_folder = f'{configs.disasters_input_folder}/{disaster_id}'
        try:
            disaster_config = [x for x in DISASTERS if x["id"] == disaster_id][0]
        except:
            print(f"Disaster {disaster_id} not found.")
            return
    script = args['script']
    if script == 'create_folder_structure':
        create_folder_structure(disaster_id)
    elif script == 'upload_data':
        sync_data(disaster_id, 'input', 'upload')
        sync_data(disaster_id, 'output', 'upload')
    elif script == 'download_data':
        sync_data(disaster_id, 'input', 'download')
        sync_data(disaster_id, 'output', 'download')
    elif script == 'process_fb_mobility_data':
        process_fb_mobility_data(disaster_input_folder, disaster_config, download_census_data, download_gadm_data)
    elif script == 'process_fb_pop_density_data':
        process_fb_pop_density_data(disaster_input_folder, disaster_config, download_gadm_data)
    elif script == 'process_hurricane_data':
        process_hurricane_data(disaster_input_folder, disaster_config)
    elif script == 'download_hurricane_data':
        download_hurricane_data(disaster_input_folder, disaster_config)
    elif script == 'process_cyclone_data':
        process_cyclone_data(disaster_input_folder, disaster_config)
    elif script == 'download_cyclone_data':
        download_cyclone_data(disaster_input_folder, disaster_config)
    elif script == 'process_hhs_bed_capacity_data':
        process_hhs_bed_capacity_data(disaster_input_folder, disaster_config)
    elif script == 'process_mapbox_mobility_data':
        process_mapbox_mobility_data(disaster_input_folder, disaster_config)
    elif script == 'normalize_mapbox_activity_data':
        normalize_mapbox_activity_data(disaster_input_folder, disaster_config)
    elif script == 'process_power_outages_data':
        process_power_outages_data(disaster_input_folder, disaster_config)
    elif script == 'download_fire_pixel_data':
        download_fire_pixel_data(disaster_input_folder, disaster_config)
    elif script == 'download_fire_perimeter_data':
        download_fire_perimeter_data(disaster_input_folder, disaster_config)
    elif script == 'process_smoke_data':
        process_smoke_data(disaster_input_folder, disaster_config)
    elif script == 'process_fire_perimeter':
        process_fire_perimeter(disaster_input_folder, disaster_config)
    elif script == 'invalidate_cache':
        invalidate_cache()
    elif script == 'process_hifld_healthcare_facilities':
        process_hifld_healthcare_facilities()
    elif script == 'download_and_process_fqhc_healthcare_facilities':
        download_and_process_fqhc_healthcare_facilities()
    elif script == 'upload_hifld_healthcare_facilities':
        upload_hifld_healthcare_facilities()
    elif script == 'upload_fqhc_healthcare_facilities':
        upload_fqhc_healthcare_facilities()
    elif script == 'download_census_data':
        download_census_data()
    elif script == 'upload_census_data':
        upload_census_data()
    elif script == 'download_dme_data':
        download_dme_data()
    elif script == 'upload_dme_data':
        upload_dme_data()
    elif script == 'download_gadm_data':
        download_gadm_data()
    elif script == 'process_gadm_data':
        process_gadm_data()
    elif script == 'upload_gadm_data':
        upload_gadm_data()
    elif script == 'download_hrsl_data':
        download_hrsl_data()
    elif script == 'process_hrsl_data':
        process_gadm_data()
    elif script == 'upload_hrsl_data':
        upload_hrsl_data()
    elif script == 'calculate_jenks_breaks':
        calculate_jenks_breaks(disaster_config)
    elif script == 'upload_jenks_breaks_data':
        upload_jenks_breaks_data()


parser = ArgumentParser(description='Backend scripts')
parser.add_argument('-l', '--local', help='Use local json file for disaster config',
                    default=False, action="store_true")
parser.add_argument('-d', '--disaster', help='Disaster ID to process data for',
                    required=False, type=str)
parser.add_argument('-o', '--ongoing', help='Run for ongoing disasters',
                    required=False, type=str)
POSSIBLE_SCRIPTS = [
    'create_folder_structure',
    'upload_data',
    'download_data',
    'process_fb_mobility_data',
    'process_fb_pop_density_data',
    'download_fire_perimeter_data',
    'process_fire_perimeter',
    'process_smoke_data',
    'process_hurricane_data',
    'download_hurricane_data',
    'process_cyclone_data',
    'download_cyclone_data',
    'process_hhs_bed_capacity_data',
    'process_mapbox_mobility_data',
    'normalize_mapbox_activity_data',
    'process_power_outages_data',
    'invalidate_cache',
    'process_hifld_healthcare_facilities',
    'upload_hifld_healthcare_facilities',
    'download_and_process_fqhc_healthcare_facilities',
    'upload_fqhc_healthcare_facilities',
    'download_fire_pixel_data',
    'download_census_data',
    'upload_census_data',
    'download_dme_data',
    'upload_dme_data',
    'download_gadm_data',
    'process_gadm_data',
    'upload_gadm_data',
    'download_hrsl_data',
    'process_hrsl_data',
    'upload_hrsl_data',
    'calculate_jenks_breaks'
    'upload_jenks_breaks_data'
]
parser.add_argument('-s', '--script', help="Script to run if you don't want to use the interactive prompt",
                    required=False, choices=POSSIBLE_SCRIPTS)
args = vars(parser.parse_args())

DISASTERS = get_disasters_config(use_local=args['local'])
DISASTER_IDS = [x['id'] for x in DISASTERS][::-1]

if (args['script'] or (args['disaster'] and args['script']) or (args['ongoing'] and args['script'])):
    if args['ongoing']:
        disaster_configs = [x for x in DISASTERS if "isOngoing" in x and x["isOngoing"] is True]
        if len(disaster_configs) == 0:
            print("---> no ongoing disasters found. Stopping.")
        else:
            print(f"---> found {len(disaster_configs)} ongoing disasters")
            print(f"---> ongoing disaster ids: {[x['id'] for x in disaster_configs]}")
            for config in disaster_configs:
                disaster_id = config["id"]
                args['disaster'] = disaster_id
                run(args)
    else:
        run(args)
else:
    prompt_user()