import React,{useEffect,useState} from 'react'
import {ShieldCheck,LogOut} from 'lucide-react'
import {api} from './api.mjs'
import {reportAddress} from './report-address.mjs'
import {locations,categories,statuses,severities,resourceTypes,availability,formatDate} from './domain.mjs'
import {AreaFields,DemoBadge,Field,Message,Options,PanelHeader} from './ui.jsx'

const tabs = {requests:'Help queue',alerts:'Manage alerts',resources:'Manage resources'}
const timeValue = value => {
  const date = new Date(value || Date.now())
  return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16)
}
function Editor({kind,row,onSave,onCancel}) {
  const [area,setArea] = useState({state:row?.state || 'Assam',district:row?.district || ''})
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const request = kind==='requests'
  const alert = kind==='alerts'
  const input = (name,label,maxLength) => <Field label={label}><input name={name} required maxLength={maxLength} defaultValue={row?.[name]}/></Field>
  const select = (name,label,values) => <Field label={label}><select name={name} defaultValue={row?.[name] || values[0]}><Options values={values}/></select></Field>
  const textarea = (name,label,maxLength,required=false) => <Field label={label}><textarea name={name} defaultValue={row?.[name]} maxLength={maxLength} required={required}/></Field>
  const timestamp = alert?'issued_at':'verified_at'
  async function submit(e) {
    e.preventDefault()
    const body = Object.fromEntries(new FormData(e.currentTarget))
    if (!request) body[timestamp] = new Date(body[timestamp]).toISOString()
    if (row) body.id = row.id
    setBusy(true);setError('')
    try {await api('admin/'+kind,body);onSave()} catch (e) {setError(e.message)} finally {setBusy(false)}
  }
  return <form className="form-panel editor" onSubmit={submit}>
    <h2>{row?'Edit':'Add'} {request?'help request':alert?'alert':'resource'}</h2>
    {!request && <div className="form-grid"><AreaFields {...area} onState={state=>setArea({state,district:''})} onDistrict={district=>setArea({...area,district})}/></div>}
    {request ? <>{select('status','Status',statuses)}{textarea('public_update','Public update (visible with tracking code)',400)}{textarea('private_notes','Private notes (administrators only)',1000)}</> :
      alert ? <>{input('title','Alert title',120)}{input('area','Affected area',160)}<div className="form-grid">{select('severity','Severity',severities)}{select('publication','Publication',['Draft','Published','Expired'])}</div>{textarea('instructions','Instructions',1600,true)}{input('source','Issuing source',250)}</> :
      <>{input('name','Resource name',120)}<div className="form-grid">{select('type','Resource type',resourceTypes)}{select('availability','Availability',availability)}</div>{input('address','Address',250)}{input('contact','Contact details',120)}</>}
    {!request && <Field label={alert?'Issued date and time (local time)':'Last verified date and time (local time)'}><input type="datetime-local" name={timestamp} defaultValue={timeValue(row?.[timestamp])} required/></Field>}
    {error && <Message error>{error}</Message>}
    <div className="form-actions"><button className="button" disabled={busy}>{busy?'Saving…':'Save changes'}</button><button type="button" className="outline" onClick={onCancel}>Cancel</button></div>
  </form>
}

