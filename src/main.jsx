import React, {useEffect,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {TriangleAlert,ShieldPlus,MapPin,HeartPulse,Radio,BookOpen,House,ClipboardList,ShieldCheck,Phone,RefreshCw,Clock,Navigation,Menu,X} from 'lucide-react'
import {api} from './api.mjs'
import {formatDate} from './domain.mjs'
import {Awareness} from './Awareness.jsx'
import {Admin} from './Admin.jsx'
import {RequestForm,Tracking} from './Reports.jsx'
import {AreaFields,DemoBadge,Field,Message,Options,PanelHeader} from './ui.jsx'
import './style.css'

const navigation = [
  ['home','Home',House],['alerts','Local Alerts',Radio],['resources','Emergency Resources',MapPin],
  ['track','Track My Report',ClipboardList],['awareness','Awareness & Basic Knowledge',BookOpen]
]
const actions = [
  ['request','Request Help','Send a request for evacuation, medical help or essential supplies.',HeartPulse,'primary'],
  ['resources','Find Emergency Resources','Locate shelters, medical facilities and emergency contacts.',MapPin,''],
  ['alerts','View Local Alerts','Check advisories and safety instructions for your district.',Radio,'']
]
const currentPage = () => location.hash.slice(1) || 'home'
const official112 = 'https://www.mha.gov.in/emergency-response-support-system-erss'

function Header({page}) {
  const [open,setOpen] = useState(false)
  useEffect(() => setOpen(false),[page])
  return <header className="header">
    <div className="shell header-inner">
      <a className="brand" href="#home"><span className="brand-icon"><ShieldPlus size={23}/></span><span><strong>Northeast Connect</strong><small>Community Emergency Assistant</small></span></a>
      <a className="mobile-track" href="#track" aria-current={page==='track'?'page':undefined}><ClipboardList size={16}/>Track My Report</a>
      <button className="icon-button mobile-menu" aria-expanded={open} aria-label={open?'Close navigation':'Open navigation'} onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
      <a className="staff" href="#admin"><ShieldCheck size={17}/> Admin sign-in</a>
    </div>
    <nav aria-label="Main navigation" className={'navigation '+(open?'expanded':'')}><div className="shell nav-inner">
      {navigation.map(([id,label,Icon])=><a key={id} href={'#'+id} aria-current={page===id?'page':undefined}><Icon size={16}/>{label}</a>)}
      <a className="mobile-admin" href="#admin"><ShieldCheck size={16}/>Admin sign-in</a>
    </div></nav>
  </header>
}

function Home({area,setArea,selectedAlerts,reload,alerts}) {
  return <>
    <section className="hero"><div className="shell hero-inner">
      <div className="hero-content"><div className="eyebrow"><span/> COMMUNITY EMERGENCY ASSISTANT</div><h1>Find help when<br className="desktop-break"/> it matters most.</h1><p>Local alerts, emergency resources, and assistance for communities across Northeast India.</p></div>
      <svg viewBox="0 0 450 280" aria-hidden="true" className="terrain" preserveAspectRatio="xMidYMid slice">
        <defs><pattern id="grid" width="29" height="29" patternUnits="userSpaceOnUse"><path d="M 29 0 L 0 0 0 29" fill="none" stroke="#9bb4d4" strokeOpacity=".12"/></pattern></defs>
        <rect width="450" height="280" fill="url(#grid)"/>
        {[0,1,2,3,4,5,6,7,8].map(i=><path key={i} transform={'translate(0 '+i*13+')'} d="M-10 205 Q52 235 111 177 T205 122 T293 153 T465 56" fill="none" stroke="#a9c3e2" strokeOpacity={.32-i*.02} strokeWidth="1.2"/>)}
        <circle cx="290" cy="115" r="63" fill="none" stroke="#ecc0a7" strokeOpacity=".21"/><circle cx="290" cy="115" r="48" fill="none" stroke="#ecc0a7" strokeOpacity=".32"/>
        <circle cx="290" cy="115" r="34" fill="#f99658" fillOpacity=".15" stroke="#f99658" strokeOpacity=".6"/>
        <path d="M290 132s-13-10-13-21a13 13 0 0 1 26 0c0 11-13 21-13 21Z" fill="none" stroke="#ffad76" strokeWidth="2.4"/><circle cx="290" cy="111" r="4" fill="#ffad76"/>
        <circle cx="161" cy="171" r="4" fill="#f99658"/><circle cx="387" cy="96" r="3" fill="#a9c3e2"/>
      </svg>
    </div></section>
    <div className="shell home-body">
      <section className="actions" aria-label="Emergency actions">{actions.map(([id,title,description,Icon,tone])=><a key={id} className={'action '+tone} href={'#'+id}><span className="action-icon"><Icon size={24}/></span><h2>{title}</h2><p>{description}</p></a>)}</section>
      <section className="location-bar"><div className="location-title"><MapPin size={22}/><div><h2>Your location</h2><p>Select your area to see relevant updates.</p></div></div><div className="location-inputs"><AreaFields {...area} onState={state=>setArea({state,district:''})} onDistrict={district=>setArea({...area,district})} all/></div></section>
      <section className="recent"><div className="section-top"><div><h2>Latest local alerts</h2><p>{area.district || area.state}</p></div><a className="outline" href="#alerts">View all alerts</a></div>
        <Collection state={alerts} rows={selectedAlerts.slice(0,2)} kind="alerts" reload={reload}/>
      </section>
    </div>
  </>
}

function Collection({state,rows,kind,reload}) {
  if (state.loading) return <Message>Loading {kind}…</Message>
  if (state.error) return <Message error>{state.error} <button className="text-button" onClick={reload}>Retry</button></Message>
  if (!rows.length) return <Message>No {kind} for this selection.</Message>
  return <div className="card-list">{rows.map(row=>kind==='alerts' ? <article className="data-card" key={row.id}>
    <div className="record-icon"><TriangleAlert size={22}/></div><div className="record-body">
      <div className="tag-row"><span className={'badge severity '+row.severity.toLowerCase()}>{row.severity}</span>{row.demo && <DemoBadge/>}</div>
      <h3>{row.title}</h3><p className="metadata"><MapPin size={15}/>{row.area} · {row.district}</p><p>{row.instructions}</p>
      <div className="record-footer"><span><Clock size={15}/> Issued {formatDate(row.issued_at)}</span><span>Source: {row.source}</span><span>Updated {formatDate(row.updated_at)}</span></div>
    </div></article> : <article className="data-card" key={row.id}><div className="record-icon"><MapPin size={22}/></div><div className="record-body">
      <div className="tag-row"><span className="badge">{row.type}</span><span className={'badge '+(row.availability==='Open'?'green':'')}>{row.availability}</span>{row.demo && <DemoBadge/>}</div>
      <h3>{row.name}</h3><p>{row.address} · {row.district}</p><p>Contact: {/^[+\d][\d +()-]+$/.test(row.contact)?<a href={'tel:'+row.contact}>{row.contact}</a>:row.contact}</p>
      <div className="record-footer"><span><Clock size={15}/> Verified {formatDate(row.verified_at)}</span>{!row.demo && <a href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(row.address)} target="_blank" rel="noreferrer"><Navigation size={15}/> Directions</a>}</div>
    </div></article>)}</div>
}

