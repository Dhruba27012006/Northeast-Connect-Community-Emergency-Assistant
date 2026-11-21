import React,{useState} from 'react'
import {BookOpen,Download} from 'lucide-react'
import {Field,Message,PanelHeader} from './ui.jsx'
import {guideFilename,guideIds,guideReviewDate,guides,languageNames,references,reviewedOn} from './guides.mjs'

export function Awareness() {
  const [language,setLanguage] = useState(()=>{
    try {const value=localStorage.getItem('northeast-language');return Object.hasOwn(guides,value)?value:'en'} catch {return 'en'}
  })
  function change(event) {
    const value = event.target.value
    setLanguage(value)
    try {localStorage.setItem('northeast-language',value)} catch { /* language is still selected for this visit */ }
  }
  const guide = guides[language]
  return <main className="shell page">
    <PanelHeader icon={BookOpen} title="Awareness & Basic Knowledge">Prepare for floods, landslides, and earthquakes. Save a PDF to read without internet access.</PanelHeader>
    <div className="awareness-controls"><Field label="Guide language"><select value={language} onChange={change}>
      {Object.entries(languageNames).map(([id,name])=><option key={id} lang={id} value={id}>{name}</option>)}
    </select></Field></div>
    {guide.review && <Message><span lang={language}>{guide.review}</span> · Translation pending human review</Message>}
    <div className="awareness-guides">{guideIds.map((id,index)=><article className="guide" key={id} lang={language}>
      <div className="section-top"><h2>{guide.titles[index]}</h2><a className="outline" aria-label={guide.titles[index]+' — '+guide.download} download href={import.meta.env.BASE_URL+'guides/'+language+'/'+guideFilename(id,language)}><Download size={17}/>{guide.download}</a></div>
      <p>{guide.captions[index]}</p>
      {guide.content[index].map((items,section)=><section key={section}>
        <h3>{(index===3?guide.kit:guide.stages)[section]}</h3>
        <ul className={index===3 || section===0?'kit-list':undefined}>{items.map(text=><li key={text}>{text}</li>)}</ul>
      </section>)}
      <aside className="guide-callout"><strong>{index===3?guide.safety:guide.avoid}</strong><p>{guide.callouts[index]}</p></aside>
      <div><strong>{guide.sources}</strong><ul>{references[index].map((url,source)=><li key={url}><a href={url}>{guide.sourceNames[index][source]}</a></li>)}</ul>
        <small>{guide.reviewed} · <time dateTime={reviewedOn}>{guideReviewDate(language)}</time></small>
      </div>
    </article>)}</div>
  </main>
}
