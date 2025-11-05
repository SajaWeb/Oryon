/**
 * Herramienta de diagnóstico para Oryon App
 * 
 * Para usar desde la consola del navegador:
 * 
 * import { runDiagnostics } from './utils/diagnostics'
 * runDiagnostics()
 */

import { projectId, publicAnonKey } from './supabase/info'
import { getSupabaseClient } from './supabase/client'

export async function runDiagnostics() {
  console.log('🔍 Iniciando diagnóstico de Oryon App...\n')
  
  const results: { [key: string]: boolean } = {}
  
  // 1. Verificar configuración básica
  console.log('1️⃣ Verificando configuración...')
  if (projectId && projectId !== 'undefined') {
    console.log('  ✅ Project ID configurado:', projectId)
    results.projectId = true
  } else {
    console.error('  ❌ Project ID no configurado')
    results.projectId = false
  }
  
  if (publicAnonKey && publicAnonKey !== 'undefined') {
    console.log('  ✅ Anon Key configurado')
    results.anonKey = true
  } else {
    console.error('  ❌ Anon Key no configurado')
    results.anonKey = false
  }
  
  // 2. Verificar sesión de usuario
  console.log('\n2️⃣ Verificando sesión de usuario...')
  try {
    const supabase = getSupabaseClient()
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('  ❌ Error al obtener sesión:', error.message)
      results.session = false
    } else if (session) {
      console.log('  ✅ Sesión activa')
      console.log('    Usuario:', session.user.email)
      console.log('    Token válido hasta:', new Date(session.expires_at! * 1000).toLocaleString())
      results.session = true
    } else {
      console.log('  ⚠️ No hay sesión activa')
      results.session = false
    }
  } catch (error) {
    console.error('  ❌ Error verificando sesión:', error)
    results.session = false
  }
  
  // 3. Verificar conectividad con Supabase
  console.log('\n3️⃣ Verificando conectividad con Supabase...')
  try {
    const baseUrl = `https://${projectId}.supabase.co`
    const response = await fetch(baseUrl)
    
    if (response.ok || response.status === 404) {
      console.log('  ✅ Conectividad con Supabase OK')
      results.connectivity = true
    } else {
      console.error('  ❌ Problema de conectividad:', response.status)
      results.connectivity = false
    }
  } catch (error) {
    console.error('  ❌ No se puede conectar a Supabase:', error)
    results.connectivity = false
  }
  
  // 4. Verificar Edge Function - Health Check
  console.log('\n4️⃣ Verificando Edge Function (Health Check)...')
  try {
    const healthUrl = `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/health`
    const response = await fetch(healthUrl)
    
    if (response.ok) {
      const data = await response.json()
      console.log('  ✅ Edge Function está activa')
      console.log('    Estado:', data.status)
      console.log('    Servicio:', data.service)
      console.log('    Timestamp:', data.timestamp)
      results.edgeFunction = true
    } else {
      console.error('  ❌ Edge Function no responde:', response.status)
      const text = await response.text()
      console.error('    Respuesta:', text)
      results.edgeFunction = false
    }
  } catch (error) {
    console.error('  ❌ No se puede conectar a Edge Function:', error)
    results.edgeFunction = false
  }
  
  // 5. Verificar autenticación con backend
  console.log('\n5️⃣ Verificando autenticación con backend...')
  try {
    const supabase = getSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session) {
      const authUrl = `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/auth/session`
      const response = await fetch(authUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('  ✅ Autenticación con backend OK')
        console.log('    Usuario:', data.user?.name || data.user?.email)
        console.log('    Rol:', data.user?.role)
        console.log('    Empresa:', data.license?.companyName)
        results.backendAuth = true
      } else {
        console.error('  ❌ Error de autenticación con backend:', response.status)
        const text = await response.text()
        console.error('    Respuesta:', text)
        results.backendAuth = false
      }
    } else {
      console.log('  ⚠️ No hay sesión para verificar')
      results.backendAuth = false
    }
  } catch (error) {
    console.error('  ❌ Error verificando autenticación:', error)
    results.backendAuth = false
  }
  
  // 6. Verificar acceso a datos (ejemplo: repairs)
  console.log('\n6️⃣ Verificando acceso a datos (repairs)...')
  try {
    const supabase = getSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session) {
      const repairsUrl = `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/repairs`
      const response = await fetch(repairsUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('  ✅ Acceso a datos OK')
        console.log('    Reparaciones encontradas:', data.repairs?.length || 0)
        results.dataAccess = true
      } else {
        console.error('  ❌ Error accediendo a datos:', response.status)
        const text = await response.text()
        console.error('    Respuesta:', text)
        results.dataAccess = false
      }
    } else {
      console.log('  ⚠️ No hay sesión para verificar')
      results.dataAccess = false
    }
  } catch (error) {
    console.error('  ❌ Error verificando acceso a datos:', error)
    results.dataAccess = false
  }
  
  // Resumen
  console.log('\n' + '='.repeat(50))
  console.log('📊 RESUMEN DE DIAGNÓSTICO')
  console.log('='.repeat(50))
  
  const checks = [
    { name: 'Configuración (Project ID)', status: results.projectId },
    { name: 'Configuración (Anon Key)', status: results.anonKey },
    { name: 'Sesión de usuario', status: results.session },
    { name: 'Conectividad Supabase', status: results.connectivity },
    { name: 'Edge Function activa', status: results.edgeFunction },
    { name: 'Autenticación backend', status: results.backendAuth },
    { name: 'Acceso a datos', status: results.dataAccess },
  ]
  
  let passedChecks = 0
  checks.forEach(check => {
    const icon = check.status ? '✅' : '❌'
    console.log(`${icon} ${check.name}`)
    if (check.status) passedChecks++
  })
  
  console.log('\n' + '='.repeat(50))
  console.log(`Resultado: ${passedChecks}/${checks.length} checks pasados`)
  
  if (passedChecks === checks.length) {
    console.log('🎉 ¡Todo está funcionando correctamente!')
  } else if (passedChecks >= checks.length - 2) {
    console.log('⚠️ Hay algunos problemas menores')
    console.log('💡 Revisa los items marcados con ❌')
  } else {
    console.log('🚨 Hay problemas importantes que requieren atención')
    console.log('📖 Consulta TROUBLESHOOTING.md para más ayuda')
  }
  
  console.log('='.repeat(50) + '\n')
  
  return results
}

// Auto-ejecutar si se importa directamente
if (typeof window !== 'undefined') {
  (window as any).runDiagnostics = runDiagnostics
  console.log('💡 Diagnóstico disponible: runDiagnostics()')
}
