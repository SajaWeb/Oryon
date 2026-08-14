import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qjcbgylyhfjfiwoyinyj.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqY2JneWx5aGZqZml3b3lpbnlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDgwODUsImV4cCI6MjA3NzU4NDA4NX0.TNcaGGw53ysXk7p_13uTl2Ma45UhXkj4KUQaX-f5jd8'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function fixSuperAdmin() {
  console.log('🔍 Buscando usuario en kv_store_4d437e50...')
  
  const { data: records, error: selectError } = await supabase
    .from('kv_store_4d437e50')
    .select('key, value')
    .like('key', 'user:%')

  if (selectError) {
    console.error('❌ Error consultando:', selectError)
    return
  }

  console.log('Usuarios encontrados en KV:', records)

  for (const record of records || []) {
    let userData = typeof record.value === 'string' ? JSON.parse(record.value) : record.value
    if (typeof userData === 'string') userData = JSON.parse(userData)
    
    console.log('Procesando usuario:', userData)

    if (userData.email === 'aechavarriaj@gmail.com' || userData.role === 'admin' || userData.role === 'superadmin') {
      const fixedUser = {
        userId: userData.userId || userData.id,
        id: userData.userId || userData.id,
        email: userData.email,
        name: userData.name || 'Alejandro Echavarria Jaramillo',
        role: 'superadmin',
        isSuperAdmin: true,
        isMaster: true,
        active: true,
        updatedAt: new Date().toISOString(),
        createdAt: userData.createdAt || new Date().toISOString()
      }

      console.log('Actualizando usuario a SUPERADMIN:', fixedUser)

      const { error: upsertError } = await supabase
        .from('kv_store_4d437e50')
        .upsert({
          key: record.key,
          value: JSON.stringify(fixedUser)
        })

      if (upsertError) {
        console.error('❌ Error actualizando KV:', upsertError)
      } else {
        console.log('✅ Usuario actualizado exitosamente en KV con rol superadmin!')
      }
    }
  }

  // Eliminar cualquier company ficticia creada para el superadmin
  const { data: companies } = await supabase
    .from('kv_store_4d437e50')
    .select('key, value')
    .like('key', 'company:%')

  for (const comp of companies || []) {
    let compData = typeof comp.value === 'string' ? JSON.parse(comp.value) : comp.value
    if (typeof compData === 'string') compData = JSON.parse(compData)
    if (compData.name === 'Oryon Global' || compData.name === 'Oryon SuperAdmin') {
      console.log('Eliminando empresa no necesaria creada durante setup:', comp.key)
      await supabase.from('kv_store_4d437e50').delete().eq('key', comp.key)
    }
  }
}

fixSuperAdmin().catch(console.error)
