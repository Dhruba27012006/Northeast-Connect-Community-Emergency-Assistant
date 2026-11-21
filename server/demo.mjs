import { DatabaseSync } from 'node:sqlite'
import { randomBytes, createHash, scryptSync, timingSafeEqual } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { seed } from './seed.mjs'
import { addressFields } from '../src/report-address.mjs'
import { locations, categories, statuses, severities, resourceTypes, availability } from '../src/domain.mjs'

const token = () => randomBytes(24).toString('base64url')
const hash = value => createHash('sha256').update(value).digest('hex')
const now = () => new Date().toISOString()
const clean = value => typeof value === 'string' ? value.trim() : ''
const pick = (value, allowed) => {
  if (!allowed.includes(value)) throw new Error('Choose a valid option.')
  return value
}
const field = (value, max, required = true) => {
  const result = clean(value)
  if (result.length > max || (required && !result)) throw new Error('Check the required fields and their lengths.')
  return result
}
const date = value => {
  if (!value || !Number.isFinite(Date.parse(value))) throw new Error('Enter a valid date and time.')
  return new Date(value).toISOString()
}
const area = body => ({
  state: pick(body.state,Object.keys(locations)),
  district: field(body.district,100)
})
function incidentAddress(body) {
  const address = {locality:field(body.locality,120)}
  for (const [key,,limit] of addressFields) address[key] = field(body[key],limit,false)
  if (address.pin && !/^[1-9]\d{5}$/.test(address.pin)) throw new Error('Enter a valid six-digit PIN code.')
  const {latitude,longitude} = body
  if (latitude == null && longitude == null) return address
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude)>90 || Math.abs(longitude)>180) {
    throw new Error('Location coordinates are invalid.')
  }
  return {...address,latitude,longitude}
}

function updateReport(record,body,at) {
  const status = pick(body.status,statuses)
  const note = field(body.public_update,400,false)
  const private_notes = field(body.private_notes,1000,false)
  const events = record.events || []
  const changedStatus = status !== record.status
  const changedNote = note !== record.public_update
  const legacy_note = record.submitted_at ? null : events.length ? record.legacy_note : record.public_update || null
  const nextEvents = changedStatus || changedNote ? [...events,{
    kind:changedStatus?'status':'note',status,at,note:changedNote?note:''
  }] : events
  return {...record,status,public_update:note,private_notes,legacy_note,events:nextEvents,updated_at:at}
}

async function read(req) {
  let data = ''
  for await (const chunk of req) {
    data += chunk
    if (data.length > 12000) throw new Error('Request is too large.')
  }
  try { return JSON.parse(data) } catch { throw new Error('Invalid request.') }
}