export function Admin() {
  const [session,setSession] = useState(null)
  const [signError,setSignError] = useState('')
  const [busy,setBusy] = useState(false)
  const [tab,setTab] = useState('requests')
  const [rows,setRows] = useState(null)
  const [error,setError] = useState('')
  const [success,setSuccess] = useState('')
  const [edit,setEdit] = useState(undefined)
  const [filter,setFilter] = useState({district:'',type:'',status:''})
  const [revision,setRevision] = useState(0)
  useEffect(()=>{api('session').then(setSession).catch(e=>{setSignError(e.message);setSession(false)})},[])
  useEffect(()=>{
    if (!session) return
    let active = true
    setRows(null);setError('')
    api('admin/'+tab).then(data=>{if(active)setRows(data)}).catch(e=>{if(active)setError(e.message)})
    return ()=>{active=false}
  },[session,tab,revision])
  async function sign(event) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget))
    setBusy(true);setSignError('')
    try {await api('login',data);setSession(true)} catch (e) {setSignError(e.message)} finally {setBusy(false)}
  }
  async function logout() {
    try {
      await api('logout',{})
      setSession(false);setRows(null);setEdit(undefined);setSuccess('');setError('')
    } catch(e) {setError(e.message)}
  }
  if (session === null) return <main className="shell page"><Message>Checking administrator session…</Message></main>
  if (!session) return <main className="shell page narrow"><PanelHeader icon={ShieldCheck} title="Administrator sign-in">Sign in to coordinate requests, alerts, and emergency resources.</PanelHeader>
    <form className="form-panel" onSubmit={sign}><Field label="Email"><input type="email" name="email" autoComplete="username" required/></Field><Field label="Password"><input type="password" name="password" autoComplete="current-password" required/></Field>
      {signError && <Message error>{signError}</Message>}<button className="button" disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form></main>
  const districts = [...new Set([...Object.values(locations).flat(),...(rows || []).map(row=>row.district)])].sort()
  const filtered = rows?.filter(row=>tab!=='requests' || Object.entries(filter).every(([key,value])=>!value || row[key]===value))
  return <main className="shell page admin-page">
    <div className="section-top"><PanelHeader icon={ShieldCheck} title="Administrator dashboard">Coordinate incoming requests and maintain public information.</PanelHeader><button className="outline" onClick={logout}><LogOut size={16}/>Sign out</button></div>
    <div className="admin-tabs" aria-label="Dashboard sections">{Object.entries(tabs).map(([key,label])=><button key={key} aria-pressed={key===tab} className={key===tab?'button':'outline'} onClick={()=>{setTab(key);setEdit(undefined);setSuccess('')}}>{label}</button>)}</div>
    {tab==='requests' ? <div className="location-inputs filters">{[['district','District',districts],['type','Assistance type',categories],['status','Status',statuses]].map(([key,label,values])=><Field key={key} label={label}><select value={filter[key]} onChange={e=>setFilter({...filter,[key]:e.target.value})}><Options values={values} placeholder="All"/></select></Field>)}</div>
      : <button className="button" onClick={()=>{setEdit(null);setSuccess('')}}>Add {tab==='alerts'?'alert':'resource'}</button>}
    {edit !== undefined && <Editor key={tab+'-'+(edit?.id || 'new')} kind={tab} row={edit} onCancel={()=>setEdit(undefined)} onSave={()=>{setEdit(undefined);setSuccess('Changes saved.');setRevision(value=>value+1)}}/>}
    {success && <Message>{success}</Message>}
    {error ? <Message error>{error} <button className="text-button" onClick={()=>setRevision(value=>value+1)}>Retry</button></Message> : filtered===undefined ? <Message>Loading records…</Message> : filtered.length===0 ? <Message>No records match this view.</Message> :
      <div className="card-list">{filtered.map(row=><article className="data-card admin-record" key={row.id}>
        <div className="record-body"><div className="tag-row"><span className="badge">{row.status || row.publication || row.availability}</span>{row.demo && <DemoBadge/>}</div>
        <h3>{row.title || row.name || row.locality || row.landmark}</h3><p>{row.district}, {row.state}{tab==='requests' && ' · '+row.type+' · '+row.people+' people'}</p>
        {tab==='requests' && <><p><strong>Incident address:</strong> {reportAddress(row)}</p>{row.latitude != null && row.longitude != null && <p><strong>Coordinates:</strong> {row.latitude}, {row.longitude}</p>}<p>Callback: {row.callback || 'Not provided'}</p>{row.public_update && <p>Public update: {row.public_update}</p>}{row.private_notes && <p>Private notes: {row.private_notes}</p>}</>}
        <small>Updated {formatDate(row.updated_at)}</small></div><button className="outline" onClick={()=>{setEdit(row);setSuccess('');requestAnimationFrame(()=>document.querySelector('.editor')?.scrollIntoView({block:'start'}))}}>Edit</button>
      </article>)}</div>}
  </main>
}
