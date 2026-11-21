const ago = hours => new Date(Date.now()-hours*3600000).toISOString()
const demo = { state:'Assam', demo:true }
export const seed = {
 alerts: [
  {...demo,district:'Kamrup Metropolitan',title:'Urban flood advisory',area:'Low-lying areas of Guwahati',severity:'High',issued_at:ago(2),instructions:'Practice scenario: move to higher ground if advised. Avoid flooded roads and underpasses.',source:'Demo district bulletin',publication:'Published'},
  {...demo,district:'Dhemaji',title:'Rising river levels',area:'Riverbank villages in Dhemaji',severity:'Moderate',issued_at:ago(4),instructions:'Practice scenario: follow local advisories and identify your route to higher ground.',source:'Demo district bulletin',publication:'Published'},
  {...demo,district:'Cachar',title:'Slope movement advisory',area:'Hill roads near Silchar',severity:'Advisory',issued_at:ago(6),instructions:'Practice scenario: stay away from unstable slopes and report signs of movement to local authorities.',source:'Demo district bulletin',publication:'Published'}
 ],
 resources: [
  {...demo,district:'Kamrup Metropolitan',name:'Guwahati practice relief centre',type:'Relief shelter',address:'Guwahati, Assam (simulated location)',contact:'Demo only',availability:'Open',verified_at:ago(3)},
  {...demo,district:'Dhemaji',name:'Dhemaji practice medical post',type:'Medical facility',address:'Dhemaji, Assam (simulated location)',contact:'Demo only',availability:'Limited',verified_at:ago(5)},
  {...demo,district:'Cachar',name:'Cachar practice control room',type:'Emergency contact',address:'Silchar, Assam (simulated location)',contact:'Demo only',availability:'Unknown',verified_at:ago(5)}
 ],
 requests: [
  {...demo,district:'Dhemaji',landmark:'Demo village near the river',type:'Evacuation',people:4,callback:'',status:'Acknowledged',public_update:'Practice request received.',private_notes:'Simulated request.'},
  {...demo,district:'Kamrup Metropolitan',landmark:'Demo community hall',type:'Food and water',people:8,callback:'',status:'Submitted',public_update:'',private_notes:''}
 ]
}
