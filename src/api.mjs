import {createClient} from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const local = !url
const supabase = url && key ? createClient(url,key) : null

export async function api(path, body) {
  if (local) {
    const response = await fetch('/api/'+path,body === undefined ? {} : {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    const data = await response.json()
    if (!response.ok) throw new Error(data.error)
    return data
  }
  if (!supabase) throw new Error('Supabase publishable key is missing.')
  if (path === 'logout') {
    const {error} = await supabase.auth.signOut()
    if (error) throw error
    return true
  }
  if (path === 'login') {
    const {error} = await supabase.auth.signInWithPassword(body)
    if (error) throw error
    if (await api('session')) return true
    await supabase.auth.signOut()
    throw new Error('This account is not authorized as an administrator.')
  }
  if (path === 'session') {
    const {data,error} = await supabase.rpc('is_admin')
    if (error) throw error
    return data
  }
  if (path === 'requests' || path === 'track') {
    const {data,error} = await supabase.rpc(path === 'requests' ? 'submit_request' : 'track_request',{input:body})
    if (error) throw error
    return data
  }
  const [scope,collection] = path.split('/')
  const admin = scope === 'admin'
  const table = admin ? collection : scope
  if (admin && !await api('session')) throw new Error('Administrator sign-in required.')
  let query = supabase.from(table)
  if (body) {
    const {id,...values} = body
    query = (id ? query.update(values).eq('id',id) : query.insert(values)).select('id').single()
  } else {
    query = query.select('*').order('updated_at',{ascending:false})
    if (!admin && table === 'alerts') query = query.eq('publication','Published')
  }
  const {data,error} = await query
  if (error) throw error
  return data
}
