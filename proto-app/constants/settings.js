import * as d3 from 'd3'
import configs from '../../configs.json'


export const useLocalBackend = process.env.NODE_ENV == "development" ? true : false
if (useLocalBackend) { console.log("using local files instead of backend") }

export const settings = {
  siteTitle: "ReadyMapper",

  baseUrlData: useLocalBackend
    ? '/data'
    : `${configs.s3.cloudfrontBaseUrl}/${configs.s3.outputFolder}`,

  mapboxAccessToken: configs.mapbox.accessToken,
  mapboxStyleUrl: configs.mapbox.styleUrl,

  disasterTypes: [
    {id: "fire", name: "Fire", namePlural: "Fires"},
    {id: "hurricane", name: "Hurricane", namePlural: "Hurricanes"},
    {id: "cyclone", name: "Cyclone", namePlural: "Cyclones"},
  ],

  defaultReportSections: [
    {name: "Disaster", display: true},
    {name: "Vulnerability", display: true},
    {name: "Movement", display: true},
    {name: "Infrastructure", display: true},
    {name: "MobilityMatrix", display: true},
  ],

  vulnerabilityMetrics: [
    {
      id: 'percentPopElderly',
      name: function(isInternational) {
        if (isInternational) { return '% of Pop. > 60 yrs'; 
        } else { return '% of Pop. > 65 yrs'; }
      },
      default: true,
      idAbsolute: 'popElderly',
      nameAbsolute: function(isInternational) {
        if (isInternational) { return 'Pop. > 60 yrs'; 
        } else { return 'Pop. > 65 yrs'; }
      },
      source: function(isInternational, vintage) {
        if (isInternational) { return 'Meta High Resolution Population Density'; 
        } else { return `${vintage} ACS 5-Year Estimates`; }
      },
    },

    {
      id: 'percentPopWomen',
      name: function(isInternational) {
        if (isInternational) { return '% of Women Pop.'; 
        } else { return '% of Women Pop.'; }
      },
      default: false,
      idAbsolute: 'popWomen',
      nameAbsolute: function(isInternational) {
        if (isInternational) { return 'Women Pop.'; 
        } else { return 'Women Pop.'; }
      },
      source: function(isInternational, vintage) {
        if (isInternational) { return 'Meta High Resolution Population Density'; 
        } else { return `${vintage} ACS 5-Year Estimates`; }
      },
    },

    {
      id: 'percentPopChildren',
      name: function(isInternational) {
        if (isInternational) { return '% of Children Under 5'; 
        } else { return '% of Children Under 5'; }
      },
      default: false,
      idAbsolute: 'popChildren',
      nameAbsolute: function(isInternational) {
        if (isInternational) { return 'Children Under 5 Pop.'; 
        } else { return 'Children Under 5 Pop.'; }
      },
      source: function(isInternational, vintage) {
        if (isInternational) { return 'Meta High Resolution Population Density'; 
        } else { return `${vintage} ACS 5-Year Estimates`; }
      },
    },

    {
      id: 'percentPopBelowPoverty',
      name: function(isInternational) {
        if (isInternational) { return '% of Pop. Below Poverty Level'; 
        } else { return '% of Pop. Below Poverty Level'; }
      },
      default: false,
      idAbsolute: 'popBelowPoverty',
      nameAbsolute:  function(isInternational) {
        if (isInternational) { return 'Pop. Below Poverty Level'; 
        } else { return 'Pop. Below Poverty Level'; }
      },
      source: function(isInternational, vintage) {
        if (isInternational) { return `${vintage} ACS 5-Year Estimates`; 
        } else { return `${vintage} ACS 5-Year Estimates`; }
      },
    },
  ],

  movementDataSources: [
    {
      id: 'facebook',
      name: '% Pop. Density Change',
      source: 'Facebook Mobility Data',
    },
    {
      id: 'mapbox',
      name: '% Activity Change',
      source: 'Mapbox Mobility Data',
      notes: "Note: Gray dots represent tiles without any recorded activity for the selected date, but which had activity at other date(s) during or prior to the disaster.",
    },
  ],

  acsVariables: [
    { variable: 'S0101_C01_001E', title: 'Total Population' },
    { variable: 'S0101_C01_002E', title: 'Population Under 5' },
    { variable: 'S0101_C01_003E', title: 'Population 5-9' },
    { variable: 'S0101_C01_004E', title: 'Population 10-14' },
    { variable: 'S0101_C01_005E', title: 'Population 15-19' },
    { variable: 'S0101_C01_006E', title: 'Population 20-24' },
    { variable: 'S0101_C01_007E', title: 'Population 25-29' },
    { variable: 'S0101_C01_008E', title: 'Population 30-34' },
    { variable: 'S0101_C01_009E', title: 'Population 35-39' },
    { variable: 'S0101_C01_010E', title: 'Population 40-44' },
    { variable: 'S0101_C01_011E', title: 'Population 45-49' },
    { variable: 'S0101_C01_012E', title: 'Population 50-54' },
    { variable: 'S0101_C01_013E', title: 'Population 55-59' },
    { variable: 'S0101_C01_014E', title: 'Population 60-64' },
    { variable: 'S0101_C01_015E', title: 'Population 65-69' },
    { variable: 'S0101_C01_016E', title: 'Population 70-74' },
    { variable: 'S0101_C01_017E', title: 'Population 75-79' },
    { variable: 'S0101_C01_018E', title: 'Population 80-84' },
    { variable: 'S0101_C01_019E', title: 'Population Over 85' },
    { variable: 'S1701_C02_001E', title: 'Population Below Poverty Level' },
    { variable: 'DP02_0001E', title: 'Total Households' }
  ],

  gadmVariables: [
    { variable: 'total_population', title: 'Total Population' },
    { variable: 'elderly_60_plus_population', title: 'Population Over 60' },
    { variable: 'women_population', title: 'Women Population' },
    { variable: 'children_under_5_population', title: 'Population of Children Under 5' }
    ],

  vulnerabilityColors: [
        '#FCA923',
        '#E9693F',
        '#C4365F',
        '#940085',
        '#210081',
  ],

  isochronesColorScale: isochronesData => {
    // let dataExtent = d3.extent(isochronesData.features, (f) => f.properties['value'])
    let dataExtent = [15, 60]
    return (val) => d3.scaleQuantize()
      .domain([0, 1])
      .range([
        '#fff',  // for zero
        '#FCE51E',
        '#ABDB20',
        '#65CA44',
        '#209473'
      ])(val / dataExtent[1])
  },

  isochronesColorStops: isochronesData => {
    // let dataExtent = d3.extent(isochronesData.features, (f) => f.properties['value'])
    let dataExtent = [15, 60]
    return d3.range(0, dataExtent[1], dataExtent[1] / 5)
  },

  popDensityColorScale: d3.scaleThreshold().domain([-50, -10, 0, 10, 50]).range([
    "#EA3323", "#F2A63B", "transparent", "transparent", "#51B8F9", "#276BF6"
  ]),

  popDensityStops: [-50.01, -10.01, 10, 50],

  popDensityStopLabels: ['-50%+', '-50 to -10%', '10 to 50%', '50%+'],

  powerOutageColorScale: d3.scaleThreshold().domain([0, 0.15, 0.5, 1]).range([
    "rgb(15, 47, 128)", "rgb(15, 47, 128)", "rgb(15, 47, 128)", "rgb(15, 47, 128)"
  ]),

  mapboxActivityColorScale: mapboxActivity => {
    // let extent = d3.extent(mapboxActivity.map(r => r['activity_index_total']))
    return d3.scaleLinear().domain([0, 0.1]).range(["#51B8F9", "#51B8F9"])
  },

  healthcareFacilityTypes: [
    { sort_key: 1, slug: "Hospitals", general_type: "Hospitals" },
    { sort_key: 2, slug: "Long-Term-Other", general_type: "Long Term / Other" },
    { sort_key: 3, slug: "Outpatient", general_type: "Outpatient" },
  ],

  getHealthcareGeneralTypeColor: type => {
    if (type === "Hospitals") return "#F08557"
    if (type === "Outpatient") return "#7AC8FA"
    if (type === "Long Term / Other") return "#C667F3"
    return "#666"
  },

  healthcareFacilitySubtypes: [
    { subtype: "Acute Psychiatric Hospital", general_type: "Long Term / Other" },
    { subtype: "Adult Day Health Care", general_type: "Outpatient" },
    { subtype: "Ambulatory Surgical Center", general_type: "Outpatient" },
    { subtype: "Alternative Birthing Center", general_type: "Outpatient" },
    { subtype: "Chemical Dependency Recovery Hospital", general_type: "Long Term / Other" },
    { subtype: "Chronic Dialysis Clinic", general_type: "Outpatient" },
    { subtype: "Clinic", general_type: "Outpatient" }, // not in new list
    { subtype: "Community Clinic", general_type: "Outpatient" },
    { subtype: "Congregate Living Health Facility", general_type: "Long Term / Other" },
    { subtype: "Correctional Treatment Center", general_type: "Long Term / Other" },
    { subtype: "End Stage Renal Disease", general_type: "Outpatient" },
    { subtype: "Federally Qualified Health Center", general_type: "Outpatient" },
    { subtype: "Free Clinic", general_type: "Outpatient" },
    { subtype: "General Acute Care Hospital", general_type: "Hospitals" },
    { subtype: "Home Health Agency/Hospice", exclude: true },
    { subtype: "Hospice Facility", exclude: true },
    { subtype: "Hospice Facility-License Only", general_type: "Long Term / Other" },
    { subtype: "Hospital", general_type: "Hospitals" }, // not in new list
    { subtype: "Intermediate Care Facility", general_type: "Long Term / Other" },
    { subtype: "Intermediate Care Facility/Developmentally Disabled - Habilitative", general_type: "Long Term / Other" },
    { subtype: "Intermediate Care Facility/Developmentally Disabled - Nursing", general_type: "Long Term / Other" },
    { subtype: "Intermediate Care Facility/Developmentally Disabled", general_type: "Long Term / Other" },
    { subtype: "Intermediate Care Facility/Developmentally Disabled-Continuous Nursing", general_type: "Long Term / Other" },
    { subtype: "Long Term Care Facility", general_type: "Long Term / Other" }, // not in new list
    { subtype: "Outpatient Therapist Independent Practice", general_type: "Outpatient" },
    { subtype: "Outpatient/Speech Pathologist", general_type: "Outpatient" },
    { subtype: "Pediatric Day Health & Respite Care Facility", general_type: "Outpatient" },
    { subtype: "Physical Therapist Independent Practice", general_type: "Outpatient" },
    { subtype: "Psychiatric Health Facility", general_type: "Long Term / Other" },
    { subtype: "Psychology Clinic", general_type: "Outpatient" },
    { subtype: "Referral Agency", exclude: true },
    { subtype: "Rehabilitation Clinic", general_type: "Outpatient" },
    { subtype: "Rural Health Clinic", general_type: "Outpatient" },
    { subtype: "Skilled Nursing Facility", general_type: "Long Term / Other" },
    { subtype: "Surgical Clinic", general_type: "Outpatient" },
    { subtype: "Transplant Center", general_type: "Hospitals" },

    // Healthcare facilities with capacities categories:
    { subtype: "Childrens Hospitals", general_type: "Hospitals" },
    { subtype: "Critical Access Hospitals", general_type: "Hospitals" },
    { subtype: "Intermediate Care Facility-DD/H/N/CN/IID", general_type: "Long Term / Other" },
    { subtype: "Long Term", general_type: "Long Term / Other" },
    // { subtype: "Non Reporting", general_type: "Non-Reporting" },
    { subtype: "Other", general_type: "Long Term / Other" },
    { subtype: "Primary Care Clinic", general_type: "Outpatient" },
    { subtype: "Short Term", general_type: "Hospitals" },

    // HIFLD categories:
    { subtype: "ASSISTED LIVING", general_type: "Long Term / Other" },
    { subtype: "CHILDREN", general_type: "Hospitals" },
    { subtype: "CHRONIC DISEASE", general_type: "Hospitals" },
    { subtype: "CRITICAL ACCESS", general_type: "Hospitals" },
    { subtype: "GENERAL ACUTE CARE", general_type: "Hospitals" },
    { subtype: "LONG TERM CARE", general_type: "Long Term / Other" },
    { subtype: "MILITARY", general_type: "N/A" },
    { subtype: "NURSING HOME", general_type: "Long Term / Other" },
    { subtype: "PSYCHIATRIC", general_type: "Long Term / Other" },
    { subtype: "REHABILITATION", general_type: "N/A" },
    { subtype: "SPECIAL", general_type: "N/A" },
    { subtype: "WOMEN", general_type: "N/A" },
    { subtype: "hospital", general_type: "Hospitals" },
    { subtype: "clinic", general_type: "Outpatient" },
    { subtype: "doctors", general_type: "Outpatient" },
    { subtype: "DE ASISTENCIA SOCIAL", general_type: "Long Term / Other" },
    { subtype: "DE CONSULTA EXTERNA", general_type: "Outpatient" },
    { subtype: "DE HOSPITALIZACIÓN", general_type: "Hospitals" },
    { subtype: "DE APOYO", general_type: "Long Term / Other" },
  ],

  reportMapImages: {
    width: '600px',
    height: '400px',
  },

  hurricaneTrackSizeScale: hurricaneTracks => {
    let dataExtent = d3.extent(hurricaneTracks.features, f => f.properties['MAXWIND']);
    let scale = d3.scaleLinear().domain(dataExtent).range([0.5, 1.5]);
    return scale;
  },

  knotToMph: (knots) => Math.round(knots * 1.151),

  getHurricaneCategory: (mph) => {
    const hurricaneWindScale = [
      // source: Saffir-Simpson Hurricane Wind Scale
      // https://www.nhc.noaa.gov/aboutsshws.php
      {minMph: 0, maxMph: 74, windSpeed: "Less than 74 mph", name: "-", damage: "N/A", damageDescription: ""},
      {minMph: 74, maxMph: 95, windSpeed: "74-95 mph", name: "Category 1", damage: "Minimal", damageDescription: "No significant structural damage, can uproot trees and cause some flooding in coastal areas."},
      {minMph: 96, maxMph: 110, windSpeed: "96-110 mph", name: "Category 2", damage: "Moderate", damageDescription: "No major destruction to buildings, can uproot trees and signs. Coastal flooding can occur. Secondary effects can include the shortage of water and electricity."},
      {minMph: 111, maxMph: 129, windSpeed: "111-129 mph", name: "Category 3", damage: "Extensive", damageDescription: "Structural damage to small buildings and serious coastal flooding to those on low lying land. Evacuation may be needed."},
      {minMph: 130, maxMph: 156, windSpeed: "130-156 mph", name: "Category 4", damage: "Extreme", damageDescription: "All signs and trees blown down with extensive damage to roofs. Flat land inland may become flooded. Evacuation probable."},
      {minMph: 157, maxMph: 9999, windSpeed: "157 or higher mph", name: "Category 5", damage: "Catastrophic", damageDescription: "Buildings destroyed with small buildings being overturned. All trees and signs blown down. Evacuation of up to 10 miles inland."},
    ]
    const mphRounded = Math.round(mph)
    const category = hurricaneWindScale.find(d => mphRounded >= d.minMph && mphRounded < d.maxMph)
    return category
  },

  getCycloneCategory: (kph) => {
    const cycloneWindScale = [
      // source: Saffir-Simpson Hurricane Wind Scale
      // https://www.nhc.noaa.gov/aboutsshws.php
      {minKph: 0, maxKph: 119, windSpeed: "Less than 119 kph", name: "-", damage: "N/A", damageDescription: ""},
      {minKph: 119, maxKph: 153, windSpeed: "119-153 kph", name: "Category 1", damage: "Minimal", damageDescription: "No significant structural damage, can uproot trees and cause some flooding in coastal areas."},
      {minKph: 154, maxKph: 177, windSpeed: "154-177 kph", name: "Category 2", damage: "Moderate", damageDescription: "No major destruction to buildings, can uproot trees and signs. Coastal flooding can occur. Secondary effects can include the shortage of water and electricity."},
      {minKph: 178, maxKph: 208, windSpeed: "178-208 kph", name: "Category 3", damage: "Extensive", damageDescription: "Structural damage to small buildings and serious coastal flooding to those on low lying land. Evacuation may be needed."},
      {minKph: 209, maxKph: 251, windSpeed: "209-251 kph", name: "Category 4", damage: "Extreme", damageDescription: "All signs and trees blown down with extensive damage to roofs. Flat land inland may become flooded. Evacuation probable."},
      {minKph: 252, maxKph: 9999, windSpeed: "252 or higher kph", name: "Category 5", damage: "Catastrophic", damageDescription: "Buildings destroyed with small buildings being overturned. All trees and signs blown down. Evacuation of up to 10 miles inland."},
    ]
    const kphRounded = Math.round(kph)
    const category = cycloneWindScale.find(d => kphRounded >= d.minKph && kphRounded < d.maxKph)
    return category
  },

}

export const getAcsVariable = (title) => {
  return settings.acsVariables.find(v => v.title === title).variable
}

export const getGadmVariable = (title) => {
  return settings.gadmVariables.find(v => v.title === title).variable
}