export function demoApi(env) {
  function install(server) {
    mkdirSync('.local',{recursive:true})
    const db = new DatabaseSync('.local/northeast.sqlite')
    db.exec(`pragma busy_timeout=5000;
      create table if not exists records(id integer primary key, bucket text not null, code text unique, payload text not null);
      create table if not exists sessions(digest text primary key, expires integer not null);
      create table if not exists metadata(key text primary key);
      create index if not exists records_bucket on records(bucket,id);`)
    const insert = db.prepare('insert into records(bucket,code,payload) values (?,?,?)')
    const list = db.prepare('select id,payload from records where bucket=? order by id desc')
    const find = db.prepare('select id,payload from records where id=? and bucket=?')
    const update = db.prepare('update records set payload=? where id=? and bucket=?')
    const decode = row => ({id:row.id,...JSON.parse(row.payload)})
    if (!db.prepare("select key from metadata where key='seed'").get()) {
      db.exec('begin')
      for (const [bucket, entries] of Object.entries(seed)) {
        for (const entry of [...entries].reverse()) insert.run(bucket,null,JSON.stringify({...entry,updated_at:now()}))
      }
      db.exec("insert into metadata values ('seed'); commit")
    }
    const password = env.DEMO_ADMIN_PASSWORD || 'Northeast-Demo-2026!'
    const salt = randomBytes(16)
    const passwordHash = scryptSync(password,salt,64)
    const email = env.DEMO_ADMIN_EMAIL || 'admin@northeast.test'
    const attempts = new Map()
    server.middlewares.use(async (req,res,next) => {
      const path = req.url?.split('?')[0]
      if (!path?.startsWith('/api/')) return next()
      function send(status,data) {
        res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'})
        res.end(JSON.stringify(data))
      }
      const session = /(?:^|;\s*)nc_session=([\w-]+)/.exec(req.headers.cookie || '')?.[1]
      const authorised = session && db.prepare('select 1 from sessions where digest=? and expires>?').get(hash(session),Date.now())
      if (req.method === 'POST' && req.headers.origin && req.headers.origin !== 'http://' + req.headers.host) return send(403,{error:'Invalid origin.'})
      try {
        if (path === '/api/session' && req.method === 'GET') return send(200,Boolean(authorised))
        if (path === '/api/login' && req.method === 'POST') {
          const ip = req.socket.remoteAddress
          const attempt = attempts.get(ip)
          if (attempt && attempt.until > Date.now() && attempt.count >= 8) return send(429,{error:'Too many attempts. Try again in a minute.'})
          const body = await read(req)
          const valid = timingSafeEqual(passwordHash,scryptSync(clean(body.password).slice(0,256),salt,64))
          if (!valid || body.email !== email) {
            attempts.set(ip,attempt?.until > Date.now() ? {...attempt,count:attempt.count+1} : {count:1,until:Date.now()+60000})
            return send(401,{error:'Invalid administrator credentials.'})
          }
          attempts.delete(ip)
          const key = token()
          db.prepare('delete from sessions where expires<=?').run(Date.now())
          db.prepare('insert into sessions values (?,?)').run(hash(key),Date.now()+8*3600000)
          res.setHeader('Set-Cookie','nc_session='+key+'; Path=/api; HttpOnly; SameSite=Strict; Max-Age=28800')
          return send(200,true)
        }
        if (path === '/api/logout' && req.method === 'POST') {
          if (session) db.prepare('delete from sessions where digest=?').run(hash(session))
          res.setHeader('Set-Cookie','nc_session=; Path=/api; HttpOnly; SameSite=Strict; Max-Age=0')
          return send(200,true)
        }
        const [, , group, bucket] = path.split('/')
        if (group === 'admin') {
          if (!authorised) return send(401,{error:'Administrator sign-in required.'})
          if (!Object.hasOwn(seed,bucket)) return send(404,{error:'Unknown collection.'})
          if (req.method === 'GET') return send(200,list.all(bucket).map(decode))
          if (req.method !== 'POST') return send(405,{error:'Method unavailable.'})
          const body = await read(req)
          if (bucket === 'requests') {
            db.exec('begin immediate')
            try {
              const existing = body.id ? find.get(body.id,bucket) : null
              if (!existing) {
                db.exec('rollback')
                return send(404,{error:'Record unavailable.'})
              }
              const data = updateReport(decode(existing),body,now())
              update.run(JSON.stringify(data),body.id,bucket)
              db.exec('commit')
            } catch (error) {
              db.exec('rollback')
              throw error
            }
            return send(200,true)
          }
          const existing = body.id ? find.get(body.id,bucket) : null
          if (body.id && !existing) return send(404,{error:'Record unavailable.'})
          let data
          if (bucket === 'alerts') data = {...area(body),title:field(body.title,120),area:field(body.area,160),severity:pick(body.severity,severities),instructions:field(body.instructions,1600),source:field(body.source,250),issued_at:date(body.issued_at),publication:pick(body.publication,['Draft','Published','Expired'])}
          if (bucket === 'resources') data = {...area(body),name:field(body.name,120),type:pick(body.type,resourceTypes),address:field(body.address,250),contact:field(body.contact,120),availability:pick(body.availability,availability),verified_at:date(body.verified_at)}
          const payload = JSON.stringify({...data,demo:true,updated_at:now()})
          if (existing) update.run(payload,body.id,bucket)
          else insert.run(bucket,null,payload)
          return send(200,true)
        }
        if (req.method === 'GET' && ['alerts','resources'].includes(group)) {
          const rows = list.all(group).map(decode)
          return send(200,group === 'alerts' ? rows.filter(row => row.publication === 'Published') : rows)
        }
        if (path === '/api/requests' && req.method === 'POST') {
          const body = await read(req)
          const people = Number(body.people)
          if (!Number.isInteger(people) || people < 1 || people > 10000) throw new Error('Enter a number of people from 1 to 10,000.')
          const at = now()
          const data = {...area(body),...incidentAddress(body),type:pick(body.type,categories),people,callback:field(body.callback,30,false),
            status:'Submitted',public_update:'',private_notes:'',demo:true,updated_at:at,submitted_at:at,
            events:[{kind:'status',status:'Submitted',at,note:''}]}
          const code = token()
          insert.run('requests',hash(code),JSON.stringify(data))
          return send(201,{code})
        }
        if (path === '/api/track' && req.method === 'POST') {
          const {code} = await read(req)
          const row = typeof code === 'string' && /^[\w-]{32}$/.test(code) && db.prepare("select payload from records where bucket='requests' and code=?").get(hash(code))
          if (!row) return send(200,null)
          const {status,public_update,updated_at,demo,submitted_at=null,events=[],legacy_note} = JSON.parse(row.payload)
          return send(200,{
            status,updated_at,demo,submitted_at,history_incomplete:!submitted_at,
            events:events.map(({kind,status,at,note})=>({kind,status,at,note})),
            legacy_note:submitted_at?null:events.length?legacy_note || null:public_update || null
          })
        }
        return send(404,{error:'Page unavailable.'})
      } catch (error) {
        if (error.code?.startsWith('ERR_SQLITE')) return send(500,{error:'The database is temporarily unavailable.'})
        return send(400,{error:error.message || 'The operation could not be completed.'})
      }
    })
    server.httpServer?.once('close',() => db.close())
  }
  return {name:'northeast-local-demo',configureServer:install,configurePreviewServer:install}
}
