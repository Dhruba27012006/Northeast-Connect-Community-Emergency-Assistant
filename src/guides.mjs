import {english} from './guides/en.mjs'
import {assamese} from './guides/as.mjs'
import {bengali} from './guides/bn.mjs'
import {hindi} from './guides/hi.mjs'

export const guides = {en:english,as:assamese,bn:bengali,hi:hindi}
export const guideIds = ['floods','landslides','earthquakes','emergency-kit']
export const languageNames = {en:'English',as:'অসমীয়া',bn:'বাংলা',hi:'हिन्दी'}
const languageFiles = {en:'english',as:'assamese',bn:'bengali',hi:'hindi'}
export const guideFilename = (id,language) => id+'-'+languageFiles[language]+'.pdf'
export const reviewedOn = '2026-11-21'

const flood = 'https://asdma.assam.gov.in/sites/default/files/swf_utility_folder/departments/asdma_revenue_uneecopscloud_com_oid_70/this_comm/flood-safetytips_0.pdf'
export const references = [
  [flood,'https://www.ready.gov/sites/default/files/2024-11/fema_flood-hazard-info-sheet.pdf','https://www.cdc.gov/floods/safety/reentering-your-flooded-home-safety.html'],
  ['https://www.ready.gov/sites/default/files/2024-07/ready.gov_landslide_info-sheet.pdf'],
  ['https://asdma.assam.gov.in/how-to-categories/during-earthquake','https://www.ready.gov/sites/default/files/2025-02/fema_full-suite-hazard-info-sheets.pdf'],
  [flood,'https://www.ready.gov/sites/default/files/2023-05/ready.gov_older-adults_flyer.pdf','https://www.ready.gov/sites/default/files/2021-11/are-you-ready-guide.pdf']
]
export function guideReviewDate(language) {
  return new Intl.DateTimeFormat(language,{dateStyle:'long',timeZone:'UTC'}).format(new Date(reviewedOn))
}
