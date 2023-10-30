import * as d3 from 'd3'

import { getAcsVariable, getGadmVariable } from '../../../constants/settings'

export const addAcsDataToFeature = (f) => {
  f.properties.popElderly = d3.sum([
    f.properties[getAcsVariable('Population 65-69')],
    f.properties[getAcsVariable('Population 70-74')],
    f.properties[getAcsVariable('Population 75-79')],
    f.properties[getAcsVariable('Population 80-84')],
    f.properties[getAcsVariable('Population Over 85')]
  ])
  f.properties.percentPopElderly = f.properties.popElderly / f.properties[getAcsVariable('Total Population')]
  f.properties.totalPopulation = f.properties[getAcsVariable('Total Population')]
  f.properties.totalHouseholds = f.properties[getAcsVariable('Total Households')]
  f.properties.popBelowPoverty = f.properties[getAcsVariable('Population Below Poverty Level')]
  const percentPopBelowPoverty = f.properties.popBelowPoverty / f.properties.totalPopulation
  // HACK: cap percentages at 100%
  f.properties.percentPopBelowPoverty = isFinite(percentPopBelowPoverty) ? d3.min([percentPopBelowPoverty, 1]) : 0
}

export const addIntlVulnerabilityDataToFeature = (f) => {
  f.properties.popElderly = Number(f.properties[getGadmVariable('Population Over 60')]).toFixed(0);
  f.properties.totalPopulation = Number(f.properties[getGadmVariable('Total Population')]).toFixed(0);
  f.properties.popWomen = Number(f.properties[getGadmVariable('Women Population')]).toFixed(0);
  f.properties.popChildren = Number(f.properties[getGadmVariable('Population of Children Under 5')]).toFixed(0);
  f.properties.percentPopElderly = (f.properties.popElderly / f.properties.totalPopulation).toFixed(2);
  f.properties.percentPopWomen = (f.properties.popWomen / f.properties.totalPopulation).toFixed(2);
  f.properties.percentPopChildren = (f.properties.popChildren / f.properties.totalPopulation).toFixed(2);
}
