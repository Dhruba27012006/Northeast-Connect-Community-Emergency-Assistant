import React,{useRef,useState} from 'react'
import {ClipboardList,Copy,HeartPulse,LocateFixed,RefreshCw} from 'lucide-react'
import {api,local} from './api.mjs'
import {categories,formatDate} from './domain.mjs'
import {addressFields} from './report-address.mjs'
import {AreaFields,DemoBadge,Field,Message,Options,PanelHeader} from './ui.jsx'

export function RequestForm({initial,onTrack}) {
  const [area,setArea] = useState(initial)
  const [code,setCode] = useState('')
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [location,setLocation] = useState({})
  const [copyMessage,setCopyMessage] = useState('')
  const locationRequest = useRef(0)

  function useLocation() {
    if (!navigator.geolocation) {
      setLocation({error:'GPS is unavailable. Enter the address manually.'})
      return
    }
    const request = ++locationRequest.current
    setLocation({busy:true})
    navigator.geolocation.getCurrentPosition(
      ({coords})=>{if(request===locationRequest.current)setLocation({coordinates:{latitude:Number(coords.latitude.toFixed(6)),longitude:Number(coords.longitude.toFixed(6))}})},
      ()=>{if(request===locationRequest.current)setLocation({error:'Location could not be shared. Enter the address manually.'})},
      {enableHighAccuracy:true,timeout:10000,maximumAge:0}
    )
  }

  async function submit(event) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget))
    setBusy(true)
    setError('')
    try {
      setCode((await api('requests',{...data,...location.coordinates})).code)
      locationRequest.current++
      setLocation({})
    } catch (e) {setError(e.message)} finally {setBusy(false)}
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopyMessage('Tracking code copied.')
    } catch {
      setCopyMessage('Copy is unavailable. Select and copy the code manually.')
    }
  }

  return <main className="shell page narrow">
    <PanelHeader icon={HeartPulse} title="Request Help">Tell coordinators where assistance is needed.</PanelHeader>
    {code ? <section className="form-panel">
      <Message>Your report was saved. <strong>Submitted</strong> means it is waiting for an administrator to review it. The demo does not dispatch emergency services.</Message>
      <h2>Private tracking code</h2>
      <p>Save this code to track your report later from any device. Anyone with the code can see public updates.</p>
      <output className="code">{code}</output>
      {copyMessage && <Message>{copyMessage}</Message>}
      <div className="form-actions">
        <button className="outline" onClick={copy}><Copy size={16}/>Copy code</button>
        <a href="#track" className="button" onClick={()=>onTrack(code)} aria-label="Track this report">Track this report</a>
        <button className="outline" onClick={()=>{setCode('');setCopyMessage('')}}>Submit another report</button>
      </div>
      <a href="#track">Track My Report with another code</a>
    </section> : <form className="form-panel" onSubmit={submit}>
      {local && <Message>Demo mode. Use practice details and leave personal phone numbers out.</Message>}
      <h2>Incident address</h2>
      <div className="form-grid"><AreaFields {...area} onState={state=>setArea({state,district:''})} onDistrict={district=>setArea({...area,district})}/></div>
      <Field label="Village, town, or locality"><input name="locality" maxLength="120" required placeholder="Example: Dhemaji town"/></Field>
      <details className="address-details">
        <summary>More address details (optional)</summary>
        <div className="form-grid">{addressFields.map(([name,label,maxLength])=><Field label={label} key={name}>
          <input name={name} maxLength={maxLength} {...(name==='pin'?{inputMode:'numeric',pattern:'[1-9][0-9]{5}',title:'Enter a six-digit Indian PIN code'}:{})}/>
        </Field>)}</div>
      </details>
      <div className="form-actions">
        <button type="button" className="outline" disabled={busy || location.busy} onClick={useLocation}><LocateFixed size={16}/>{location.busy?'Getting location…':'Use my location'}</button>
        {location.coordinates && <button type="button" className="outline" disabled={busy} onClick={()=>setLocation({})}>Remove coordinates</button>}
      </div>
      {location.error && <Message>{location.error}</Message>}
      {location.coordinates && <Message>Coordinates attached for administrators. Verify the manual address before submitting.</Message>}
      <p className="metadata">Exact addresses, coordinates, and callback numbers are visible to administrators only.</p>
      <div className="form-grid"><Field label="Assistance type"><select name="type" required><Options values={categories} placeholder="Select assistance"/></select></Field><Field label="People affected"><input type="number" name="people" min="1" max="10000" required/></Field></div>
      <Field label="Callback number (optional)"><input type="tel" name="callback" maxLength="30"/></Field>
      {error && <Message error>Request could not be confirmed. {error}</Message>}
      <button className="button" disabled={busy}>{busy?'Submitting…':'Submit help request'}</button>
    </form>}
  </main>
}

export function Tracking({initialCode}) {
  const [code,setCode] = useState(initialCode)
  const [lookup,setLookup] = useState({})
  async function track(value,refresh=false) {
    const normalized = value.trim()
    if (!/^(?:[\w-]{32}|[0-9a-f]{48})$/.test(normalized)) {
      setLookup({invalid:true})
      return
    }
    setLookup(previous=>({busy:true,...(refresh?{result:previous.result,code:normalized}:{})}))
    try {
      const result = await api('track',{code:normalized})
      setLookup(result?{result,code:normalized}:{invalid:true})
    } catch {
      setLookup(previous=>({...previous,busy:false,error:true}))
    }
  }
  const report = lookup.result
  return <main className="shell page narrow">
    <PanelHeader icon={ClipboardList} title="Track My Report">Enter your private code to check your report on any device. Save the code so you can return later.</PanelHeader>
    <form className="form-panel" onSubmit={event=>{event.preventDefault();track(code)}}>
      <Field label="Tracking code"><input value={code} onChange={event=>setCode(event.target.value)} name="code" required maxLength="100" autoComplete="off" spellCheck={false} disabled={lookup.busy}/></Field>
      <button className="button" disabled={lookup.busy}>{lookup.busy?'Checking…':'Check status'}</button>
    </form>
    {lookup.error && <Message error>Status lookup failed. Check your connection and try again.</Message>}
    {lookup.invalid && <Message error>No report was found for this code. Check that you copied the full code.</Message>}
    {report && <section className="form-panel tracking-result" aria-live="polite">
      <div className="section-top"><div><h2>Current status</h2><div className="tag-row"><span className="badge green">{report.status}</span>{report.demo && <DemoBadge/>}</div></div>
        <button className="outline" disabled={lookup.busy} onClick={()=>track(lookup.code,true)}><RefreshCw size={16}/>Refresh status</button></div>
      <dl className="tracking-dates"><div><dt>Submitted</dt><dd>{report.submitted_at?formatDate(report.submitted_at):'Submission time not recorded'}</dd></div><div><dt>Last update</dt><dd>{formatDate(report.updated_at)}</dd></div></dl>
      <h2>Report timeline</h2>
      {report.history_incomplete && <p>Earlier events were not recorded for this report.</p>}
      {report.events.length ? <ol className="report-timeline">{[...report.events].reverse().map((event,index)=><li key={index}>
        <strong>{event.kind==='status' ? event.status : 'Public note'}</strong>
        <time dateTime={event.at}>{formatDate(event.at)}</time>
        {event.note && <p>{event.note}</p>}
      </li>)}</ol> : <p>No timeline events recorded yet.</p>}
      {report.legacy_note && <div><h3>Earlier public note</h3><p>{report.legacy_note}</p></div>}
    </section>}
  </main>
}
