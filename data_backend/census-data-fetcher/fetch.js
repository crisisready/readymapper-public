//
// Fetches ACS census data.
// See https://api.census.gov/data/2019/acs/acs5/subject/variables.html for explanation of variable names.
// https://uscensusbureau.github.io/citysdk/ for citysdk docs
//

const census = require("citysdk")
const fs = require('fs')

const CENSUS_CONSTANTS = JSON.parse(fs.readFileSync('../constants/census.json', 'utf8'))
const STATES = CENSUS_CONSTANTS.usStates
// const STATES = [
//   {
//     'abbrev': 'CA',
//     'fips': '06'
//   },
//   {
//     'abbrev': 'CO',
//     'fips': '08'
//   }
// ]

const CENSUS_VINTAGE = 2020

const generateGeoScales = (stateSelector) => {
  return [
      {
        name: 'counties',
        geoHierarchy: {
          state: stateSelector,
          county: '*',
        },
        geoResolution: '5m',
      },
      {
        name: 'places',
        geoHierarchy: {
          state: stateSelector,
          county: null, // needed to fetch places
          place: '*',
        },
        geoResolution: '500k',
      },
      // {
      //   name: 'tracts',
      //   geoHierarchy: {
      //     state: stateSelector,
      //     county: null, // needed to fetch tracts
      //     tract: '*',
      //   },
      //   geoResolution: '500k',
      // },
    ]
}

const getAgeMergedWithPlacePolygons = async (geoConfig) => {
  return new Promise((resolve, reject) => {
    census(
      {
        vintage: CENSUS_VINTAGE, // required
        geoHierarchy: geoConfig.geoHierarchy,
        sourcePath: ["acs", "acs5", "subject"],
        values: [
          'S0101_C01_001E',
          'S0101_C01_002E',
          'S0101_C01_003E',
          'S0101_C01_004E',
          'S0101_C01_005E',
          'S0101_C01_006E',
          'S0101_C01_007E',
          'S0101_C01_008E',
          'S0101_C01_009E',
          'S0101_C01_010E',
          'S0101_C01_011E',
          'S0101_C01_012E',
          'S0101_C01_013E',
          'S0101_C01_014E',
          'S0101_C01_015E',
          'S0101_C01_016E',
          'S0101_C01_017E',
          'S0101_C01_018E',
          'S0101_C01_019E',
          'S1701_C02_001E',
        ],
        geoResolution: geoConfig.geoResolution,
      },
      (err, res) => {
        if (err) reject(err)
        else resolve(res)
      }
    )
  })
}

const getHouseholds = async (geoConfig) => {
  return new Promise((resolve, reject) => {
    census(
      {
        vintage: CENSUS_VINTAGE, // required
        geoHierarchy: geoConfig.geoHierarchy,
        sourcePath: ["acs", "acs5", "profile"],
        values: [
          'DP02_0001E'
        ],
      },
      (err, res) => {
        if (err) reject(err)
        else resolve(res)
      }
    )
  })
}

const fetchAll = async (geoConfig, state=null) => {
  console.log(`------>  fetching ${geoConfig.name}`);
  let placesGeoJson = await getAgeMergedWithPlacePolygons(geoConfig)
  let households = await getHouseholds(geoConfig)

  // Merge household data into geojson
  placesGeoJson.features.forEach(f => {
    let household
    if (geoConfig.name === 'counties') {
      household = households.find(d => d.county === f.properties['COUNTYFP'])
    }
    if (geoConfig.name === 'places') {
      household = households.find(d => d.place === f.properties['PLACEFP'])
    }
    if (geoConfig.name === 'tracts') {
      household = households.find(d => d.tract === f.properties['TRACTCE'])
    }
    if (!household) {
      console.log(`------> ERROR: Could not find household data for ${f.properties['NAME']}`)
    } else {
      f.properties['DP02_0001E'] = household['DP02_0001E']
    }
  })

  const outPrefix = `../output/census/${CENSUS_VINTAGE}`
  const outFolder = state ? `${outPrefix}/${state.abbrev.toLowerCase()}` : `${outPrefix}/all`
  fs.mkdirSync(outFolder, { recursive: true })
  const outFile = `${outFolder}/acs-${geoConfig.name}`
  console.log(`------> Writing ${outFile}...`)
  fs.writeFileSync(`${outFile}.geojson`, JSON.stringify(placesGeoJson))
  console.log('------> done')
}

const fetchStateData = async (state) => {
  console.log(`---> fetching ${state.abbrev}`);
  const geoScales = generateGeoScales(state.fips)
  await Promise.all(
    geoScales.map(scale => fetchAll(scale, state))
  )
}

const fetchAllStateData = async () => {
  console.log(`---> fetching data for all states`);
  const geoScales = generateGeoScales('*')
  await Promise.all(
    geoScales.map(scale => fetchAll(scale))
  )
}

const fetch = async () => {
  // Uncomment to fetch data for specific states
  // for (const state of STATES) {
  //   await fetchStateData(state)
  // }

  // Fetch data for all states -> output/census/{vintage}/all/
  await fetchAllStateData()
}

fetch()
