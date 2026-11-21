export const locations = {
  Assam: ['Bajali','Baksa','Barpeta','Biswanath','Bongaigaon','Cachar','Charaideo','Chirang','Darrang','Dhemaji','Dhubri','Dibrugarh','Dima Hasao','Goalpara','Golaghat','Hailakandi','Hojai','Jorhat','Kamrup','Kamrup Metropolitan','Karbi Anglong','Kokrajhar','Lakhimpur','Majuli','Morigaon','Nagaon','Nalbari','Sivasagar','Sonitpur','South Salmara-Mankachar','Sribhumi','Tamulpur','Tinsukia','Udalguri','West Karbi Anglong'],
  'Arunachal Pradesh': [], Manipur: [], Meghalaya: [], Mizoram: [], Nagaland: [], Sikkim: [], Tripura: []
}
export const categories = ['Evacuation','Medical help','Food and water','Shelter']
export const statuses = ['Submitted','Acknowledged','In Progress','Resolved']
export const severities = ['Advisory','Moderate','High','Severe']
export const resourceTypes = ['Relief shelter','Medical facility','Emergency contact']
export const availability = ['Open','Limited','Closed','Unknown']
export const source = 'https://asdma.assam.gov.in/information-services/dos-and-donts-during-disaster'
export const formatDate = value => value ? new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(value)) + ' IST' : 'Unavailable'
