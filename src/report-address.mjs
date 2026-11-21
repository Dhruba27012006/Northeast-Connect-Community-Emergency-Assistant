export const addressFields = [
  ['block','Block or subdivision',100],
  ['ward','Ward or gram panchayat',100],
  ['road','Road or lane',150],
  ['building','House or building number',60],
  ['landmark','Nearest landmark',180],
  ['pin','PIN code',6]
]

export function reportAddress(report) {
  if (!report.locality) return [report.landmark,report.district,report.state].filter(Boolean).join(', ')
  const parts = ['building','road','landmark','ward','locality','block','district','state']
  return [...parts.map(key=>report[key]),report.pin ? 'PIN '+report.pin : ''].filter(Boolean).join(', ')
}
