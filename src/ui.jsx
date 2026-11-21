import React from 'react'
import {locations} from './domain.mjs'

export function Field({label,children}) {
  const id = React.useId()
  return <div className="field"><label htmlFor={id}>{label}</label>{React.cloneElement(children,{id})}</div>
}
export function Options({values,placeholder}) { return <>{placeholder && <option value="">{placeholder}</option>}{values.map(value=><option key={value}>{value}</option>)}</> }
export function AreaFields({state,district,onState,onDistrict,all=false}) {
  return <><Field label="State"><select name="state" value={state} onChange={e=>onState(e.target.value)}><Options values={Object.keys(locations)}/></select></Field>
    <Field label="District">{locations[state]?.length ? <select name="district" value={district} required={!all} onChange={e=>onDistrict(e.target.value)}><Options values={locations[state]} placeholder={all?'All districts':'Select a district'}/></select> : <input name="district" value={district} required={!all} maxLength="100" placeholder={all?'All districts':'Enter district name'} onChange={e=>onDistrict(e.target.value)}/>}</Field></>
}
export function Message({error,children}) { return <div className={'message '+(error?'error':'')} role={error?'alert':'status'}>{children}</div> }
export function PanelHeader({icon:Icon,title,children}) {return <div className="panel-heading"><div className="section-icon"><Icon size={23}/></div><div><h1>{title}</h1>{children && <p>{children}</p>}</div></div>}
export const DemoBadge = () => <span className="badge demo">Demo</span>

