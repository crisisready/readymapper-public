import Airtable from 'airtable'
import configs from '../../../../configs.json'

const credentials = configs.airtable

const base = new Airtable({apiKey: credentials['apiKey']})
  .base(credentials['baseId'])

export const getDisasterData = async () => {
  const data = base(credentials['tableName']).select({
    view: credentials['viewName']
  }).all()

  return data
}

export const getAboutData = async () => {
  const data = base(credentials['aboutContentTable']).select({
    view: credentials['aboutContentView']
  }).all()

  return data
}

export const getRecordsFromData = (data) => {
  return data.map(d => d.fields)
}
