import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qjcbgylyhfjfiwoyinyj.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqY2JneWx5aGZqZml3b3lpbnlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDgwODUsImV4cCI6MjA3NzU4NDA4NX0.TNcaGGw53ysXk7p_13uTl2Ma45UhXkj4KUQaX-f5jd8'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function cleanDatabase() {
  console.log('🔍 Consultando registros actuales en kv_store_4d437e50...')
  
  const { data: records, error: selectError } = await supabase
    .from('kv_store_4d437e50')
    .select('key')
    .limit(1000)

  if (selectError) {
    console.error('❌ Error al consultar kv_store_4d437e50:', selectError)
  } else {
    console.log(`📊 Encontrados ${records?.length || 0} registros en la base de datos KV:`)
    console.log(records?.map(r => r.key))
    
    if (records && records.length > 0) {
      const keysToDelete = records.map(r => r.key)
      console.log(`🗑️ Eliminando ${keysToDelete.length} registros...`)
      
      const { error: deleteError } = await supabase
        .from('kv_store_4d437e50')
        .delete()
        .in('key', keysToDelete)
      
      if (deleteError) {
        console.error('❌ Error al eliminar registros:', deleteError)
      } else {
        console.log('✅ ¡Todos los registros de KV fueron eliminados exitosamente!')
      }
    } else {
      console.log('ℹ️ La base de datos KV ya está completamente limpia.')
    }
  }
}

cleanDatabase().catch(console.error)
