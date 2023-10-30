import * as d3 from 'd3'

import { settings } from '../../../constants/settings'

const enforceArray = (object) => {
  return Array.isArray(object) ? object : [object]
}

export const orderReportSectionsFromQuery = (querySections) => {
  const querySectionsArray = enforceArray(querySections)
  const order = querySectionsArray
    .map(d => {
      const [name, order] = d?.split('_')
      return {name: name, order: Number(order)}
    })
    .sort((a, b) => {
      return d3.ascending(a.order, b.order)
    })
    .map(d => d.name)

  const orderedSections = order
    .map(d => { return {name: d, display: true} })

  const hiddenSections = settings.defaultReportSections
    .filter(d => !order.includes(d.name))
    .map(d => { return {name: d.name, display: false} })

  const sections = [...orderedSections, ...hiddenSections]
  return sections
}