function Listing({kind,area,setArea,state,rows,reload}) {
  const [type,setType] = useState('')
  const alerts = kind==='alerts'
  return <main className="shell page">
    <PanelHeader icon={alerts?Radio:MapPin} title={alerts?'Local Alerts':'Emergency Resources'}>{alerts?'District advisories and instructions from the listed issuing source.':'Relief shelters, medical facilities, and emergency contacts.'}</PanelHeader>
    <div className="location-inputs filters"><AreaFields {...area} onState={state=>setArea({state,district:''})} onDistrict={district=>setArea({...area,district})} all/>
      {!alerts && <Field label="Resource type"><select value={type} onChange={e=>setType(e.target.value)}><Options values={['Relief shelter','Medical facility','Emergency contact']} placeholder="All resources"/></select></Field>}
    </div>
    {!alerts && <div className="official-contact"><Phone size={20}/><div><strong>India emergency helpline</strong><p>Police, fire and medical emergencies · Nationwide · 24 hours</p><a href={official112}>Official source</a><p>Source checked 21 Nov 2026</p></div><a className="outline" href="tel:112">Call 112</a></div>}
    <div className="list-toolbar"><span>Last checked {formatDate(state.checked)}{state.error && ' (previous successful check)'}</span><button className="outline" onClick={reload}><RefreshCw size={15}/>Refresh</button></div>
    <Collection kind={kind} state={state} rows={type?rows.filter(row=>row.type===type):rows} reload={reload}/>
  </main>
}

function App() {
  const [page,setPage] = useState(currentPage)
  const [area,setArea] = useState({state:'Assam',district:''})
  const [prefilledCode,setPrefilledCode] = useState('')
  const [stamp,setStamp] = useState(0)
  const [info,setInfo] = useState({alerts:{loading:true,rows:[]},resources:{loading:true,rows:[]}})
  useEffect(()=>{const onHash=()=>{const next = currentPage();setPage(next);if(next !== 'track')setPrefilledCode('');window.scrollTo(0,0)};window.addEventListener('hashchange',onHash);return ()=>window.removeEventListener('hashchange',onHash)},[])
  useEffect(()=>{
    const kind = page==='home' ? 'alerts' : page
    if (!['alerts','resources'].includes(kind)) return
    let active = true
    setInfo(previous=>({...previous,[kind]:{...previous[kind],loading:true,error:''}}))
    api(kind).then(rows=>{if(active)setInfo(previous=>({...previous,[kind]:{rows,checked:new Date().toISOString()}}))}).catch(error=>{if(active)setInfo(previous=>({...previous,[kind]:{...previous[kind],loading:false,error:error.message}}))})
    return ()=>{active=false}
  },[page,stamp])
  const selected = kind=>info[kind].rows.filter(row=>row.state===area.state && (!area.district || row.district.toLowerCase()===area.district.trim().toLowerCase()))
  const refresh = ()=>setStamp(value=>value+1)
  return <>
    <Header page={page}/>
    <aside className="notice"><div className="shell notice-inner"><TriangleAlert size={17}/><span><strong>Hackathon demo.</strong> This site does not dispatch emergency services.</span><a href="tel:112"><Phone size={15}/> In immediate danger? Call 112</a></div></aside>
    {page==='admin'?<Admin/>:page==='awareness'?<Awareness/>:page==='request'?<RequestForm initial={area} onTrack={setPrefilledCode}/>:page==='track'?<Tracking initialCode={prefilledCode}/>:
      ['alerts','resources'].includes(page)?<Listing key={page} kind={page} area={area} setArea={setArea} state={info[page]} rows={selected(page)} reload={refresh}/>:<main><Home area={area} setArea={setArea} selectedAlerts={selected('alerts')} alerts={info.alerts} reload={refresh}/></main>}
    <footer><div className="shell footer-inner"><span><ShieldPlus size={18}/> Northeast Connect</span><span>Gauhati University · PS05 Hackathon Demo</span><a href="#awareness">Safety guides</a></div></footer>
  </>
}

createRoot(document.getElementById('root')).render(<App/>)
