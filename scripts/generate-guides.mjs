import {chromium} from 'playwright'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {guideFilename,guideIds,guideReviewDate,guides,languageNames,references,reviewedOn} from '../src/guides.mjs'

const browser = await chromium.launch({channel:process.env.NC_BROWSER || 'chrome'})
const escape = value => value.replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]))
async function font(script,weight) {
  const name = 'noto-sans-'+script
  const path = '../node_modules/@fontsource/'+name+'/files/'+name+'-'+script+'-'+weight+'-normal.woff2'
  const file = await readFile(new URL(path,import.meta.url))
  return '@font-face{font-family:Guide;src:url(data:font/woff2;base64,'+file.toString('base64')+');font-weight:'+weight+'}'
}
try {
  const page = await browser.newPage()
  for (const [language,guide] of Object.entries(guides)) {
    const script = language==='hi' ? 'devanagari' : 'bengali'
    const fonts = language==='en' ? '' : (await Promise.all([400,700].map(weight=>font(script,weight)))).join('')
    const directory = new URL('../public/guides/'+language+'/',import.meta.url)
    await mkdir(directory,{recursive:true})
    for (const [index,id] of guideIds.entries()) {
      const checklist = index===3
      const sections = guide.content[index].map((items,section)=>
        '<section'+(!checklist && section===0?' class="prep"':'')+'><h2>'+escape((checklist?guide.kit:guide.stages)[section])+'</h2><ul>'+
        items.map(item=>'<li>'+escape(item)+'</li>').join('')+'</ul></section>'
      ).join('')
      const links = references[index].map((url,source)=>
        '<li><a href="'+escape(url)+'">'+escape(guide.sourceNames[index][source])+'</a></li>'
      ).join('')
      await page.setContent(`<!doctype html><html lang="${language}"><head><meta charset="utf-8"><title>${escape(guide.titles[index])} · ${languageNames[language]}</title><style>${fonts}
        @page{size:A4;margin:15mm}
        body{margin:0;color:#17283c;font:15.5px/1.48 Guide,"Segoe UI",sans-serif}
        header{border-bottom:3px solid #a63a10;padding-bottom:10px;margin-bottom:10px}
        h1{font-size:32px;line-height:1.25;margin:4px 0} h2{font-size:18px;margin:0}
        p{margin:4px 0} section{margin-top:11px;break-inside:avoid}
        ul{padding-left:22px;margin:4px 0} li{margin:3px 0;break-inside:avoid}
        .review,.callout{background:#fff1df;padding:7px 10px;break-inside:avoid}
        .callout{margin-top:12px;border-left:3px solid #a63a10}
        .checklist{display:grid;grid-template-columns:1fr 1fr;column-gap:24px}
        .checklist ul,.prep ul{padding:0;list-style:none}
        .checklist li,.prep li{position:relative;padding-left:19px;margin:6px 0}
        .checklist li::before,.prep li::before{content:'';width:10px;height:10px;border:1px solid #41556a;position:absolute;left:0;top:.35em}
        footer{border-top:1px solid #aab9ca;margin-top:12px;padding-top:7px;font-size:12.5px;break-inside:avoid} a{color:#164e80}
        </style></head><body><header><strong lang="en">Northeast Connect · Gauhati University PS05</strong><h1>${escape(guide.titles[index])}</h1><p>${escape(guide.language)} · ${languageNames[language]}</p><p>${escape(guide.captions[index])}</p></header>
        ${guide.review?'<p class="review">'+escape(guide.review)+'</p>':''}
        <main class="${checklist?'checklist':''}">${sections}</main>
        <aside class="callout"><strong>${escape(checklist?guide.safety:guide.avoid)}</strong><p>${escape(guide.callouts[index])}</p></aside>
        <footer><strong>${escape(guide.sources)}</strong><ul>${links}</ul><p>${escape(guide.reviewed)} · <time datetime="${reviewedOn}">${escape(guideReviewDate(language))}</time></p></footer>
        </body></html>`)
      await page.evaluate(()=>document.fonts.ready)
      const statuses = await page.evaluate(()=>[...document.fonts].map(font=>font.status))
      if (language!=='en' && statuses.some(status=>status!=='loaded')) throw new Error('Font not loaded for '+language)
      const pdf = await page.pdf({preferCSSPageSize:true,printBackground:true,tagged:true})
      await writeFile(new URL(guideFilename(id,language),directory),pdf)
    }
  }
} finally {await browser.close()}
