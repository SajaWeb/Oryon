import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from 'npm:@supabase/supabase-js@2'
import * as kv from './kv_store.tsx'

const app = new Hono()

// Configure CORS with explicit settings
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 600,
  credentials: true,
}))
app.use('*', logger(console.log))

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Helper to generate IDs
async function getNextId(type: string): Promise<number> {
  const key = `counter:${type}`
  const current = await kv.get(key)
  const nextId = current ? parseInt(current) + 1 : 1
  await kv.set(key, nextId.toString())
  return nextId
}

// Auth middleware - verifies user is authenticated
async function verifyAuth(authHeader: string | null) {
  if (!authHeader) {
    return { error: 'No authorization header', user: null }
  }
  
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    return { error: 'Unauthorized', user: null }
  }
  
  return { error: null, user }
}

// Get user profile with company info
async function getUserProfile(userId: string) {
  const userDataStr = await kv.get(`user:${userId}`)
  if (!userDataStr) {
    return null
  }
  return JSON.parse(userDataStr)
}

// Check if company license is valid (feature-based model with trial)
async function checkLicense(companyId: number) {
  const companyDataStr = await kv.get(`company:${companyId}`)
  if (!companyDataStr) {
    return { valid: false, inTrial: false, trialExpired: false, planId: 'basico', company: null }
  }
  
  const company = JSON.parse(companyDataStr)
  
  // Default to basico plan if not set
  if (!company.planId) {
    company.planId = 'basico'
    await kv.set(`company:${companyId}`, JSON.stringify(company))
  }
  
  // Check if in trial period
  let inTrial = false
  let trialExpired = false
  
  if (company.trialEndsAt) {
    const now = new Date()
    const trialEnd = new Date(company.trialEndsAt)
    inTrial = now <= trialEnd
    trialExpired = now > trialEnd
  }
  
  return {
    valid: true, // All plans are valid, limits enforced at resource creation
    inTrial,
    trialExpired,
    planId: company.planId,
    trialEndsAt: company.trialEndsAt,
    company
  }
}

// Helper to filter only actual products (exclude transactions, units, variants)
function filterOnlyProducts(items: string[]): any[] {
  return items
    .map((item: string) => {
      try {
        return JSON.parse(item)
      } catch {
        return null
      }
    })
    .filter((item: any) => {
      if (!item) return false
      
      // Check if this is an actual product (has name, price, category)
      // and NOT a transaction (has action, userId), unit (has imei/serialNumber), or variant
      const isProduct = item.name && 
                        item.price !== undefined && 
                        item.category && 
                        !item.action && 
                        !item.userId && 
                        !item.imei && 
                        !item.serialNumber &&
                        !item.productId // variants and transactions have productId reference
      
      return isProduct
    })
}

// Helper to log product transaction
async function logProductTransaction(data: {
  productId: number
  productName: string
  action: string
  description: string
  userId: string
  userName: string
  userRole: string
  branchId: string
  companyId: string
  targetBranchId?: string
  quantity?: number
  details?: string
}) {
  try {
    const transactionId = await getNextId('product_transaction')
    const transaction = {
      id: transactionId,
      ...data,
      timestamp: new Date().toISOString()
    }
    
    await kv.set(`product_transaction:${transactionId}`, JSON.stringify(transaction))
    
    // Also store a reference indexed by product for easier querying
    await kv.set(`product:${data.productId}:transaction:${transactionId}`, JSON.stringify(transaction))
  } catch (error) {
    console.log('Error logging transaction:', error)
    // Don't fail the main operation if logging fails
  }
}

// Helper to upload image to Cloudinary
async function uploadToCloudinary(base64Image: string, folder: string = 'repairs') {
  const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME')
  const apiKey = Deno.env.get('CLOUDINARY_API_KEY')
  const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET')

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary credentials not configured')
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`
  
  // Create signature using Web Crypto API
  const encoder = new TextEncoder()
  const data = encoder.encode(paramsToSign)
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  const formData = new FormData()
  formData.append('file', base64Image)
  formData.append('folder', folder)
  formData.append('timestamp', timestamp.toString())
  formData.append('api_key', apiKey)
  formData.append('signature', signature)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error('Cloudinary upload error:', error)
    throw new Error('Failed to upload image to Cloudinary')
  }

  const result = await response.json()
  return result.secure_url
}

// ==================== HEALTH CHECK ====================

// Health check endpoint
app.get('/make-server-4d437e50/health', (c) => {
  return c.json({ 
    success: true, 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Oryon App Backend'
  })
})

// ==================== IMAGE UPLOAD ====================

// Upload images to Cloudinary
app.post('/make-server-4d437e50/upload-images', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const body = await c.req.json()
    const { images } = body

    if (!images || !Array.isArray(images) || images.length === 0) {
      return c.json({ success: false, error: 'No images provided' }, 400)
    }

    const uploadedUrls: string[] = []
    
    for (const base64Image of images) {
      try {
        const url = await uploadToCloudinary(base64Image, 'oryon-repairs')
        uploadedUrls.push(url)
      } catch (uploadError) {
        console.error('Error uploading single image:', uploadError)
        // Continue with other images even if one fails
      }
    }

    return c.json({ success: true, urls: uploadedUrls })
  } catch (error) {
    console.error('Error uploading images:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ==================== AUTH ====================

// Sign up - creates company, branch, and admin user
app.post('/make-server-4d437e50/auth/signup', async (c) => {
  try {
    const { email, password, name, companyName } = await c.req.json()
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Auto-confirm since we don't have email server
    })
    
    if (authError || !authData.user) {
      console.log('Error creating auth user:', authError)
      return c.json({ success: false, error: authError?.message || 'Failed to create user' }, 400)
    }
    
    // Create company with 7 days trial on basic plan
    const companyId = await getNextId('company')
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 7)
    
    const licenseExpiry = new Date()
    licenseExpiry.setDate(licenseExpiry.getDate() + 7) // Same as trial for initial setup
    
    const company = {
      id: companyId,
      name: companyName,
      planId: 'basico',
      trialEndsAt: trialEndsAt.toISOString(),
      licenseExpiry: licenseExpiry.toISOString(),
      createdAt: new Date().toISOString()
    }
    
    await kv.set(`company:${companyId}`, JSON.stringify(company))
    
    // Create default branch (Principal)
    const branchId = `branch_${companyId}_1`
    const branch = {
      id: branchId,
      companyId,
      name: 'Principal',
      address: '',
      phone: '',
      isMain: true,
      createdAt: new Date().toISOString()
    }
    
    await kv.set(`branch:${branchId}`, JSON.stringify(branch))
    await kv.set(`company:${companyId}:branches`, JSON.stringify([branchId]))
    
    // Create user profile (admin doesn't have branchId)
    const userProfile = {
      userId: authData.user.id,
      email,
      name,
      companyId,
      role: 'admin',
      active: true,
      createdAt: new Date().toISOString()
    }
    
    await kv.set(`user:${authData.user.id}`, JSON.stringify(userProfile))
    
    console.log('Company created with trial plan:', {
      companyId,
      planId: 'basico',
      trialEndsAt: trialEndsAt.toISOString(),
      defaultBranch: branchId
    })
    
    return c.json({ 
      success: true, 
      message: 'Account created successfully',
      company,
      branch,
      user: userProfile
    })
  } catch (error) {
    console.log('Error in signup:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Google OAuth - Create profile, company, and branch for first-time Google users
app.post('/make-server-4d437e50/auth/google-setup', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    // Check if user already has a profile
    const existingProfile = await getUserProfile(user.id)
    if (existingProfile) {
      return c.json({ success: true, message: 'Profile already exists', user: existingProfile })
    }
    
    const { name, companyName } = await c.req.json()
    
    // Create company with 7 days trial on basic plan
    const companyId = await getNextId('company')
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 7)
    
    const company = {
      id: companyId,
      name: companyName || `Empresa de ${name}`,
      planId: 'basico',
      trialEndsAt: trialEndsAt.toISOString(),
      createdAt: new Date().toISOString()
    }
    
    await kv.set(`company:${companyId}`, JSON.stringify(company))
    
    // Create default branch (Principal)
    const branchId = `branch_${companyId}_1`
    const branch = {
      id: branchId,
      companyId,
      name: 'Principal',
      address: '',
      phone: '',
      isMain: true,
      createdAt: new Date().toISOString()
    }
    
    await kv.set(`branch:${branchId}`, JSON.stringify(branch))
    await kv.set(`company:${companyId}:branches`, JSON.stringify([branchId]))
    
    // Create user profile
    const userProfile = {
      userId: user.id,
      email: user.email,
      name: name || user.user_metadata?.full_name || user.email?.split('@')[0],
      companyId,
      role: 'admin',
      active: true,
      authProvider: 'google',
      createdAt: new Date().toISOString()
    }
    
    await kv.set(`user:${user.id}`, JSON.stringify(userProfile))
    
    console.log('Google setup completed with trial plan:', {
      companyId,
      planId: 'basico',
      trialEndsAt: trialEndsAt.toISOString(),
      defaultBranch: branchId
    })
    
    return c.json({ 
      success: true, 
      message: 'Profile created successfully',
      company,
      branch,
      user: userProfile
    })
  } catch (error) {
    console.log('Error in Google setup:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Get current session
app.get('/make-server-4d437e50/auth/session', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    
    if (error || !user) {
      return c.json({ success: false, authenticated: false })
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      // User authenticated but no profile (likely Google OAuth first time)
      return c.json({ 
        success: false, 
        authenticated: true,
        needsSetup: true,
        user: {
          userId: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email?.split('@')[0]
        }
      })
    }
    
    // Check if user is active (default to true for backward compatibility)
    if (userProfile.active === false) {
      return c.json({ 
        success: false, 
        authenticated: false,
        error: 'Usuario desactivado. Contacta al administrador.' 
      }, 403)
    }
    
    const license = await checkLicense(userProfile.companyId)
    
    // Add company name to user profile for display
    if (license.company) {
      userProfile.companyName = license.company.name
    }
    
    return c.json({ 
      success: true, 
      authenticated: true,
      user: userProfile,
      license
    })
  } catch (error) {
    console.log('Error checking session:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ==================== COMPANY & USERS ====================

// Get company users (admin only)
app.get('/make-server-4d437e50/company/users', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    // Get all users and filter by company
    const allUsers = await kv.getByPrefix('user:')
    const companyUsers = allUsers
      .map((u: string) => JSON.parse(u))
      .filter((u: any) => u.companyId === userProfile.companyId)
    
    return c.json({ success: true, users: companyUsers })
  } catch (error) {
    console.log('Error fetching company users:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Create employee user (admin only)
app.post('/make-server-4d437e50/company/users', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403)
    }
    
    const { email, password, name, role } = await c.req.json()
    
    // Check plan limits before creating user
    const license = await checkLicense(userProfile.companyId)
    const planId = license.planId || 'basico'
    const limits = PLAN_LIMITS[planId as keyof typeof PLAN_LIMITS]
    
    if (!limits) {
      return c.json({ success: false, error: 'Plan no válido' }, 400)
    }
    
    // Count current users by role (only active users)
    const allUsers = await kv.getByPrefix('user:')
    const companyUsers = allUsers
      .map((u: string) => JSON.parse(u))
      .filter((u: any) => 
        u.companyId === userProfile.companyId && 
        (u.active === undefined || u.active === true) // Only count active users
      )
    
    const employeeRole = role || 'asesor'
    const adminCount = companyUsers.filter((u: any) => u.role === 'admin').length
    const advisorCount = companyUsers.filter((u: any) => u.role === 'asesor').length
    const technicianCount = companyUsers.filter((u: any) => u.role === 'tecnico').length
    
    // Validate role limits
    if (employeeRole === 'admin' && adminCount >= limits.admins) {
      return c.json({ 
        success: false, 
        error: `Tu plan ${planId} permite máximo ${limits.admins} administrador${limits.admins > 1 ? 'es' : ''}. Actualiza tu plan para agregar más.` 
      }, 403)
    }
    
    if (employeeRole === 'asesor' && advisorCount >= limits.advisors) {
      return c.json({ 
        success: false, 
        error: `Tu plan ${planId} permite máximo ${limits.advisors} asesor${limits.advisors > 1 ? 'es' : ''}. Actualiza tu plan para agregar más.` 
      }, 403)
    }
    
    if (employeeRole === 'tecnico' && technicianCount >= limits.technicians) {
      return c.json({ 
        success: false, 
        error: `Tu plan ${planId} permite máximo ${limits.technicians} técnico${limits.technicians > 1 ? 's' : ''}. Actualiza tu plan para agregar más.` 
      }, 403)
    }
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })
    
    if (authError || !authData.user) {
      console.log('Error creating employee auth:', authError)
      return c.json({ success: false, error: authError?.message || 'Failed to create user' }, 400)
    }
    
    // Create employee profile
    const employeeProfile = {
      userId: authData.user.id,
      email,
      name,
      companyId: userProfile.companyId,
      role: employeeRole,
      active: true,
      createdAt: new Date().toISOString()
    }
    
    await kv.set(`user:${authData.user.id}`, JSON.stringify(employeeProfile))
    
    return c.json({ success: true, user: employeeProfile })
  } catch (error) {
    console.log('Error creating employee:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Toggle user status (admin only)
app.put('/make-server-4d437e50/company/users/:userId/status', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403)
    }
    
    const targetUserId = c.req.param('userId')
    const { active } = await c.req.json()
    
    // Get target user profile
    const targetUserStr = await kv.get(`user:${targetUserId}`)
    if (!targetUserStr) {
      return c.json({ success: false, error: 'User not found' }, 404)
    }
    
    const targetUser = JSON.parse(targetUserStr)
    
    // Verify user belongs to same company
    if (targetUser.companyId !== userProfile.companyId) {
      return c.json({ success: false, error: 'Cannot modify users from other companies' }, 403)
    }
    
    // Cannot disable admin users
    if (targetUser.role === 'admin') {
      return c.json({ success: false, error: 'Cannot disable admin users' }, 403)
    }
    
    // Update user status in Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      targetUserId,
      { ban_duration: active ? 'none' : '876000h' } // 100 years if inactive
    )
    
    if (updateError) {
      console.log('Error updating user status:', updateError)
      return c.json({ success: false, error: updateError.message }, 400)
    }
    
    // Update user profile
    targetUser.active = active
    await kv.set(`user:${targetUserId}`, JSON.stringify(targetUser))
    
    return c.json({ success: true, user: targetUser })
  } catch (error) {
    console.log('Error toggling user status:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Update user branches assignment (admin only)
app.put('/make-server-4d437e50/company/users/:userId/branches', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403)
    }
    
    const targetUserId = c.req.param('userId')
    const { branchIds } = await c.req.json()
    
    if (!Array.isArray(branchIds)) {
      return c.json({ success: false, error: 'branchIds must be an array' }, 400)
    }
    
    // Get target user profile
    const targetUserStr = await kv.get(`user:${targetUserId}`)
    if (!targetUserStr) {
      return c.json({ success: false, error: 'User not found' }, 404)
    }
    
    const targetUser = JSON.parse(targetUserStr)
    
    // Verify user belongs to same company
    if (targetUser.companyId !== userProfile.companyId) {
      return c.json({ success: false, error: 'Cannot modify users from other companies' }, 403)
    }
    
    // Admin users don't need branch assignment (they have access to all)
    if (targetUser.role === 'admin') {
      return c.json({ success: false, error: 'Admin users have access to all branches' }, 403)
    }
    
    // Verify all branches belong to the company
    for (const branchId of branchIds) {
      const branchStr = await kv.get(`branch:${branchId}`)
      if (!branchStr) {
        return c.json({ success: false, error: `Branch ${branchId} not found` }, 404)
      }
      const branch = JSON.parse(branchStr)
      if (branch.companyId !== userProfile.companyId) {
        return c.json({ success: false, error: 'Cannot assign branches from other companies' }, 403)
      }
    }
    
    // Update user branches
    targetUser.assignedBranches = branchIds
    targetUser.updatedAt = new Date().toISOString()
    await kv.set(`user:${targetUserId}`, JSON.stringify(targetUser))
    
    return c.json({ success: true, user: targetUser })
  } catch (error) {
    console.log('Error updating user branches:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Change user password (admin only)
app.put('/make-server-4d437e50/company/users/:userId/password', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403)
    }
    
    const targetUserId = c.req.param('userId')
    const { password } = await c.req.json()
    
    if (!password || password.length < 6) {
      return c.json({ success: false, error: 'Password must be at least 6 characters' }, 400)
    }
    
    // Get target user profile
    const targetUserStr = await kv.get(`user:${targetUserId}`)
    if (!targetUserStr) {
      return c.json({ success: false, error: 'User not found' }, 404)
    }
    
    const targetUser = JSON.parse(targetUserStr)
    
    // Verify user belongs to same company
    if (targetUser.companyId !== userProfile.companyId) {
      return c.json({ success: false, error: 'Cannot modify users from other companies' }, 403)
    }
    
    // Update password in Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      targetUserId,
      { password }
    )
    
    if (updateError) {
      console.log('Error updating user password:', updateError)
      return c.json({ success: false, error: updateError.message }, 400)
    }
    
    return c.json({ success: true, message: 'Password updated successfully' })
  } catch (error) {
    console.log('Error changing user password:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Delete user permanently (admin only)
app.delete('/make-server-4d437e50/company/users/:userId', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403)
    }
    
    const targetUserId = c.req.param('userId')
    
    // Cannot delete yourself
    if (targetUserId === user.id) {
      return c.json({ success: false, error: 'No puedes eliminar tu propia cuenta' }, 403)
    }
    
    // Get target user profile
    const targetUserStr = await kv.get(`user:${targetUserId}`)
    if (!targetUserStr) {
      return c.json({ success: false, error: 'Usuario no encontrado' }, 404)
    }
    
    const targetUser = JSON.parse(targetUserStr)
    
    // Verify user belongs to same company
    if (targetUser.companyId !== userProfile.companyId) {
      return c.json({ success: false, error: 'No puedes eliminar usuarios de otras empresas' }, 403)
    }
    
    // Cannot delete admin users if they are the last admin
    if (targetUser.role === 'admin') {
      // Count active admins
      const allUsersKeys = await kv.getByPrefix('user:')
      const allUsers = allUsersKeys.map((u: string) => JSON.parse(u))
      const companyAdmins = allUsers.filter((u: any) => 
        u.companyId === userProfile.companyId && 
        u.role === 'admin' && 
        (u.active ?? true)
      )
      
      if (companyAdmins.length <= 1) {
        return c.json({ 
          success: false, 
          error: 'No puedes eliminar al único administrador activo. Primero crea otro administrador.' 
        }, 403)
      }
    }
    
    try {
      // Delete user from Supabase Auth
      const { error: deleteError } = await supabase.auth.admin.deleteUser(targetUserId)
      
      if (deleteError) {
        console.log('Error deleting user from Supabase Auth:', deleteError)
        // Continue with profile deletion even if auth deletion fails
      }
    } catch (authError) {
      console.log('Auth deletion error (non-critical):', authError)
      // Continue with profile deletion
    }
    
    // Delete user profile from KV store
    await kv.del(`user:${targetUserId}`)
    
    return c.json({ 
      success: true, 
      message: 'Usuario eliminado exitosamente',
      deletedUserId: targetUserId 
    })
  } catch (error) {
    console.log('Error deleting user:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Get company info
app.get('/make-server-4d437e50/company/info', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const companyDataStr = await kv.get(`company:${userProfile.companyId}`)
    if (!companyDataStr) {
      return c.json({ success: false, error: 'Company not found' }, 404)
    }
    
    const company = JSON.parse(companyDataStr)
    
    // Migration: Initialize licenseExpiry if it doesn't exist
    if (!company.licenseExpiry) {
      console.log('Initializing licenseExpiry for company:', company.id)
      const expiryDate = new Date()
      
      // If in trial, use trial end date
      if (company.trialEndsAt) {
        expiryDate.setTime(new Date(company.trialEndsAt).getTime())
      } else {
        // Otherwise, give 30 days from now
        expiryDate.setDate(expiryDate.getDate() + 30)
      }
      
      company.licenseExpiry = expiryDate.toISOString()
      await kv.set(`company:${userProfile.companyId}`, JSON.stringify(company))
      console.log('License expiry initialized:', company.licenseExpiry)
    }
    
    return c.json({ success: true, company })
  } catch (error) {
    console.log('Error fetching company info:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Update company settings
app.put('/make-server-4d437e50/company/settings', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403)
    }
    
    const body = await c.req.json()
    const companyDataStr = await kv.get(`company:${userProfile.companyId}`)
    if (!companyDataStr) {
      return c.json({ success: false, error: 'Company not found' }, 404)
    }
    
    const company = JSON.parse(companyDataStr)
    const updatedCompany = {
      ...company,
      ...body,
      updatedAt: new Date().toISOString()
    }
    
    await kv.set(`company:${userProfile.companyId}`, JSON.stringify(updatedCompany))
    return c.json({ success: true, company: updatedCompany })
  } catch (error) {
    console.log('Error updating company settings:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ==================== BRANCHES ====================

// Plan limits for branches
const PLAN_LIMITS = {
  basico: { branches: 1, admins: 1, advisors: 1, technicians: 2 },
  pyme: { branches: 2, admins: 2, advisors: 4, technicians: 8 },
  enterprise: { branches: 4, admins: 4, advisors: 8, technicians: 16 }
}

// Get all branches for company
app.get('/make-server-4d437e50/branches', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const branchIds = await kv.get(`company:${userProfile.companyId}:branches`)
    if (!branchIds) {
      return c.json({ success: true, branches: [] })
    }
    
    const branchIdArray = JSON.parse(branchIds)
    const branches = await Promise.all(
      branchIdArray.map(async (id: string) => {
        const branchStr = await kv.get(`branch:${id}`)
        return branchStr ? JSON.parse(branchStr) : null
      })
    )
    
    return c.json({ success: true, branches: branches.filter(b => b !== null) })
  } catch (error) {
    console.log('Error fetching branches:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Create new branch
app.post('/make-server-4d437e50/branches', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403)
    }
    
    // Check plan limits
    const license = await checkLicense(userProfile.companyId)
    const planId = license.planId || 'basico'
    const maxBranches = PLAN_LIMITS[planId as keyof typeof PLAN_LIMITS]?.branches || 1
    
    const branchIdsStr = await kv.get(`company:${userProfile.companyId}:branches`)
    const currentBranches = branchIdsStr ? JSON.parse(branchIdsStr) : []
    
    if (currentBranches.length >= maxBranches) {
      return c.json({ 
        success: false, 
        error: `Plan ${planId} permite máximo ${maxBranches} sucursal${maxBranches > 1 ? 'es' : ''}` 
      }, 403)
    }
    
    const { name, address, phone } = await c.req.json()
    
    const branchCounter = currentBranches.length + 1
    const branchId = `branch_${userProfile.companyId}_${branchCounter}`
    
    const branch = {
      id: branchId,
      companyId: userProfile.companyId,
      name,
      address: address || '',
      phone: phone || '',
      isMain: false,
      isActive: true,
      createdAt: new Date().toISOString()
    }
    
    await kv.set(`branch:${branchId}`, JSON.stringify(branch))
    
    const updatedBranches = [...currentBranches, branchId]
    await kv.set(`company:${userProfile.companyId}:branches`, JSON.stringify(updatedBranches))
    
    return c.json({ success: true, branch })
  } catch (error) {
    console.log('Error creating branch:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Update branch
app.put('/make-server-4d437e50/branches/:id', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403)
    }
    
    const branchId = c.req.param('id')
    const branchStr = await kv.get(`branch:${branchId}`)
    
    if (!branchStr) {
      return c.json({ success: false, error: 'Branch not found' }, 404)
    }
    
    const branch = JSON.parse(branchStr)
    
    if (branch.companyId !== userProfile.companyId) {
      return c.json({ success: false, error: 'Cannot modify branches from other companies' }, 403)
    }
    
    const { name, address, phone } = await c.req.json()
    
    const updatedBranch = {
      ...branch,
      name: name || branch.name,
      address: address !== undefined ? address : branch.address,
      phone: phone !== undefined ? phone : branch.phone,
      updatedAt: new Date().toISOString()
    }
    
    await kv.set(`branch:${branchId}`, JSON.stringify(updatedBranch))
    
    return c.json({ success: true, branch: updatedBranch })
  } catch (error) {
    console.log('Error updating branch:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Toggle branch active status
app.put('/make-server-4d437e50/branches/:id/toggle-active', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403)
    }
    
    const branchId = c.req.param('id')
    const branchStr = await kv.get(`branch:${branchId}`)
    
    if (!branchStr) {
      return c.json({ success: false, error: 'Branch not found' }, 404)
    }
    
    const branch = JSON.parse(branchStr)
    
    if (branch.companyId !== userProfile.companyId) {
      return c.json({ success: false, error: 'Cannot modify branches from other companies' }, 403)
    }
    
    const { isActive } = await c.req.json()
    
    const updatedBranch = {
      ...branch,
      isActive: isActive,
      updatedAt: new Date().toISOString()
    }
    
    await kv.set(`branch:${branchId}`, JSON.stringify(updatedBranch))
    
    return c.json({ success: true, branch: updatedBranch })
  } catch (error) {
    console.log('Error toggling branch active status:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Delete branch
app.delete('/make-server-4d437e50/branches/:id', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403)
    }
    
    const branchId = c.req.param('id')
    const branchStr = await kv.get(`branch:${branchId}`)
    
    if (!branchStr) {
      return c.json({ success: false, error: 'Branch not found' }, 404)
    }
    
    const branch = JSON.parse(branchStr)
    
    if (branch.companyId !== userProfile.companyId) {
      return c.json({ success: false, error: 'Cannot delete branches from other companies' }, 403)
    }
    
    if (branch.isMain) {
      return c.json({ success: false, error: 'Cannot delete main branch' }, 403)
    }
    
    // Remove from company branches list
    const branchIdsStr = await kv.get(`company:${userProfile.companyId}:branches`)
    if (branchIdsStr) {
      const branchIds = JSON.parse(branchIdsStr)
      const updatedBranches = branchIds.filter((id: string) => id !== branchId)
      await kv.set(`company:${userProfile.companyId}:branches`, JSON.stringify(updatedBranches))
    }
    
    // Delete branch
    await kv.del(`branch:${branchId}`)
    
    return c.json({ success: true, message: 'Branch deleted successfully' })
  } catch (error) {
    console.log('Error deleting branch:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ==================== PRODUCTS ====================

app.get('/make-server-4d437e50/products', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    // Get all items with 'product:' prefix and filter to only actual products
    const allProductItems = await kv.getByPrefix('product:')
    const products = filterOnlyProducts(allProductItems)
      .filter((p: any) => p.companyId === userProfile.companyId)
    
    // Load units and variants for each product
    const productsWithUnitsAndVariants = await Promise.all(
      products.map(async (product: any) => {
        const units = await kv.getByPrefix(`product:${product.id}:unit:`)
        const variants = await kv.getByPrefix(`product:${product.id}:variant:`)
        return {
          ...product,
          units: units.map((u: string) => JSON.parse(u)),
          variants: variants.map((v: string) => JSON.parse(v))
        }
      })
    )
    
    return c.json(productsWithUnitsAndVariants)
  } catch (error) {
    console.log('Error fetching products:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.post('/make-server-4d437e50/products', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const body = await c.req.json()
    
    // Validate required fields
    if (!body.name || body.name.trim() === '') {
      return c.json({ success: false, error: 'El nombre del producto es requerido' }, 400)
    }
    
    if (!body.price || isNaN(parseFloat(body.price)) || parseFloat(body.price) <= 0) {
      return c.json({ success: false, error: 'El precio debe ser un número válido mayor a 0' }, 400)
    }
    
    if (!body.branchId) {
      return c.json({ success: false, error: 'Debes seleccionar una sucursal' }, 400)
    }
    
    // Validate branchId if provided
    if (body.branchId) {
      const branchStr = await kv.get(`branch:${body.branchId}`)
      if (!branchStr) {
        return c.json({ success: false, error: 'Sucursal no encontrada' }, 404)
      }
      const branch = JSON.parse(branchStr)
      if (branch.companyId !== userProfile.companyId) {
        return c.json({ success: false, error: 'Acceso denegado a esta sucursal' }, 403)
      }
    }
    
    const id = await getNextId('product')
    const product = {
      id,
      name: body.name.trim(),
      category: body.category || 'otros',
      price: parseFloat(body.price),
      cost: body.cost ? parseFloat(body.cost) : 0,
      storage: body.storage || undefined,
      ram: body.ram || undefined,
      color: body.color || undefined,
      description: body.description || '',
      trackByUnit: body.trackByUnit || false,
      hasVariants: body.hasVariants || false,
      quantity: body.quantity ? parseInt(body.quantity) : 0,
      companyId: userProfile.companyId,
      branchId: body.branchId,
      createdAt: new Date().toISOString()
    }
    
    console.log('Creating product:', product)
    await kv.set(`product:${id}`, JSON.stringify(product))
    
    // Log transaction
    await logProductTransaction({
      productId: id,
      productName: product.name,
      action: 'create',
      description: `Producto creado: ${product.name}`,
      userId: user.id,
      userName: userProfile.name,
      userRole: userProfile.role,
      branchId: product.branchId || '',
      companyId: userProfile.companyId,
      quantity: product.trackByUnit ? 0 : (product.hasVariants ? 0 : product.quantity),
      details: `Categoría: ${product.category}, Precio: $${product.price}`
    })
    
    return c.json({ success: true, product })
  } catch (error) {
    console.log('Error creating product:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.put('/make-server-4d437e50/products/:id', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const id = c.req.param('id')
    const body = await c.req.json()
    const existing = await kv.get(`product:${id}`)
    if (!existing) {
      return c.json({ success: false, error: 'Product not found' }, 404)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const product = {
      ...JSON.parse(existing),
      ...body,
      updatedAt: new Date().toISOString()
    }
    await kv.set(`product:${id}`, JSON.stringify(product))
    
    // Log transaction
    await logProductTransaction({
      productId: product.id,
      productName: product.name,
      action: 'edit',
      description: `Producto editado: ${product.name}`,
      userId: user.id,
      userName: userProfile.name,
      userRole: userProfile.role,
      branchId: product.branchId || '',
      companyId: userProfile.companyId,
      details: `Actualización de información del producto`
    })
    
    return c.json({ success: true, product })
  } catch (error) {
    console.log('Error updating product:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.delete('/make-server-4d437e50/products/:id', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const id = c.req.param('id')
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    // Get product before deleting
    const productData = await kv.get(`product:${id}`)
    if (productData) {
      const product = JSON.parse(productData)
      
      // Log transaction
      await logProductTransaction({
        productId: product.id,
        productName: product.name,
        action: 'delete',
        description: `Producto eliminado: ${product.name}`,
        userId: user.id,
        userName: userProfile.name,
        userRole: userProfile.role,
        branchId: product.branchId || '',
        companyId: userProfile.companyId,
        details: `Eliminación completa del producto`
      })
    }
    
    // Delete all units for this product
    const units = await kv.getByPrefix(`product:${id}:unit:`)
    const unitIds = units.map((u: string) => {
      const unit = JSON.parse(u)
      return `product:${id}:unit:${unit.id}`
    })
    if (unitIds.length > 0) {
      await kv.mdel(unitIds)
    }
    
    // Delete all variants for this product
    const variants = await kv.getByPrefix(`product:${id}:variant:`)
    const variantIds = variants.map((v: string) => {
      const variant = JSON.parse(v)
      return `product:${id}:variant:${variant.id}`
    })
    if (variantIds.length > 0) {
      await kv.mdel(variantIds)
    }
    
    // Delete the product
    await kv.del(`product:${id}`)
    return c.json({ success: true })
  } catch (error) {
    console.log('Error deleting product:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ==================== PRODUCT UNITS ====================

// Add single unit to product
app.post('/make-server-4d437e50/products/:productId/units', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const productId = c.req.param('productId')
    const body = await c.req.json()
    
    // Validate that at least one field is present and not empty
    const imei = body.imei?.trim()
    const serialNumber = body.serialNumber?.trim()
    
    if (!imei && !serialNumber) {
      return c.json({ 
        success: false, 
        error: 'Debes proporcionar al menos un IMEI o Número de Serie' 
      }, 400)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    // Verify product exists
    const productData = await kv.get(`product:${productId}`)
    if (!productData) {
      return c.json({ success: false, error: 'Product not found' }, 404)
    }
    
    const product = JSON.parse(productData)
    
    // Check for duplicate IMEI
    if (imei) {
      const existingUnits = await kv.getByPrefix(`product:${productId}:unit:`)
      const duplicate = existingUnits.find((u: string) => {
        const unit = JSON.parse(u)
        return unit.imei?.trim().toLowerCase() === imei.toLowerCase()
      })
      
      if (duplicate) {
        return c.json({ 
          success: false, 
          error: `Ya existe una unidad con el IMEI ${imei}` 
        }, 400)
      }
    }
    
    // Check for duplicate Serial Number
    if (serialNumber) {
      const existingUnits = await kv.getByPrefix(`product:${productId}:unit:`)
      const duplicate = existingUnits.find((u: string) => {
        const unit = JSON.parse(u)
        return unit.serialNumber?.trim().toLowerCase() === serialNumber.toLowerCase()
      })
      
      if (duplicate) {
        return c.json({ 
          success: false, 
          error: `Ya existe una unidad con el Serial ${serialNumber}` 
        }, 400)
      }
    }
    
    const unitId = await getNextId(`product:${productId}:unit`)
    const unit = {
      id: unitId,
      productId: parseInt(productId),
      imei: imei || undefined,
      serialNumber: serialNumber || undefined,
      status: 'available',
      createdAt: new Date().toISOString()
    }
    
    await kv.set(`product:${productId}:unit:${unitId}`, JSON.stringify(unit))
    
    // Log transaction
    await logProductTransaction({
      productId: product.id,
      productName: product.name,
      action: 'add_unit',
      description: `Unidad agregada a ${product.name}`,
      userId: user.id,
      userName: userProfile.name,
      userRole: userProfile.role,
      branchId: product.branchId || '',
      companyId: userProfile.companyId,
      quantity: 1,
      details: `IMEI: ${imei || 'N/A'}, Serial: ${serialNumber || 'N/A'}`
    })
    
    return c.json({ success: true, unit })
  } catch (error) {
    console.log('Error adding unit:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Add multiple units to product (bulk)
app.post('/make-server-4d437e50/products/:productId/units/bulk', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const productId = c.req.param('productId')
    const { units } = await c.req.json()
    
    // Filter out units without IMEI or Serial Number
    const validUnits = units.filter((u: any) => {
      const imei = u.imei?.trim()
      const serialNumber = u.serialNumber?.trim()
      return imei || serialNumber
    })
    
    if (validUnits.length === 0) {
      return c.json({ 
        success: false, 
        error: 'No se encontraron unidades válidas. Cada unidad debe tener al menos IMEI o Serial Number.' 
      }, 400)
    }
    
    // Verify product exists
    const productData = await kv.get(`product:${productId}`)
    if (!productData) {
      return c.json({ success: false, error: 'Product not found' }, 404)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const product = JSON.parse(productData)
    
    // Check for duplicates within the batch and existing units
    const existingUnits = await kv.getByPrefix(`product:${productId}:unit:`)
    const seenImeis = new Set()
    const seenSerials = new Set()
    const errors: string[] = []
    
    for (const unitData of validUnits) {
      const imei = unitData.imei?.trim()
      const serialNumber = unitData.serialNumber?.trim()
      
      if (imei) {
        const imeiLower = imei.toLowerCase()
        
        // Check for duplicates in the batch
        if (seenImeis.has(imeiLower)) {
          errors.push(`IMEI duplicado en el lote: ${imei}`)
        }
        seenImeis.add(imeiLower)
        
        // Check for duplicates in existing units
        const duplicate = existingUnits.find((u: string) => {
          const unit = JSON.parse(u)
          return unit.imei?.trim().toLowerCase() === imeiLower
        })
        
        if (duplicate) {
          errors.push(`IMEI ya existe: ${imei}`)
        }
      }
      
      if (serialNumber) {
        const serialLower = serialNumber.toLowerCase()
        
        // Check for duplicates in the batch
        if (seenSerials.has(serialLower)) {
          errors.push(`Serial duplicado en el lote: ${serialNumber}`)
        }
        seenSerials.add(serialLower)
        
        // Check for duplicates in existing units
        const duplicate = existingUnits.find((u: string) => {
          const unit = JSON.parse(u)
          return unit.serialNumber?.trim().toLowerCase() === serialLower
        })
        
        if (duplicate) {
          errors.push(`Serial ya existe: ${serialNumber}`)
        }
      }
    }
    
    if (errors.length > 0) {
      return c.json({ 
        success: false, 
        error: `Errores encontrados:\n${errors.join('\n')}` 
      }, 400)
    }
    
    const createdUnits = []
    for (const unitData of validUnits) {
      const unitId = await getNextId(`product:${productId}:unit`)
      const unit = {
        id: unitId,
        productId: parseInt(productId),
        imei: unitData.imei?.trim() || undefined,
        serialNumber: unitData.serialNumber?.trim() || undefined,
        status: 'available',
        createdAt: new Date().toISOString()
      }
      
      await kv.set(`product:${productId}:unit:${unitId}`, JSON.stringify(unit))
      createdUnits.push(unit)
    }
    
    // Log transaction
    await logProductTransaction({
      productId: product.id,
      productName: product.name,
      action: 'add_units_bulk',
      description: `${createdUnits.length} unidades agregadas a ${product.name}`,
      userId: user.id,
      userName: userProfile.name,
      userRole: userProfile.role,
      branchId: product.branchId || '',
      companyId: userProfile.companyId,
      quantity: createdUnits.length,
      details: `Importación masiva de unidades`
    })
    
    return c.json({ success: true, units: createdUnits })
  } catch (error) {
    console.log('Error bulk adding units:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Delete a unit
app.delete('/make-server-4d437e50/products/:productId/units/:unitId', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const productId = c.req.param('productId')
    const unitId = c.req.param('unitId')
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    // Get unit before deleting
    const unitData = await kv.get(`product:${productId}:unit:${unitId}`)
    if (unitData) {
      const unit = JSON.parse(unitData)
      
      // Get product for logging
      const productData = await kv.get(`product:${productId}`)
      if (productData) {
        const product = JSON.parse(productData)
        
        // Log transaction
        await logProductTransaction({
          productId: product.id,
          productName: product.name,
          action: 'delete_unit',
          description: `Unidad eliminada de ${product.name}`,
          userId: user.id,
          userName: userProfile.name,
          userRole: userProfile.role,
          branchId: product.branchId || '',
          companyId: userProfile.companyId,
          quantity: -1,
          details: `IMEI: ${unit.imei || 'N/A'}, Serial: ${unit.serialNumber || 'N/A'}`
        })
      }
    }
    
    await kv.del(`product:${productId}:unit:${unitId}`)
    return c.json({ success: true })
  } catch (error) {
    console.log('Error deleting unit:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Update unit status (for sales/repairs)
app.put('/make-server-4d437e50/products/:productId/units/:unitId', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const productId = c.req.param('productId')
    const unitId = c.req.param('unitId')
    const body = await c.req.json()
    
    const existing = await kv.get(`product:${productId}:unit:${unitId}`)
    if (!existing) {
      return c.json({ success: false, error: 'Unit not found' }, 404)
    }
    
    const unit = {
      ...JSON.parse(existing),
      ...body,
      updatedAt: new Date().toISOString()
    }
    
    await kv.set(`product:${productId}:unit:${unitId}`, JSON.stringify(unit))
    return c.json({ success: true, unit })
  } catch (error) {
    console.log('Error updating unit:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Inventory Adjustment for quantity-based products
app.post('/make-server-4d437e50/products/:id/adjust-inventory', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    // Only admins can adjust inventory
    if (userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Only administrators can adjust inventory' }, 403)
    }
    
    const productId = c.req.param('id')
    const body = await c.req.json()
    const { type, quantity, reason } = body
    
    const productData = await kv.get(`product:${productId}`)
    if (!productData) {
      return c.json({ success: false, error: 'Product not found' }, 404)
    }
    
    const product = JSON.parse(productData)
    
    if (product.companyId !== userProfile.companyId) {
      return c.json({ success: false, error: 'Unauthorized' }, 403)
    }
    
    if (product.trackByUnit) {
      return c.json({ success: false, error: 'This product tracks inventory by individual units. Use unit management instead.' }, 400)
    }
    
    const currentQuantity = product.quantity || 0
    const adjustmentAmount = parseInt(quantity)
    
    let newQuantity: number
    if (type === 'add') {
      newQuantity = currentQuantity + adjustmentAmount
    } else if (type === 'subtract') {
      newQuantity = currentQuantity - adjustmentAmount
      if (newQuantity < 0) {
        return c.json({ success: false, error: 'Cannot subtract more than available stock' }, 400)
      }
    } else {
      return c.json({ success: false, error: 'Invalid adjustment type' }, 400)
    }
    
    product.quantity = newQuantity
    product.updatedAt = new Date().toISOString()
    
    await kv.set(`product:${productId}`, JSON.stringify(product))
    
    // Log the adjustment
    const adjustmentLogId = await getNextId('inventoryAdjustment')
    const adjustmentLog = {
      id: adjustmentLogId,
      productId: parseInt(productId),
      productName: product.name,
      type,
      quantity: adjustmentAmount,
      previousQuantity: currentQuantity,
      newQuantity,
      reason,
      userId: user.id,
      userName: userProfile.name,
      companyId: userProfile.companyId,
      createdAt: new Date().toISOString()
    }
    await kv.set(`inventoryAdjustment:${adjustmentLogId}`, JSON.stringify(adjustmentLog))
    
    // Log transaction
    await logProductTransaction({
      productId: product.id,
      productName: product.name,
      action: 'adjust_inventory',
      description: `Ajuste de inventario: ${type === 'add' ? '+' : '-'}${adjustmentAmount} unidades`,
      userId: user.id,
      userName: userProfile.name,
      userRole: userProfile.role,
      branchId: product.branchId || '',
      companyId: userProfile.companyId,
      quantity: type === 'add' ? adjustmentAmount : -adjustmentAmount,
      details: `Razón: ${reason} | Stock anterior: ${currentQuantity}, Stock nuevo: ${newQuantity}`
    })
    
    return c.json({ success: true, product, adjustment: adjustmentLog })
  } catch (error) {
    console.log('Error adjusting inventory:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Add Stock - For advisors to add inventory (purchases)
app.post('/make-server-4d437e50/products/:id/add-stock', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const productId = c.req.param('id')
    const body = await c.req.json()
    const { quantity, reason } = body
    
    const productData = await kv.get(`product:${productId}`)
    if (!productData) {
      return c.json({ success: false, error: 'Product not found' }, 404)
    }
    
    const product = JSON.parse(productData)
    
    if (product.companyId !== userProfile.companyId) {
      return c.json({ success: false, error: 'Unauthorized' }, 403)
    }
    
    if (product.trackByUnit) {
      return c.json({ success: false, error: 'This product tracks inventory by individual units. Use unit management instead.' }, 400)
    }
    
    if (product.hasVariants) {
      return c.json({ success: false, error: 'This product has variants. Manage stock through the variants.' }, 400)
    }
    
    const addQuantity = parseInt(quantity)
    
    if (!addQuantity || isNaN(addQuantity) || addQuantity <= 0) {
      return c.json({ success: false, error: 'Quantity must be greater than 0' }, 400)
    }
    
    if (!reason || !reason.trim()) {
      return c.json({ success: false, error: 'Reason is required' }, 400)
    }
    
    const currentQuantity = product.quantity || 0
    const newQuantity = currentQuantity + addQuantity
    
    product.quantity = newQuantity
    product.updatedAt = new Date().toISOString()
    
    await kv.set(`product:${productId}`, JSON.stringify(product))
    
    // Log transaction
    await logProductTransaction({
      productId: product.id,
      productName: product.name,
      action: 'adjust_inventory',
      description: `Stock agregado: +${addQuantity} unidades`,
      userId: user.id,
      userName: userProfile.name,
      userRole: userProfile.role,
      branchId: product.branchId || '',
      companyId: userProfile.companyId,
      quantity: addQuantity,
      details: `Razón: ${reason} | Stock anterior: ${currentQuantity}, Stock nuevo: ${newQuantity}`
    })
    
    return c.json({ success: true, product })
  } catch (error) {
    console.log('Error adding stock:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Branch Transfer - Move product between branches (Admin only)
app.post('/make-server-4d437e50/products/:id/transfer', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    // Only admins can transfer products between branches
    if (userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Only administrators can transfer products between branches' }, 403)
    }
    
    const productId = c.req.param('id')
    const body = await c.req.json()
    let { targetBranchId, quantity, reason } = body
    
    // Validate required fields
    if (!targetBranchId) {
      console.log('Transfer error: targetBranchId is required')
      return c.json({ success: false, error: 'Sucursal destino es requerida' }, 400)
    }
    
    if (!quantity) {
      console.log('Transfer error: quantity is required')
      return c.json({ success: false, error: 'Cantidad es requerida' }, 400)
    }
    
    if (!reason || !reason.trim()) {
      console.log('Transfer error: reason is required')
      return c.json({ success: false, error: 'Razón del traslado es requerida' }, 400)
    }
    
    // Ensure targetBranchId is a string
    targetBranchId = String(targetBranchId)
    
    console.log('Transfer request:', { productId, targetBranchId, quantity, reason, bodyRaw: body })
    
    const productData = await kv.get(`product:${productId}`)
    if (!productData) {
      console.log('Product not found:', productId)
      return c.json({ success: false, error: 'Producto no encontrado' }, 404)
    }
    
    const product = JSON.parse(productData)
    console.log('Product to transfer:', { id: product.id, name: product.name, branchId: product.branchId, quantity: product.quantity, hasVariants: product.hasVariants, trackByUnit: product.trackByUnit })
    
    // Ensure branchId is string
    if (product.branchId !== undefined && product.branchId !== null) {
      product.branchId = String(product.branchId)
    }
    
    // Validate product is from a different branch
    if (String(product.branchId) === String(targetBranchId)) {
      console.log('Transfer error: Source and target branch are the same')
      return c.json({ success: false, error: 'No puedes trasladar a la misma sucursal de origen' }, 400)
    }
    
    // Security check
    if (product.companyId !== userProfile.companyId) {
      console.log('Transfer error: Product does not belong to user company')
      return c.json({ success: false, error: 'No autorizado' }, 403)
    }
    
    // Validate product type
    if (product.trackByUnit) {
      console.log('Transfer error: Product tracked by unit')
      return c.json({ success: false, error: 'No se pueden trasladar productos rastreados por unidad. Debes trasladar las unidades específicas.' }, 400)
    }
    
    // Validate quantity
    const transferQuantity = parseInt(quantity)
    console.log('Transfer quantity:', transferQuantity)
    
    if (!transferQuantity || isNaN(transferQuantity)) {
      console.log('Transfer error: Invalid quantity')
      return c.json({ success: false, error: 'Cantidad inválida' }, 400)
    }
    
    if (transferQuantity <= 0) {
      console.log('Transfer error: Quantity must be greater than 0')
      return c.json({ success: false, error: 'La cantidad a trasladar debe ser mayor a 0' }, 400)
    }
    
    // For products without variants
    if (!product.hasVariants) {
      const currentQuantity = product.quantity || 0
      console.log('Product stock check:', { currentQuantity, transferQuantity })
      if (transferQuantity > currentQuantity) {
        console.log('Transfer error: Insufficient stock')
        return c.json({ success: false, error: `No puedes trasladar ${transferQuantity} unidades. Solo hay ${currentQuantity} disponibles.` }, 400)
      }
    }
    
    // Validate target branch exists and belongs to same company
    console.log('Checking target branch:', targetBranchId)
    const branchData = await kv.get(`branch:${targetBranchId}`)
    if (!branchData) {
      console.log('Transfer error: Target branch not found')
      return c.json({ success: false, error: 'Sucursal destino no encontrada' }, 404)
    }
    
    const targetBranch = JSON.parse(branchData)
    console.log('Target branch:', { id: targetBranch.id, name: targetBranch.name, companyId: targetBranch.companyId, isActive: targetBranch.isActive })
    
    if (targetBranch.companyId !== userProfile.companyId) {
      console.log('Transfer error: Branch belongs to different company')
      return c.json({ success: false, error: 'La sucursal destino no pertenece a tu empresa' }, 403)
    }
    
    if (!targetBranch.isActive) {
      console.log('Transfer error: Target branch is not active')
      return c.json({ success: false, error: 'La sucursal destino no está activa' }, 400)
    }
    
    console.log('All validations passed, proceeding with transfer')
    
    // Check if product already exists in target branch
    console.log('Searching for existing product in target branch...')
    const allProductItems = await kv.getByPrefix('product:')
    const allProducts = filterOnlyProducts(allProductItems)
    console.log('Total products found:', allProducts.length)
    const existingInTarget = allProducts
      .find((p: any) => {
        const match = p.companyId === userProfile.companyId &&
          String(p.branchId) === String(targetBranchId) &&
          p.name === product.name &&
          p.category === product.category &&
          p.storage === product.storage &&
          p.ram === product.ram &&
          p.color === product.color &&
          !p.trackByUnit &&
          p.hasVariants === product.hasVariants
        
        if (match) {
          console.log('Found existing product in target branch:', p.id)
        }
        return match
      })
    
    console.log('Existing product in target:', existingInTarget ? existingInTarget.id : 'none')
    
    let targetProduct
    
    // CASE 1: Product WITHOUT variants
    if (!product.hasVariants) {
      const currentQuantity = product.quantity || 0
      console.log('Processing transfer for product WITHOUT variants')
      
      // Reduce quantity from source branch
      product.quantity = currentQuantity - transferQuantity
      product.updatedAt = new Date().toISOString()
      console.log('Updating source product:', { id: productId, newQuantity: product.quantity })
      await kv.set(`product:${productId}`, JSON.stringify(product))
      
      if (existingInTarget) {
        // Add to existing product in target branch
        console.log('Adding to existing product in target branch:', existingInTarget.id)
        existingInTarget.quantity = (existingInTarget.quantity || 0) + transferQuantity
        existingInTarget.updatedAt = new Date().toISOString()
        await kv.set(`product:${existingInTarget.id}`, JSON.stringify(existingInTarget))
        targetProduct = existingInTarget
        console.log('Target product updated:', { id: existingInTarget.id, quantity: existingInTarget.quantity })
      } else {
        // Create new product in target branch
        console.log('Creating new product in target branch')
        const newProductId = await getNextId('product')
        targetProduct = {
          ...product,
          id: newProductId,
          branchId: targetBranchId,
          quantity: transferQuantity,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        await kv.set(`product:${newProductId}`, JSON.stringify(targetProduct))
        console.log('New product created:', { id: newProductId, branchId: targetBranchId, quantity: transferQuantity })
      }
    } 
    // CASE 2: Product WITH variants
    else {
      // Update source product (no quantity change since variants handle stock)
      product.updatedAt = new Date().toISOString()
      await kv.set(`product:${productId}`, JSON.stringify(product))
      
      // Get variants from source product
      const allVariants = await kv.getByPrefix(`product:${productId}:variant:`)
      const sourceVariants = allVariants.map((v: string) => JSON.parse(v))
      
      // Check total stock in variants
      const totalStock = sourceVariants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0)
      if (transferQuantity > totalStock) {
        return c.json({ success: false, error: `No puedes trasladar ${transferQuantity} unidades. Stock total en variantes: ${totalStock}` }, 400)
      }
      
      if (existingInTarget) {
        // Product already exists in target, we'll update/create its variants
        targetProduct = existingInTarget
      } else {
        // Create new product in target branch
        const newProductId = await getNextId('product')
        targetProduct = {
          ...product,
          id: newProductId,
          branchId: targetBranchId,
          quantity: 0, // Variants handle stock
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        await kv.set(`product:${newProductId}`, JSON.stringify(targetProduct))
      }
      
      // Transfer stock from variants proportionally
      let remainingToTransfer = transferQuantity
      
      for (const sourceVariant of sourceVariants) {
        if (remainingToTransfer <= 0) break
        
        const variantStock = sourceVariant.stock || 0
        if (variantStock <= 0) continue
        
        // Transfer from this variant (up to its available stock)
        const transferFromThisVariant = Math.min(variantStock, remainingToTransfer)
        
        // Reduce stock from source variant
        sourceVariant.stock = variantStock - transferFromThisVariant
        sourceVariant.updatedAt = new Date().toISOString()
        await kv.set(`product:${productId}:variant:${sourceVariant.id}`, JSON.stringify(sourceVariant))
        
        // Find or create corresponding variant in target product
        const targetVariants = await kv.getByPrefix(`product:${targetProduct.id}:variant:`)
        const existingTargetVariant = targetVariants
          .map((v: string) => JSON.parse(v))
          .find((v: any) => v.name === sourceVariant.name)
        
        if (existingTargetVariant) {
          // Add stock to existing variant
          existingTargetVariant.stock = (existingTargetVariant.stock || 0) + transferFromThisVariant
          existingTargetVariant.updatedAt = new Date().toISOString()
          await kv.set(`product:${targetProduct.id}:variant:${existingTargetVariant.id}`, JSON.stringify(existingTargetVariant))
        } else {
          // Create new variant in target product
          const newVariantId = await getNextId(`product:${targetProduct.id}:variant`)
          const newVariant = {
            ...sourceVariant,
            id: newVariantId,
            stock: transferFromThisVariant,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          await kv.set(`product:${targetProduct.id}:variant:${newVariantId}`, JSON.stringify(newVariant))
        }
        
        remainingToTransfer -= transferFromThisVariant
      }
    }
    
    // Log the transfer
    console.log('Creating transfer log...')
    const transferLogId = await getNextId('branchTransfer')
    const transferLog = {
      id: transferLogId,
      productId: parseInt(productId),
      productName: product.name,
      sourceBranchId: product.branchId,
      targetBranchId: targetBranchId,
      quantity: transferQuantity,
      reason,
      userId: user.id,
      userName: userProfile.name,
      companyId: userProfile.companyId,
      createdAt: new Date().toISOString()
    }
    await kv.set(`branchTransfer:${transferLogId}`, JSON.stringify(transferLog))
    console.log('Transfer log created:', transferLogId)
    
    // Log transaction
    await logProductTransaction({
      productId: product.id,
      productName: product.name,
      action: 'transfer',
      description: `Traslado de ${transferQuantity} unidades entre sucursales`,
      userId: user.id,
      userName: userProfile.name,
      userRole: userProfile.role,
      branchId: product.branchId || '',
      companyId: userProfile.companyId,
      targetBranchId: targetBranchId,
      quantity: transferQuantity,
      details: `Razón: ${reason}`
    })
    
    console.log('Transfer completed successfully!')
    return c.json({ 
      success: true, 
      sourceProduct: product,
      targetProduct,
      transfer: transferLog 
    })
  } catch (error) {
    console.error('Error transferring product between branches:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return c.json({ 
      success: false, 
      error: `Error al realizar traslado: ${error instanceof Error ? error.message : String(error)}` 
    }, 500)
  }
})

// Transfer Units - Move individual units between branches (Admin only)
app.post('/make-server-4d437e50/products/:id/transfer-units', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    // Only admins can transfer units between branches
    if (userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Only administrators can transfer units between branches' }, 403)
    }
    
    const productId = c.req.param('id')
    const body = await c.req.json()
    let { targetBranchId, unitIds, reason } = body
    
    console.log('Units transfer request:', { productId, targetBranchId, unitIds, reason })
    
    // Validate required fields
    if (!targetBranchId) {
      return c.json({ success: false, error: 'Sucursal destino es requerida' }, 400)
    }
    
    if (!unitIds || !Array.isArray(unitIds) || unitIds.length === 0) {
      return c.json({ success: false, error: 'Debes seleccionar al menos una unidad' }, 400)
    }
    
    if (!reason || !reason.trim()) {
      return c.json({ success: false, error: 'Razón del traslado es requerida' }, 400)
    }
    
    // Ensure targetBranchId is a string
    targetBranchId = String(targetBranchId)
    
    // Get source product
    const productData = await kv.get(`product:${productId}`)
    if (!productData) {
      return c.json({ success: false, error: 'Producto no encontrado' }, 404)
    }
    
    const product = JSON.parse(productData)
    
    // Ensure branchId is string
    if (product.branchId !== undefined && product.branchId !== null) {
      product.branchId = String(product.branchId)
    }
    
    // Validate product is from a different branch
    if (String(product.branchId) === String(targetBranchId)) {
      return c.json({ success: false, error: 'No puedes trasladar a la misma sucursal de origen' }, 400)
    }
    
    // Security check
    if (product.companyId !== userProfile.companyId) {
      return c.json({ success: false, error: 'No autorizado' }, 403)
    }
    
    // Validate product is tracked by unit
    if (!product.trackByUnit) {
      return c.json({ success: false, error: 'Este producto no tiene seguimiento por unidades individuales' }, 400)
    }
    
    // Validate target branch exists and belongs to same company
    const branchData = await kv.get(`branch:${targetBranchId}`)
    if (!branchData) {
      return c.json({ success: false, error: 'Sucursal destino no encontrada' }, 404)
    }
    
    const targetBranch = JSON.parse(branchData)
    
    if (targetBranch.companyId !== userProfile.companyId) {
      return c.json({ success: false, error: 'La sucursal destino no pertenece a tu empresa' }, 403)
    }
    
    if (!targetBranch.isActive) {
      return c.json({ success: false, error: 'La sucursal destino no está activa' }, 400)
    }
    
    // Validate all units exist and are available
    const allUnits = await kv.getByPrefix(`product:${productId}:unit:`)
    const productUnits = allUnits.map((u: string) => JSON.parse(u))
    
    for (const unitId of unitIds) {
      const unit = productUnits.find((u: any) => u.id === unitId)
      if (!unit) {
        return c.json({ success: false, error: `Unidad ${unitId} no encontrada` }, 404)
      }
      if (unit.status !== 'available') {
        return c.json({ success: false, error: `La unidad ${unit.imei || unit.serialNumber || unitId} no está disponible para traslado` }, 400)
      }
    }
    
    // Check if product already exists in target branch
    const allProductItems = await kv.getByPrefix('product:')
    const allProducts = filterOnlyProducts(allProductItems)
    const existingInTarget = allProducts
      .find((p: any) => 
        p.companyId === userProfile.companyId &&
        String(p.branchId) === String(targetBranchId) &&
        p.name === product.name &&
        p.category === product.category &&
        p.storage === product.storage &&
        p.ram === product.ram &&
        p.color === product.color &&
        p.trackByUnit === true
      )
    
    let targetProduct
    let targetProductId
    
    if (existingInTarget) {
      // Use existing product in target branch
      targetProduct = existingInTarget
      targetProductId = existingInTarget.id
      console.log('Using existing product in target branch:', targetProductId)
    } else {
      // Create new product in target branch
      targetProductId = await getNextId('product')
      targetProduct = {
        ...product,
        id: targetProductId,
        branchId: targetBranchId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      await kv.set(`product:${targetProductId}`, JSON.stringify(targetProduct))
      console.log('Created new product in target branch:', targetProductId)
    }
    
    // Transfer each unit
    const transferredUnits = []
    for (const unitId of unitIds) {
      const unitData = await kv.get(`product:${productId}:unit:${unitId}`)
      if (unitData) {
        const unit = JSON.parse(unitData)
        
        // Create new unit ID in target product
        const newUnitId = await getNextId(`product:${targetProductId}:unit`)
        const newUnit = {
          ...unit,
          id: newUnitId,
          productId: targetProductId,
          createdAt: new Date().toISOString()
        }
        
        // Save unit in target product
        await kv.set(`product:${targetProductId}:unit:${newUnitId}`, JSON.stringify(newUnit))
        
        // Delete unit from source product
        await kv.del(`product:${productId}:unit:${unitId}`)
        
        transferredUnits.push(newUnit)
        console.log(`Transferred unit ${unitId} to new unit ${newUnitId} in product ${targetProductId}`)
      }
    }
    
    // Update timestamps
    product.updatedAt = new Date().toISOString()
    await kv.set(`product:${productId}`, JSON.stringify(product))
    
    targetProduct.updatedAt = new Date().toISOString()
    await kv.set(`product:${targetProductId}`, JSON.stringify(targetProduct))
    
    // Create transfer log
    const transferLogId = await getNextId('transferLog')
    const transferLog = {
      id: transferLogId,
      productId: product.id,
      targetProductId: targetProductId,
      sourceBranchId: product.branchId,
      targetBranchId: targetBranchId,
      unitIds: unitIds,
      unitsCount: transferredUnits.length,
      reason: reason,
      userId: user.id,
      companyId: userProfile.companyId,
      createdAt: new Date().toISOString()
    }
    await kv.set(`transferLog:${transferLogId}`, JSON.stringify(transferLog))
    
    console.log('Units transfer completed successfully:', { 
      unitsTransferred: transferredUnits.length,
      sourceProductId: productId,
      targetProductId: targetProductId
    })
    
    return c.json({ 
      success: true, 
      sourceProduct: product,
      targetProduct: targetProduct,
      transferredUnits: transferredUnits,
      transferLog 
    })
  } catch (error) {
    console.log('Error transferring units:', error)
    return c.json({ 
      success: false, 
      error: `Error al trasladar unidades: ${error instanceof Error ? error.message : String(error)}` 
    }, 500)
  }
})

// ==================== PRODUCT VARIANTS ====================

// Get all variants for a product
app.get('/make-server-4d437e50/products/:productId/variants', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const productId = c.req.param('productId')
    const variants = await kv.getByPrefix(`product:${productId}:variant:`)
    
    return c.json({ 
      success: true, 
      variants: variants.map((v: string) => JSON.parse(v)) 
    })
  } catch (error) {
    console.log('Error fetching variants:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Add a variant to a product
app.post('/make-server-4d437e50/products/:productId/variants', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const productId = c.req.param('productId')
    const body = await c.req.json()
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    // Verify product exists
    const productData = await kv.get(`product:${productId}`)
    if (!productData) {
      return c.json({ success: false, error: 'Product not found' }, 404)
    }
    
    const product = JSON.parse(productData)
    
    const variantId = await getNextId(`product:${productId}:variant`)
    const variant = {
      id: variantId,
      productId: parseInt(productId),
      name: body.name, // e.g., "Rojo", "Negro", "Azul"
      sku: body.sku || `${productId}-${body.name}`,
      stock: body.stock || 0,
      createdAt: new Date().toISOString()
    }
    
    await kv.set(`product:${productId}:variant:${variantId}`, JSON.stringify(variant))
    
    // Log transaction
    await logProductTransaction({
      productId: product.id,
      productName: product.name,
      action: 'add_variant',
      description: `Variante agregada: ${variant.name}`,
      userId: user.id,
      userName: userProfile.name,
      userRole: userProfile.role,
      branchId: product.branchId || '',
      companyId: userProfile.companyId,
      quantity: variant.stock,
      details: `SKU: ${variant.sku}`
    })
    
    return c.json({ success: true, variant })
  } catch (error) {
    console.log('Error adding variant:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Update variant stock
app.put('/make-server-4d437e50/products/:productId/variants/:variantId', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const productId = c.req.param('productId')
    const variantId = c.req.param('variantId')
    const body = await c.req.json()
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const existing = await kv.get(`product:${productId}:variant:${variantId}`)
    if (!existing) {
      return c.json({ success: false, error: 'Variant not found' }, 404)
    }
    
    const oldVariant = JSON.parse(existing)
    const variant = {
      ...oldVariant,
      ...body,
      updatedAt: new Date().toISOString()
    }
    
    await kv.set(`product:${productId}:variant:${variantId}`, JSON.stringify(variant))
    
    // Get product for logging
    const productData = await kv.get(`product:${productId}`)
    if (productData) {
      const product = JSON.parse(productData)
      
      // Log transaction
      await logProductTransaction({
        productId: product.id,
        productName: product.name,
        action: 'update_variant',
        description: `Variante actualizada: ${variant.name}`,
        userId: user.id,
        userName: userProfile.name,
        userRole: userProfile.role,
        branchId: product.branchId || '',
        companyId: userProfile.companyId,
        quantity: variant.stock - (oldVariant.stock || 0),
        details: `Stock anterior: ${oldVariant.stock}, Stock nuevo: ${variant.stock}`
      })
    }
    
    return c.json({ success: true, variant })
  } catch (error) {
    console.log('Error updating variant:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Delete a variant
app.delete('/make-server-4d437e50/products/:productId/variants/:variantId', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const productId = c.req.param('productId')
    const variantId = c.req.param('variantId')
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    // Get variant before deleting
    const variantData = await kv.get(`product:${productId}:variant:${variantId}`)
    if (variantData) {
      const variant = JSON.parse(variantData)
      
      // Get product for logging
      const productData = await kv.get(`product:${productId}`)
      if (productData) {
        const product = JSON.parse(productData)
        
        // Log transaction
        await logProductTransaction({
          productId: product.id,
          productName: product.name,
          action: 'delete_variant',
          description: `Variante eliminada: ${variant.name}`,
          userId: user.id,
          userName: userProfile.name,
          userRole: userProfile.role,
          branchId: product.branchId || '',
          companyId: userProfile.companyId,
          details: `SKU: ${variant.sku}`
        })
      }
    }
    
    await kv.del(`product:${productId}:variant:${variantId}`)
    return c.json({ success: true })
  } catch (error) {
    console.log('Error deleting variant:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Get all product transactions (admin only)
app.get('/make-server-4d437e50/products/transactions', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    // Only admins can view transaction history
    if (userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Only administrators can view transaction history' }, 403)
    }
    
    // Get all transactions for this company
    const allTransactions = await kv.getByPrefix('product_transaction:')
    
    const transactions = allTransactions
      .map((t: string) => JSON.parse(t))
      .filter((t: any) => t.companyId == userProfile.companyId) // Filter by company (loose equality for type conversion)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    return c.json({ success: true, transactions })
  } catch (error) {
    console.log('Error fetching transactions:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ==================== REPAIRS ====================

app.get('/make-server-4d437e50/repairs', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const allRepairs = await kv.getByPrefix('repair:')
    const repairs = allRepairs
      .map((r: string) => JSON.parse(r))
      .filter((r: any) => r.companyId === userProfile.companyId)
    
    return c.json({ success: true, repairs: repairs.map(r => JSON.stringify(r)) })
  } catch (error) {
    console.log('Error fetching repairs:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.post('/make-server-4d437e50/repairs', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const body = await c.req.json()
    // Each company has its own repair counter (consecutivo por empresa)
    const consecutivo = await getNextId(`repair:company:${userProfile.companyId}`)
    
    // Initialize status logs with creation entry
    const initialLog = {
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: userProfile.name,
      previousStatus: null,
      newStatus: 'received',
      notes: 'Orden de reparación creada',
      images: body.images || []
    }
    
    const repair = {
      id: consecutivo,
      ...body,
      companyId: userProfile.companyId,
      status: 'received',
      statusLogs: [initialLog],
      images: body.images || [],
      createdAt: new Date().toISOString()
    }
    // Use companyId in the key to avoid conflicts between companies
    await kv.set(`repair:${userProfile.companyId}:${consecutivo}`, JSON.stringify(repair))
    return c.json({ success: true, repair })
  } catch (error) {
    console.log('Error creating repair:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Update repair status - dedicated endpoint (MUST BE BEFORE generic PUT /repairs/:id)
app.put('/make-server-4d437e50/repairs/:id/status', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const id = c.req.param('id')
    const { newStatus, notes, images, userName } = await c.req.json()
    
    // Try new format first, then fallback to old format
    let existing = await kv.get(`repair:${userProfile.companyId}:${id}`)
    if (!existing) {
      existing = await kv.get(`repair:${id}`)
    }
    
    if (!existing) {
      return c.json({ success: false, error: 'Repair not found' }, 404)
    }
    
    const repair = JSON.parse(existing)
    
    // Security check: ensure repair belongs to user's company
    if (repair.companyId !== userProfile.companyId) {
      return c.json({ success: false, error: 'Unauthorized' }, 403)
    }
    
    // Create log entry
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: userName || userProfile.name,
      previousStatus: repair.status,
      newStatus: newStatus,
      notes: notes || '',
      images: images || []
    }
    
    const logs = repair.statusLogs || []
    logs.push(logEntry)
    
    repair.statusLogs = logs
    repair.status = newStatus
    repair.updatedAt = new Date().toISOString()
    
    // If status is changed to 'delivered' or 'cancelled', update unit status to 'available'
    if ((newStatus === 'delivered' || newStatus === 'cancelled') && repair.productId && repair.unitId) {
      try {
        const unitData = await kv.get(`product:${repair.productId}:unit:${repair.unitId}`)
        if (unitData) {
          const unit = JSON.parse(unitData)
          unit.status = 'available'
          unit.updatedAt = new Date().toISOString()
          await kv.set(`product:${repair.productId}:unit:${repair.unitId}`, JSON.stringify(unit))
        }
      } catch (unitError) {
        console.log('Error updating unit status:', unitError)
      }
    }
    
    // Use new key format with companyId
    await kv.set(`repair:${repair.companyId}:${id}`, JSON.stringify(repair))
    // Clean up old key if it exists
    await kv.del(`repair:${id}`)
    
    return c.json({ success: true, repair })
  } catch (error) {
    console.log('Error updating repair status:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Create invoice from repair (MUST BE BEFORE generic PUT /repairs/:id)
app.post('/make-server-4d437e50/repairs/:id/invoice', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const id = c.req.param('id')
    const { items, notes, totalAmount, userName } = await c.req.json()
    
    // Try new format first, then fallback to old format
    let existing = await kv.get(`repair:${userProfile.companyId}:${id}`)
    if (!existing) {
      existing = await kv.get(`repair:${id}`)
    }
    
    if (!existing) {
      return c.json({ success: false, error: 'Repair not found' }, 404)
    }
    
    const repair = JSON.parse(existing)
    
    // Security check
    if (repair.companyId !== userProfile.companyId) {
      return c.json({ success: false, error: 'Unauthorized' }, 403)
    }
    
    // Create sale/invoice
    const saleId = await getNextId('sale')
    
    // Get company invoice config
    const companyData = await kv.get(`company:${userProfile.companyId}`)
    const company = companyData ? JSON.parse(companyData) : {}
    
    // Get and increment invoice consecutive
    const invoicePrefix = company.invoicePrefix || 'FACT'
    const invoiceStart = company.invoiceStart || 1
    const invoiceCounterKey = `company:${userProfile.companyId}:invoiceCounter`
    const currentCounter = await kv.get(invoiceCounterKey)
    const nextInvoiceNumber = currentCounter ? parseInt(currentCounter) + 1 : invoiceStart
    await kv.set(invoiceCounterKey, nextInvoiceNumber.toString())
    
    const invoiceNumber = `${invoicePrefix}-${String(nextInvoiceNumber).padStart(4, '0')}`
    
    const sale = {
      id: saleId,
      invoiceNumber,
      companyId: userProfile.companyId,
      customerId: repair.customerId,
      customerName: repair.customerName,
      items: items,
      total: totalAmount,
      paymentMethod: 'efectivo',
      notes: notes || `Reparación de ${repair.deviceType} ${repair.deviceBrand} ${repair.deviceModel} - ${repair.problem}`,
      date: new Date().toISOString(),
      createdBy: userName || userProfile.name,
      createdAt: new Date().toISOString(),
      repairId: parseInt(id),
      type: 'repair'
    }
    
    await kv.set(`sale:${saleId}`, JSON.stringify(sale))
    
    // Update repair to mark as invoiced and delivered
    repair.invoiced = true
    repair.invoiceId = saleId
    repair.status = 'delivered'
    repair.updatedAt = new Date().toISOString()
    
    // Add status log for delivery
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: userName || userProfile.name,
      previousStatus: repair.status === 'delivered' ? 'completed' : repair.status,
      newStatus: 'delivered',
      notes: `Facturado - ${invoiceNumber}`,
      images: []
    }
    
    const logs = repair.statusLogs || []
    logs.push(logEntry)
    repair.statusLogs = logs
    
    // If repair has unit, mark as available
    if (repair.productId && repair.unitId) {
      try {
        const unitData = await kv.get(`product:${repair.productId}:unit:${repair.unitId}`)
        if (unitData) {
          const unit = JSON.parse(unitData)
          unit.status = 'available'
          unit.updatedAt = new Date().toISOString()
          await kv.set(`product:${repair.productId}:unit:${repair.unitId}`, JSON.stringify(unit))
        }
      } catch (unitError) {
        console.log('Error updating unit status:', unitError)
      }
    }
    
    // Use new key format with companyId
    await kv.set(`repair:${repair.companyId}:${id}`, JSON.stringify(repair))
    // Clean up old key if it exists
    await kv.del(`repair:${id}`)
    
    return c.json({ success: true, sale, repair })
  } catch (error) {
    console.log('Error creating invoice from repair:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.put('/make-server-4d437e50/repairs/:id', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const id = c.req.param('id')
    const body = await c.req.json()
    
    // Try new format first, then fallback to old format
    let existing = await kv.get(`repair:${userProfile.companyId}:${id}`)
    if (!existing) {
      existing = await kv.get(`repair:${id}`)
    }
    
    if (!existing) {
      return c.json({ success: false, error: 'Repair not found' }, 404)
    }
    
    const existingRepair = JSON.parse(existing)
    
    // Security check
    if (existingRepair.companyId !== userProfile.companyId) {
      return c.json({ success: false, error: 'Unauthorized' }, 403)
    }
    
    // If status is being changed, create a log entry
    if (body.status && body.status !== existingRepair.status) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        userId: user.id,
        userName: userProfile.name,
        previousStatus: existingRepair.status,
        newStatus: body.status,
        notes: body.statusNotes || '',
        images: body.statusImages || []
      }
      
      const logs = existingRepair.statusLogs || []
      logs.push(logEntry)
      
      existingRepair.statusLogs = logs
      
      // If status is changed to 'delivered' or 'cancelled', update unit status to 'available'
      if ((body.status === 'delivered' || body.status === 'cancelled') && existingRepair.productId && existingRepair.unitId) {
        try {
          const unitData = await kv.get(`product:${existingRepair.productId}:unit:${existingRepair.unitId}`)
          if (unitData) {
            const unit = JSON.parse(unitData)
            unit.status = 'available'
            unit.updatedAt = new Date().toISOString()
            await kv.set(`product:${existingRepair.productId}:unit:${existingRepair.unitId}`, JSON.stringify(unit))
          }
        } catch (unitError) {
          console.log('Error updating unit status:', unitError)
          // Don't fail the repair update if unit update fails
        }
      }
    }
    
    // Update images if provided
    if (body.images !== undefined) {
      existingRepair.images = body.images
    }
    
    const repair = {
      ...existingRepair,
      ...body,
      updatedAt: new Date().toISOString()
    }
    
    // Clean up temporary status fields
    delete repair.statusNotes
    delete repair.statusImages
    
    // Use new key format with companyId
    await kv.set(`repair:${repair.companyId}:${id}`, JSON.stringify(repair))
    // Clean up old key if it exists
    await kv.del(`repair:${id}`)
    
    return c.json({ success: true, repair })
  } catch (error) {
    console.log('Error updating repair:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.delete('/make-server-4d437e50/repairs/:id', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    // Solo el administrador puede eliminar órdenes de servicio
    if (userProfile.role !== 'admin' && userProfile.role !== 'administrador') {
      return c.json({ success: false, error: 'Solo los administradores pueden eliminar órdenes de servicio' }, 403)
    }
    
    const id = c.req.param('id')
    
    // Verify repair exists and belongs to user's company
    let existing = await kv.get(`repair:${userProfile.companyId}:${id}`)
    if (!existing) {
      existing = await kv.get(`repair:${id}`)
    }
    
    if (existing) {
      const repair = JSON.parse(existing)
      if (repair.companyId !== userProfile.companyId) {
        return c.json({ success: false, error: 'Unauthorized' }, 403)
      }
    }
    
    // Delete both old and new format keys
    await kv.del(`repair:${userProfile.companyId}:${id}`)
    await kv.del(`repair:${id}`)
    
    return c.json({ success: true })
  } catch (error) {
    console.log('Error deleting repair:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ==================== CUSTOMERS ====================

app.get('/make-server-4d437e50/customers', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const allCustomers = await kv.getByPrefix('customer:')
    const customers = allCustomers
      .map((c: string) => JSON.parse(c))
      .filter((c: any) => c.companyId === userProfile.companyId)
    
    return c.json({ success: true, customers: customers.map(c => JSON.stringify(c)) })
  } catch (error) {
    console.log('Error fetching customers:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.post('/make-server-4d437e50/customers', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const body = await c.req.json()
    
    // Validation: Check for duplicate document number or phone
    const allCustomers = await kv.getByPrefix('customer:')
    const existingCustomers = allCustomers
      .map((c: string) => JSON.parse(c))
      .filter((c: any) => c.companyId === userProfile.companyId)
    
    // Check for duplicate document number (if provided)
    const docNumber = body.identificationNumber || body.documentNumber
    if (docNumber && docNumber.trim()) {
      const duplicateDocument = existingCustomers.find(
        (c: any) => {
          const existingDoc = c.identificationNumber || c.documentNumber
          return existingDoc && existingDoc.toLowerCase().trim() === docNumber.toLowerCase().trim()
        }
      )
      if (duplicateDocument) {
        return c.json({ 
          success: false, 
          error: `Ya existe un cliente con el documento ${docNumber}. Cliente: ${duplicateDocument.name}`,
          field: 'identificationNumber'
        }, 400)
      }
    }
    
    // Check for duplicate phone number (if provided)
    if (body.phone && body.phone.trim()) {
      const duplicatePhone = existingCustomers.find(
        (c: any) => c.phone && c.phone.trim() === body.phone.trim()
      )
      if (duplicatePhone) {
        return c.json({ 
          success: false, 
          error: `Ya existe un cliente con el teléfono ${body.phone}. Cliente: ${duplicatePhone.name}`,
          field: 'phone'
        }, 400)
      }
    }
    
    const id = await getNextId('customer')
    const customer = {
      id,
      ...body,
      companyId: userProfile.companyId,
      createdAt: new Date().toISOString()
    }
    await kv.set(`customer:${id}`, JSON.stringify(customer))
    return c.json({ success: true, customer })
  } catch (error) {
    console.log('Error creating customer:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.put('/make-server-4d437e50/customers/:id', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const id = c.req.param('id')
    const body = await c.req.json()
    const existing = await kv.get(`customer:${id}`)
    if (!existing) {
      return c.json({ success: false, error: 'Customer not found' }, 404)
    }
    
    // Validation: Check for duplicate document number or phone (excluding current customer)
    const allCustomers = await kv.getByPrefix('customer:')
    const existingCustomers = allCustomers
      .map((c: string) => JSON.parse(c))
      .filter((c: any) => c.companyId === userProfile.companyId && c.id !== parseInt(id))
    
    // Check for duplicate document number (if provided)
    const docNumber = body.identificationNumber || body.documentNumber
    if (docNumber && docNumber.trim()) {
      const duplicateDocument = existingCustomers.find(
        (c: any) => {
          const existingDoc = c.identificationNumber || c.documentNumber
          return existingDoc && existingDoc.toLowerCase().trim() === docNumber.toLowerCase().trim()
        }
      )
      if (duplicateDocument) {
        return c.json({ 
          success: false, 
          error: `Ya existe un cliente con el documento ${docNumber}. Cliente: ${duplicateDocument.name}`,
          field: 'identificationNumber'
        }, 400)
      }
    }
    
    // Check for duplicate phone number (if provided)
    if (body.phone && body.phone.trim()) {
      const duplicatePhone = existingCustomers.find(
        (c: any) => c.phone && c.phone.trim() === body.phone.trim()
      )
      if (duplicatePhone) {
        return c.json({ 
          success: false, 
          error: `Ya existe un cliente con el teléfono ${body.phone}. Cliente: ${duplicatePhone.name}`,
          field: 'phone'
        }, 400)
      }
    }
    
    const customer = {
      ...JSON.parse(existing),
      ...body,
      updatedAt: new Date().toISOString()
    }
    await kv.set(`customer:${id}`, JSON.stringify(customer))
    return c.json({ success: true, customer })
  } catch (error) {
    console.log('Error updating customer:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ==================== SALES ====================

app.get('/make-server-4d437e50/sales', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const allSales = await kv.getByPrefix('sale:')
    const sales = allSales
      .map((s: string) => JSON.parse(s))
      .filter((s: any) => s.companyId === userProfile.companyId)
    
    return c.json({ success: true, sales: sales.map(s => JSON.stringify(s)) })
  } catch (error) {
    console.log('Error fetching sales:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.post('/make-server-4d437e50/sales', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const body = await c.req.json()
    const id = await getNextId('sale')
    
    // Generate invoice number based on company configuration
    const invoiceConfigData = await kv.get(`company:${userProfile.companyId}:invoiceConfig`)
    let invoiceNumber: string
    
    if (invoiceConfigData) {
      const invoiceConfig = JSON.parse(invoiceConfigData)
      const prefix = invoiceConfig.prefix || 'FACT'
      const startNumber = invoiceConfig.startNumber || 1
      
      // Get current invoice counter for this company
      const counterKey = `company:${userProfile.companyId}:invoiceCounter`
      const currentCounterData = await kv.get(counterKey)
      const currentCounter = currentCounterData ? parseInt(currentCounterData) : startNumber
      
      // Generate invoice number with padding (4 digits)
      invoiceNumber = `${prefix}-${String(currentCounter).padStart(4, '0')}`
      
      // Increment counter for next invoice
      await kv.set(counterKey, (currentCounter + 1).toString())
    } else {
      // Fallback to default format if no config exists
      invoiceNumber = `FACT-${String(id).padStart(4, '0')}`
    }
    
    const sale = {
      id,
      ...body,
      invoiceNumber,
      companyId: userProfile.companyId,
      createdAt: new Date().toISOString()
    }
    await kv.set(`sale:${id}`, JSON.stringify(sale))
    
    // Update product inventory
    for (const item of body.items) {
      const productData = await kv.get(`product:${item.productId}`)
      if (productData) {
        const product = JSON.parse(productData)
        
        if (item.unitIds && item.unitIds.length > 0) {
          // Product tracks by units - mark specific units as sold
          for (const unitId of item.unitIds) {
            const unitData = await kv.get(`product:${item.productId}:unit:${unitId}`)
            if (unitData) {
              const unit = JSON.parse(unitData)
              unit.status = 'sold'
              unit.soldAt = new Date().toISOString()
              unit.saleId = id
              await kv.set(`product:${item.productId}:unit:${unitId}`, JSON.stringify(unit))
            }
          }
        } else {
          // Product tracks by quantity - reduce stock
          const currentQuantity = product.quantity || 0
          const newQuantity = currentQuantity - item.quantity
          if (newQuantity >= 0) {
            product.quantity = newQuantity
            product.updatedAt = new Date().toISOString()
            await kv.set(`product:${item.productId}`, JSON.stringify(product))
          }
        }
      }
    }
    
    return c.json({ success: true, sale })
  } catch (error) {
    console.log('Error creating sale:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.put('/make-server-4d437e50/sales/:id/cancel', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    // Only admins can cancel sales
    if (userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Only administrators can cancel sales' }, 403)
    }
    
    const id = parseInt(c.req.param('id'))
    const body = await c.req.json()
    
    const saleData = await kv.get(`sale:${id}`)
    if (!saleData) {
      return c.json({ success: false, error: 'Sale not found' }, 404)
    }
    
    const sale = JSON.parse(saleData)
    
    if (sale.companyId !== userProfile.companyId) {
      return c.json({ success: false, error: 'Unauthorized' }, 403)
    }
    
    if (sale.status === 'cancelled') {
      return c.json({ success: false, error: 'Sale is already cancelled' }, 400)
    }
    
    // Update sale status
    sale.status = 'cancelled'
    sale.cancelReason = body.cancelReason
    sale.cancelledBy = body.cancelledBy
    sale.cancelledAt = new Date().toISOString()
    
    await kv.set(`sale:${id}`, JSON.stringify(sale))
    
    // If it's a product sale, return inventory
    if (sale.type === 'product' && sale.items) {
      for (const item of sale.items) {
        const productData = await kv.get(`product:${item.productId}`)
        if (productData) {
          const product = JSON.parse(productData)
          
          if (item.unitIds && item.unitIds.length > 0) {
            // Product tracks by units - restore unit status to available
            for (const unitId of item.unitIds) {
              const unitData = await kv.get(`product:${item.productId}:unit:${unitId}`)
              if (unitData) {
                const unit = JSON.parse(unitData)
                unit.status = 'available'
                delete unit.soldAt
                delete unit.saleId
                await kv.set(`product:${item.productId}:unit:${unitId}`, JSON.stringify(unit))
              }
            }
          } else {
            // Product tracks by quantity - restore stock
            const currentQuantity = product.quantity || 0
            product.quantity = currentQuantity + item.quantity
            product.updatedAt = new Date().toISOString()
            await kv.set(`product:${item.productId}`, JSON.stringify(product))
          }
        }
      }
    }
    
    return c.json({ success: true, sale })
  } catch (error) {
    console.log('Error cancelling sale:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ==================== STATS & REPORTS ====================

app.get('/make-server-4d437e50/stats', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const allProductItems = await kv.getByPrefix('product:')
    const allRepairs = await kv.getByPrefix('repair:')
    const allSales = await kv.getByPrefix('sale:')
    const allCustomers = await kv.getByPrefix('customer:')
    
    const products = filterOnlyProducts(allProductItems).filter((p: any) => p.companyId === userProfile.companyId)
    const repairs = allRepairs.map((r: string) => JSON.parse(r)).filter((r: any) => r.companyId === userProfile.companyId)
    const sales = allSales.map((s: string) => JSON.parse(s)).filter((s: any) => s.companyId === userProfile.companyId)
    const customers = allCustomers.map((c: string) => JSON.parse(c)).filter((c: any) => c.companyId === userProfile.companyId)
    
    const activeRepairs = repairs.filter((r: any) => 
      r.status !== 'delivered' && r.status !== 'cancelled'
    ).length
    
    const totalRevenue = sales.reduce((sum: number, sale: any) => 
      sum + (sale.total || 0), 0
    )
    
    // Get global low stock threshold from company settings
    const settingsData = await kv.get(`company:${userProfile.companyId}:settings`)
    const settings = settingsData ? JSON.parse(settingsData) : {}
    const globalThreshold = settings.lowStockThreshold || 5
    
    // Calculate low stock based on available units, variants, or quantity
    let lowStock = 0
    for (const product of products) {
      // Skip if alert is hidden
      if (product.hideStockAlert) continue
      
      const threshold = product.minStock || globalThreshold
      let availableStock = 0
      
      if (product.trackByUnit) {
        // Count available units (IMEI/Serial tracking)
        const units = await kv.getByPrefix(`product:${product.id}:unit:`)
        availableStock = units.map((u: string) => JSON.parse(u)).filter((u: any) => u.status === 'available').length
      } else if (product.hasVariants) {
        // Sum stock from all variants
        const variants = await kv.getByPrefix(`product:${product.id}:variant:`)
        availableStock = variants.map((v: string) => JSON.parse(v)).reduce((sum: number, v: any) => sum + (v.stock || 0), 0)
      } else {
        // Simple quantity tracking
        availableStock = product.quantity || 0
      }
      
      if (availableStock < threshold) {
        lowStock++
      }
    }
    
    const stats = {
      totalProducts: products.length,
      totalRepairs: repairs.length,
      activeRepairs,
      totalSales: sales.length,
      totalRevenue,
      totalCustomers: customers.length,
      lowStock
    }
    
    return c.json({ success: true, stats })
  } catch (error) {
    console.log('Error fetching stats:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Get revenue stats by period
app.get('/make-server-4d437e50/stats/revenue', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const period = c.req.query('period') || 'month' // day, week, month
    const allSales = await kv.getByPrefix('sale:')
    const sales = allSales.map((s: string) => JSON.parse(s)).filter((s: any) => s.companyId === userProfile.companyId)
    
    const now = new Date()
    let startDate = new Date()
    
    if (period === 'day') {
      startDate.setHours(0, 0, 0, 0)
    } else if (period === 'week') {
      startDate.setDate(now.getDate() - 7)
    } else if (period === 'month') {
      startDate.setDate(now.getDate() - 30)
    }
    
    const filteredSales = sales.filter((s: any) => {
      const saleDate = new Date(s.createdAt || s.date)
      return saleDate >= startDate
    })
    
    const totalRevenue = filteredSales.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0)
    const totalSales = filteredSales.length
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0
    
    return c.json({ 
      success: true, 
      revenue: {
        totalRevenue,
        totalSales,
        averageTicket,
        period
      }
    })
  } catch (error) {
    console.log('Error fetching revenue stats:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Get recent activity
app.get('/make-server-4d437e50/stats/recent-activity', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const allRepairs = await kv.getByPrefix('repair:')
    const allSales = await kv.getByPrefix('sale:')
    
    const repairs = allRepairs.map((r: string) => JSON.parse(r)).filter((r: any) => r.companyId === userProfile.companyId)
    const sales = allSales.map((s: string) => JSON.parse(s)).filter((s: any) => s.companyId === userProfile.companyId)
    
    // Combine and format activities
    const activities = []
    
    // Add recent repairs (last 10)
    const recentRepairs = repairs
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
    
    for (const repair of recentRepairs) {
      activities.push({
        id: `repair-${repair.id}`,
        type: 'repair',
        title: repair.deviceType || 'Reparación',
        subtitle: `${repair.customerName} - ${repair.issue || 'Sin descripción'}`,
        timestamp: repair.createdAt,
        status: repair.status
      })
    }
    
    // Add recent sales (last 10)
    const recentSales = sales
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
    
    for (const sale of recentSales) {
      activities.push({
        id: `sale-${sale.id}`,
        type: 'sale',
        title: `Venta #${sale.invoiceNumber || sale.id}`,
        subtitle: `${sale.items?.length || 0} producto(s)`,
        timestamp: sale.createdAt,
        amount: sale.total
      })
    }
    
    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    // Return top 15 most recent activities
    return c.json({ success: true, activities: activities.slice(0, 15) })
  } catch (error) {
    console.log('Error fetching recent activity:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Get detailed reports
app.get('/make-server-4d437e50/reports', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const allSales = await kv.getByPrefix('sale:')
    const allRepairs = await kv.getByPrefix('repair:')
    const allProductItems = await kv.getByPrefix('product:')
    const allCustomers = await kv.getByPrefix('customer:')
    
    const sales = allSales.map((s: string) => JSON.parse(s)).filter((s: any) => s.companyId === userProfile.companyId && s.status !== 'cancelled')
    const repairs = allRepairs.map((r: string) => JSON.parse(r)).filter((r: any) => r.companyId === userProfile.companyId)
    const products = filterOnlyProducts(allProductItems).filter((p: any) => p.companyId === userProfile.companyId)
    const customers = allCustomers.map((c: string) => JSON.parse(c)).filter((c: any) => c.companyId === userProfile.companyId)
    
    // Sales by day (last 30 days for better trend analysis)
    const salesByDay: any = {}
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.toISOString().split('T')[0]
    }).reverse()
    
    last30Days.forEach(day => {
      salesByDay[day] = { count: 0, revenue: 0, profit: 0 }
    })
    
    sales.forEach((sale: any) => {
      const day = sale.createdAt.split('T')[0]
      if (salesByDay[day]) {
        salesByDay[day].count++
        salesByDay[day].revenue += sale.total || 0
        salesByDay[day].profit += (sale.total || 0) - (sale.totalCost || 0)
      }
    })
    
    // Repairs by status
    const repairsByStatus: any = {}
    repairs.forEach((repair: any) => {
      repairsByStatus[repair.status] = (repairsByStatus[repair.status] || 0) + 1
    })
    
    // Product sales analysis
    const productSales: any = {}
    const productLastSold: any = {}
    
    sales.forEach((sale: any) => {
      sale.items?.forEach((item: any) => {
        if (!productSales[item.productName]) {
          productSales[item.productName] = { 
            quantity: 0, 
            revenue: 0,
            profit: 0,
            count: 0 
          }
        }
        productSales[item.productName].quantity += item.quantity
        productSales[item.productName].revenue += item.price * item.quantity
        productSales[item.productName].count += 1
        
        // Track last sale date
        if (!productLastSold[item.productName] || new Date(sale.createdAt) > new Date(productLastSold[item.productName])) {
          productLastSold[item.productName] = sale.createdAt
        }
      })
    })
    
    // Top products (best sellers)
    const topProducts = Object.entries(productSales)
      .map(([name, data]: [string, any]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
    
    // Low rotation products (products not sold in last 30 days or with low sales)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const lowRotationProducts = products
      .filter((p: any) => {
        const lastSold = productLastSold[p.name]
        const hasStock = p.trackByUnit ? (p.units?.filter((u: any) => u.status === 'available').length || 0) > 0 : (p.quantity || 0) > 0
        const notSoldRecently = !lastSold || new Date(lastSold) < thirtyDaysAgo
        return hasStock && notSoldRecently
      })
      .map((p: any) => ({
        name: p.name,
        category: p.category,
        price: p.price,
        stock: p.trackByUnit ? (p.units?.filter((u: any) => u.status === 'available').length || 0) : (p.quantity || 0),
        lastSold: productLastSold[p.name] || null,
        daysWithoutSale: productLastSold[p.name] 
          ? Math.floor((new Date().getTime() - new Date(productLastSold[p.name]).getTime()) / (1000 * 60 * 60 * 24))
          : 999
      }))
      .sort((a, b) => b.daysWithoutSale - a.daysWithoutSale)
      .slice(0, 10)
    
    // Repairs ready for pickup (completed but not delivered)
    const readyRepairs = repairs
      .filter((r: any) => r.status === 'completed')
      .map((r: any) => {
        const completedDate = r.statusHistory?.find((h: any) => h.status === 'completed')?.timestamp || r.createdAt
        const daysWaiting = Math.floor((new Date().getTime() - new Date(completedDate).getTime()) / (1000 * 60 * 60 * 24))
        return {
          id: r.id,
          deviceType: r.deviceType,
          deviceBrand: r.deviceBrand,
          customerName: r.customerName,
          customerPhone: r.customerPhone,
          completedDate,
          daysWaiting,
          estimatedCost: r.estimatedCost
        }
      })
      .sort((a, b) => b.daysWaiting - a.daysWaiting)
      .slice(0, 15)
    
    // Repair time analysis
    const repairTimes: number[] = []
    repairs
      .filter((r: any) => r.status === 'delivered' && r.statusHistory)
      .forEach((r: any) => {
        const received = r.statusHistory.find((h: any) => h.status === 'received')?.timestamp
        const delivered = r.statusHistory.find((h: any) => h.status === 'delivered')?.timestamp
        if (received && delivered) {
          const days = (new Date(delivered).getTime() - new Date(received).getTime()) / (1000 * 60 * 60 * 24)
          repairTimes.push(days)
        }
      })
    
    const avgRepairTime = repairTimes.length > 0 
      ? repairTimes.reduce((a, b) => a + b, 0) / repairTimes.length 
      : 0
    
    // Most common repair types
    const repairTypes: any = {}
    repairs.forEach((r: any) => {
      const type = `${r.deviceType} - ${r.reportedIssue?.substring(0, 30) || 'Sin descripción'}`
      repairTypes[type] = (repairTypes[type] || 0) + 1
    })
    
    const commonRepairTypes = Object.entries(repairTypes)
      .map(([type, count]) => ({ type, count }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5)
    
    // Customer analysis
    const customerData: any = {}
    
    sales.forEach((sale: any) => {
      if (!customerData[sale.customerName]) {
        customerData[sale.customerName] = {
          name: sale.customerName,
          phone: sale.customerPhone,
          totalSpent: 0,
          purchaseCount: 0,
          lastPurchase: sale.createdAt
        }
      }
      customerData[sale.customerName].totalSpent += sale.total || 0
      customerData[sale.customerName].purchaseCount += 1
      if (new Date(sale.createdAt) > new Date(customerData[sale.customerName].lastPurchase)) {
        customerData[sale.customerName].lastPurchase = sale.createdAt
      }
    })
    
    repairs.forEach((repair: any) => {
      if (!customerData[repair.customerName]) {
        customerData[repair.customerName] = {
          name: repair.customerName,
          phone: repair.customerPhone,
          totalSpent: 0,
          purchaseCount: 0,
          repairCount: 0,
          lastVisit: repair.createdAt
        }
      }
      if (!customerData[repair.customerName].repairCount) {
        customerData[repair.customerName].repairCount = 0
      }
      customerData[repair.customerName].repairCount += 1
      const lastVisit = customerData[repair.customerName].lastPurchase || customerData[repair.customerName].lastVisit || repair.createdAt
      if (new Date(repair.createdAt) > new Date(lastVisit)) {
        customerData[repair.customerName].lastVisit = repair.createdAt
      }
    })
    
    // Top customers by spending
    const topCustomers = Object.values(customerData)
      .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
    
    // Inactive customers (no activity in last 60 days)
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
    
    const inactiveCustomers = Object.values(customerData)
      .filter((c: any) => {
        const lastActivity = c.lastPurchase || c.lastVisit
        return lastActivity && new Date(lastActivity) < sixtyDaysAgo
      })
      .map((c: any) => ({
        ...c,
        daysInactive: Math.floor((new Date().getTime() - new Date(c.lastPurchase || c.lastVisit).getTime()) / (1000 * 60 * 60 * 24))
      }))
      .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
    
    // Payment method distribution
    const paymentMethods: any = {}
    sales.forEach((sale: any) => {
      const method = sale.paymentMethod || 'Efectivo'
      paymentMethods[method] = (paymentMethods[method] || 0) + 1
    })
    
    // Monthly comparison
    const thisMonth = new Date()
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    
    const thisMonthSales = sales.filter((s: any) => {
      const saleDate = new Date(s.createdAt)
      return saleDate.getMonth() === thisMonth.getMonth() && saleDate.getFullYear() === thisMonth.getFullYear()
    })
    
    const lastMonthSales = sales.filter((s: any) => {
      const saleDate = new Date(s.createdAt)
      return saleDate.getMonth() === lastMonth.getMonth() && saleDate.getFullYear() === lastMonth.getFullYear()
    })
    
    const thisMonthRevenue = thisMonthSales.reduce((sum: number, s: any) => sum + (s.total || 0), 0)
    const lastMonthRevenue = lastMonthSales.reduce((sum: number, s: any) => sum + (s.total || 0), 0)
    const revenueGrowth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0
    
    return c.json({
      success: true,
      reports: {
        salesByDay,
        repairsByStatus,
        topProducts,
        lowRotationProducts,
        readyRepairs,
        avgRepairTime,
        commonRepairTypes,
        topCustomers,
        inactiveCustomers,
        paymentMethods,
        monthlyComparison: {
          thisMonth: {
            revenue: thisMonthRevenue,
            count: thisMonthSales.length
          },
          lastMonth: {
            revenue: lastMonthRevenue,
            count: lastMonthSales.length
          },
          growth: revenueGrowth
        }
      }
    })
  } catch (error) {
    console.log('Error fetching reports:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ==================== PRINT CONFIGURATION ====================

// Get company print configuration
app.get('/make-server-4d437e50/company/print-config', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const configData = await kv.get(`company:${userProfile.companyId}:printConfig`)
    const invoiceConfigData = await kv.get(`company:${userProfile.companyId}:invoiceConfig`)
    
    if (!configData) {
      // Return default config if none exists
      const companyData = await kv.get(`company:${userProfile.companyId}`)
      const company = companyData ? JSON.parse(companyData) : null
      
      return c.json({ 
        success: true, 
        printConfig: {
          format: '80mm',
          companyName: company?.name || 'Oryon App',
          companyAddress: '',
          companyPhone: '',
          companyEmail: '',
          taxId: '',
          taxIdType: 'NIT',
          companyLogo: '',
          website: '',
          socialMedia: '',
          warrantyNotes: '',
          welcomeMessage: '',
          farewellMessage: ''
        },
        invoiceConfig: invoiceConfigData ? JSON.parse(invoiceConfigData) : {
          prefix: 'FACT',
          startNumber: 1
        }
      })
    }
    
    return c.json({ 
      success: true, 
      printConfig: JSON.parse(configData),
      invoiceConfig: invoiceConfigData ? JSON.parse(invoiceConfigData) : {
        prefix: 'FACT',
        startNumber: 1
      }
    })
  } catch (error) {
    console.log('Error fetching print config:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Save company print configuration
app.put('/make-server-4d437e50/company/print-config', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const printConfig = await c.req.json()
    
    await kv.set(`company:${userProfile.companyId}:printConfig`, JSON.stringify({
      ...printConfig,
      updatedAt: new Date().toISOString()
    }))
    
    return c.json({ success: true, printConfig })
  } catch (error) {
    console.log('Error saving print config:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Save company invoice configuration
app.put('/make-server-4d437e50/company/invoice-config', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    // Only admin can change invoice config
    if (userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Only admin can modify invoice configuration' }, 403)
    }
    
    const invoiceConfig = await c.req.json()
    
    // Validate invoice config
    if (!invoiceConfig.prefix || invoiceConfig.prefix.length === 0) {
      return c.json({ success: false, error: 'Invoice prefix is required' }, 400)
    }
    
    if (typeof invoiceConfig.startNumber !== 'number' || invoiceConfig.startNumber < 0) {
      return c.json({ success: false, error: 'Start number must be a positive number' }, 400)
    }
    
    await kv.set(`company:${userProfile.companyId}:invoiceConfig`, JSON.stringify({
      ...invoiceConfig,
      updatedAt: new Date().toISOString()
    }))
    
    return c.json({ success: true, invoiceConfig })
  } catch (error) {
    console.log('Error saving invoice config:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Upload company logo
app.post('/make-server-4d437e50/company/logo', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    const { error: authError, user } = await verifyAuth(authHeader)
    
    if (authError || !user) {
      return c.json({ success: false, error: authError || 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    // Get form data
    const formData = await c.req.formData()
    const file = formData.get('logo') as File
    
    if (!file) {
      return c.json({ success: false, error: 'No file provided' }, 400)
    }
    
    // Create bucket if it doesn't exist
    const bucketName = 'make-4d437e50-logos'
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName)
    
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 2097152 // 2MB
      })
    }
    
    // Upload file
    const fileName = `${userProfile.companyId}-${Date.now()}.${file.name.split('.').pop()}`
    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, bytes, {
        contentType: file.type,
        upsert: true
      })
    
    if (uploadError) {
      console.log('Error uploading logo:', uploadError)
      return c.json({ success: false, error: 'Error uploading logo' }, 500)
    }
    
    // Get signed URL (valid for 10 years)
    const { data: urlData, error: urlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 315360000) // 10 years in seconds
    
    if (urlError || !urlData) {
      console.log('Error creating signed URL:', urlError)
      return c.json({ success: false, error: 'Error creating signed URL' }, 500)
    }
    
    return c.json({
      success: true,
      logoUrl: urlData.signedUrl
    })
  } catch (error) {
    console.log('Error in logo upload:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ==================== COMPANY SETTINGS ====================

// Get company settings (including low stock threshold)
app.get('/make-server-4d437e50/company/settings', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const settingsData = await kv.get(`company:${userProfile.companyId}:settings`)
    
    if (!settingsData) {
      // Return default settings if none exist
      return c.json({ 
        success: true, 
        settings: {
          lowStockThreshold: 5,
          updatedAt: new Date().toISOString()
        }
      })
    }
    
    return c.json({ 
      success: true, 
      settings: JSON.parse(settingsData)
    })
  } catch (error) {
    console.log('Error fetching company settings:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Update company settings
app.put('/make-server-4d437e50/company/settings', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    // Only admin can change company settings
    if (userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Only admin can modify company settings' }, 403)
    }
    
    const body = await c.req.json()
    
    // Validate low stock threshold
    if (body.lowStockThreshold !== undefined) {
      if (typeof body.lowStockThreshold !== 'number' || body.lowStockThreshold < 0) {
        return c.json({ success: false, error: 'Low stock threshold must be a positive number' }, 400)
      }
    }
    
    // Get existing settings
    const existingData = await kv.get(`company:${userProfile.companyId}:settings`)
    const existingSettings = existingData ? JSON.parse(existingData) : {}
    
    // Merge with new settings
    const updatedSettings = {
      ...existingSettings,
      ...body,
      updatedAt: new Date().toISOString()
    }
    
    await kv.set(`company:${userProfile.companyId}:settings`, JSON.stringify(updatedSettings))
    
    return c.json({ success: true, settings: updatedSettings })
  } catch (error) {
    console.log('Error saving company settings:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ==================== LICENSE MANAGEMENT ====================

// Upgrade plan (new feature-based licensing)
app.post('/make-server-4d437e50/license/upgrade-plan', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403)
    }
    
    const { planId, country, amount } = await c.req.json()
    
    // Validate plan
    const validPlans = ['basico', 'pyme', 'enterprise']
    if (!validPlans.includes(planId)) {
      return c.json({ success: false, error: 'Invalid plan' }, 400)
    }
    
    console.log('Upgrading plan for company:', userProfile.companyId, 'to:', planId)
    
    // Get company data
    const companyDataStr = await kv.get(`company:${userProfile.companyId}`)
    if (!companyDataStr) {
      return c.json({ success: false, error: 'Company not found' }, 404)
    }
    
    const company = JSON.parse(companyDataStr)
    
    // Update company plan
    company.planId = planId
    company.lastUpgrade = new Date().toISOString()
    
    // Set license expiry to 30 days from now
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + 30)
    company.licenseExpiry = expiryDate.toISOString()
    
    // Remove trial status if was in trial
    if (company.trialEndsAt) {
      delete company.trialEndsAt
    }
    
    await kv.set(`company:${userProfile.companyId}`, JSON.stringify(company))
    
    console.log('Plan upgraded successfully to:', planId)
    
    return c.json({
      success: true,
      planId,
      message: 'Plan actualizado exitosamente'
    })
  } catch (error) {
    console.error('Error upgrading plan:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Create PSE payment (Colombia)
app.post('/make-server-4d437e50/license/pse/create', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403)
    }
    
    const { planId, amount, duration } = await c.req.json()
    
    // Generate unique transaction ID
    const transactionId = `PSE-${userProfile.companyId}-${Date.now()}`
    
    console.log('Creating PSE transaction for company:', userProfile.companyId)
    
    // Store pending transaction
    const transaction = {
      id: transactionId,
      companyId: userProfile.companyId,
      planId,
      amount,
      duration,
      status: 'pending',
      paymentMethod: 'pse',
      createdAt: new Date().toISOString()
    }
    
    await kv.set(`transaction:${transactionId}`, JSON.stringify(transaction))
    console.log('Transaction stored:', transaction)
    
    // In production, integrate with actual PSE API
    // For now, return a demo payment URL
    const paymentUrl = `https://checkout.placetopay.com/session/${transactionId}`
    
    console.log('PSE Payment created:', transactionId)
    
    return c.json({
      success: true,
      paymentUrl,
      transactionId
    })
  } catch (error) {
    console.log('Error creating PSE payment:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Create Paddle payment (International)
app.post('/make-server-4d437e50/license/paddle/create', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403)
    }
    
    const { planId, amount, duration } = await c.req.json()
    
    // Generate unique transaction ID
    const transactionId = `PADDLE-${userProfile.companyId}-${Date.now()}`
    
    console.log('Creating Paddle transaction for company:', userProfile.companyId)
    
    // Store pending transaction
    const transaction = {
      id: transactionId,
      companyId: userProfile.companyId,
      planId,
      amount,
      duration,
      status: 'pending',
      paymentMethod: 'paddle',
      createdAt: new Date().toISOString()
    }
    
    await kv.set(`transaction:${transactionId}`, JSON.stringify(transaction))
    console.log('Transaction stored:', transaction)
    
    // In production, integrate with actual Paddle API
    // For now, return a demo checkout URL
    const checkoutUrl = `https://buy.paddle.com/checkout/${transactionId}`
    
    console.log('Paddle Payment created:', transactionId)
    
    return c.json({
      success: true,
      checkoutUrl,
      transactionId
    })
  } catch (error) {
    console.log('Error creating Paddle payment:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Webhook to confirm payment and activate license
app.post('/make-server-4d437e50/license/webhook', async (c) => {
  try {
    const { transactionId, status } = await c.req.json()
    
    console.log('Webhook received:', { transactionId, status })
    
    if (!transactionId) {
      console.log('Error: No transaction ID provided')
      return c.json({ success: false, error: 'Transaction ID required' }, 400)
    }
    
    // Get transaction
    const transactionStr = await kv.get(`transaction:${transactionId}`)
    console.log('Transaction found:', transactionStr ? 'Yes' : 'No')
    
    if (!transactionStr) {
      console.log('Error: Transaction not found in database')
      return c.json({ success: false, error: 'Transaction not found' }, 404)
    }
    
    const transaction = JSON.parse(transactionStr)
    console.log('Transaction data:', transaction)
    
    if (status === 'approved' || status === 'completed') {
      // Get company
      const companyStr = await kv.get(`company:${transaction.companyId}`)
      console.log('Company found:', companyStr ? 'Yes' : 'No')
      
      if (!companyStr) {
        console.log('Error: Company not found:', transaction.companyId)
        return c.json({ success: false, error: 'Company not found' }, 404)
      }
      
      const company = JSON.parse(companyStr)
      console.log('Company data before update:', company)
      
      // Calculate new expiry date
      const today = new Date()
      let startDate = today
      
      // Check if company has existing license expiry
      if (company.licenseExpiry) {
        const currentExpiry = new Date(company.licenseExpiry)
        // If current license is still valid, extend from current expiry
        // Otherwise, start from today
        startDate = currentExpiry > today ? currentExpiry : today
      }
      
      const newExpiry = new Date(startDate)
      newExpiry.setDate(newExpiry.getDate() + transaction.duration)
      
      // Update company license
      company.licenseExpiry = newExpiry.toISOString()
      console.log('Updating company with new expiry:', newExpiry.toISOString())
      
      await kv.set(`company:${transaction.companyId}`, JSON.stringify(company))
      console.log('Company updated successfully')
      
      // Update transaction status
      transaction.status = 'completed'
      transaction.completedAt = new Date().toISOString()
      await kv.set(`transaction:${transactionId}`, JSON.stringify(transaction))
      console.log('Transaction marked as completed')
      
      console.log(`License extended for company ${transaction.companyId} until ${newExpiry.toISOString()}`)
      
      return c.json({
        success: true,
        message: 'License activated successfully',
        newExpiry: newExpiry.toISOString()
      })
    }
    
    // Update transaction status for failed/cancelled payments
    transaction.status = status
    await kv.set(`transaction:${transactionId}`, JSON.stringify(transaction))
    
    return c.json({ success: true, message: 'Transaction updated' })
  } catch (error) {
    console.log('Error processing webhook:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Manual license activation (for testing/admin purposes)
app.post('/make-server-4d437e50/license/activate', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403)
    }
    
    const { duration } = await c.req.json()
    
    if (!duration || duration < 1) {
      return c.json({ success: false, error: 'Invalid duration' }, 400)
    }
    
    // Get company
    const companyStr = await kv.get(`company:${userProfile.companyId}`)
    if (!companyStr) {
      return c.json({ success: false, error: 'Company not found' }, 404)
    }
    
    const company = JSON.parse(companyStr)
    
    // Calculate new expiry date
    const currentExpiry = new Date(company.licenseExpiry)
    const today = new Date()
    const startDate = currentExpiry > today ? currentExpiry : today
    
    const newExpiry = new Date(startDate)
    newExpiry.setDate(newExpiry.getDate() + duration)
    
    // Update company license
    company.licenseExpiry = newExpiry.toISOString()
    await kv.set(`company:${userProfile.companyId}`, JSON.stringify(company))
    
    console.log(`License manually activated for company ${userProfile.companyId}`)
    
    return c.json({
      success: true,
      message: 'License activated successfully',
      company
    })
  } catch (error) {
    console.log('Error activating license:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ==================== PUBLIC TRACKING ====================

// Legacy tracking endpoint - supports old QR codes (DEPRECATED)
// This endpoint searches across all companies - use with caution
app.get('/make-server-4d437e50/tracking-legacy/:repairId', async (c) => {
  try {
    const repairId = c.req.param('repairId')
    console.log(`⚠️ Legacy tracking request for repairId: ${repairId}`)
    
    // Try old format first
    let repairStr = await kv.get(`repair:${repairId}`)
    
    // If not found in old format, search through all repairs with this ID
    if (!repairStr) {
      // Get all repairs and find the one matching this ID
      const allRepairs = await kv.getByPrefix('repair:')
      const matchingRepair = allRepairs
        .map((r: string) => JSON.parse(r))
        .find((r: any) => r.id === parseInt(repairId))
      
      if (matchingRepair) {
        repairStr = JSON.stringify(matchingRepair)
      }
    }
    
    if (!repairStr) {
      return c.json({ success: false, error: 'Repair not found' }, 404)
    }
    
    const repair = JSON.parse(repairStr)
    
    // Return only public-safe information
    const publicRepair = {
      id: repair.id,
      customerName: repair.customerName,
      deviceType: repair.deviceType,
      deviceBrand: repair.deviceBrand,
      deviceModel: repair.deviceModel,
      problem: repair.problem,
      status: repair.status,
      estimatedCost: repair.estimatedCost,
      receivedDate: repair.receivedDate,
      images: repair.images || [],
      statusLogs: (repair.statusLogs || []).map((log: any) => ({
        timestamp: log.timestamp,
        newStatus: log.newStatus,
        notes: log.notes,
        images: log.images || []
      }))
    }
    
    return c.json({ success: true, repair: publicRepair })
  } catch (error) {
    console.log('Error fetching legacy repair tracking:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Public endpoint for repair tracking (no authentication required)
// Updated to use companyId:repairId format to avoid conflicts between companies
app.get('/make-server-4d437e50/tracking/:companyId/:repairId', async (c) => {
  try {
    const companyId = c.req.param('companyId')
    const repairId = c.req.param('repairId')
    
    // First, try the new format with company prefix
    const repairKey = `repair:${companyId}:${repairId}`
    let repairStr = await kv.get(repairKey)
    
    // Fallback: If not found, try old format and check companyId matches
    if (!repairStr) {
      const oldRepairStr = await kv.get(`repair:${repairId}`)
      if (oldRepairStr) {
        const oldRepair = JSON.parse(oldRepairStr)
        // Verify it belongs to the correct company
        if (oldRepair.companyId === parseInt(companyId)) {
          repairStr = oldRepairStr
        }
      }
    }
    
    if (!repairStr) {
      return c.json({ success: false, error: 'Repair not found' }, 404)
    }
    
    const repair = JSON.parse(repairStr)
    
    // Security check: ensure repair belongs to the requested company
    if (repair.companyId !== parseInt(companyId)) {
      return c.json({ success: false, error: 'Repair not found' }, 404)
    }
    
    // Return only public-safe information (no passwords, no internal notes)
    const publicRepair = {
      id: repair.id,
      customerName: repair.customerName,
      deviceType: repair.deviceType,
      deviceBrand: repair.deviceBrand,
      deviceModel: repair.deviceModel,
      problem: repair.problem,
      status: repair.status,
      estimatedCost: repair.estimatedCost,
      receivedDate: repair.receivedDate,
      images: repair.images || [],
      statusLogs: (repair.statusLogs || []).map((log: any) => ({
        timestamp: log.timestamp,
        newStatus: log.newStatus,
        notes: log.notes,
        images: log.images || []
      }))
    }
    
    return c.json({ success: true, repair: publicRepair })
  } catch (error) {
    console.log('Error fetching repair tracking:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ 
    success: false, 
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  }, 500)
})

// 404 handler
app.notFound((c) => {
  console.log('404 - Route not found:', c.req.url)
  return c.json({ 
    success: false, 
    error: 'Route not found',
    path: c.req.url 
  }, 404)
})

// ==================== PLAN MANAGEMENT ====================

// Get plan information and pricing
app.get('/make-server-4d437e50/plans', async (c) => {
  try {
    const plans = [
      {
        id: 'basico',
        name: 'Básico',
        price: 29900,
        currency: 'COP',
        features: {
          branches: 1,
          admins: 1,
          advisors: 1,
          technicians: 2
        },
        description: 'Ideal para emprendedores y pequeños negocios'
      },
      {
        id: 'pyme',
        name: 'Pyme',
        price: 59900,
        currency: 'COP',
        features: {
          branches: 2,
          admins: 2,
          advisors: 4,
          technicians: 8
        },
        description: 'Perfecto para negocios en crecimiento',
        popular: true
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 99900,
        currency: 'COP',
        features: {
          branches: 4,
          admins: 4,
          advisors: 8,
          technicians: 16
        },
        description: 'Máxima capacidad para grandes empresas'
      }
    ]
    
    return c.json({ success: true, plans })
  } catch (error) {
    console.log('Error fetching plans:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Create payment intent for plan upgrade
app.post('/make-server-4d437e50/plans/create-payment', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Solo administradores pueden cambiar el plan' }, 403)
    }
    
    const { planId } = await c.req.json()
    
    if (!planId || !['basico', 'pyme', 'enterprise'].includes(planId)) {
      return c.json({ success: false, error: 'Plan inválido' }, 400)
    }
    
    // Get company info
    const companyStr = await kv.get(`company:${userProfile.companyId}`)
    if (!companyStr) {
      return c.json({ success: false, error: 'Empresa no encontrada' }, 404)
    }
    
    const company = JSON.parse(companyStr)
    
    // Check if already on this plan
    if (company.planId === planId) {
      return c.json({ success: false, error: 'Ya estás en este plan' }, 400)
    }
    
    // Get plan details
    const planPrices: Record<string, number> = {
      basico: 29900,
      pyme: 59900,
      enterprise: 99900
    }
    
    const amount = planPrices[planId]
    
    // Create payment intent ID
    const paymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Store payment intent
    const paymentIntent = {
      id: paymentIntentId,
      companyId: userProfile.companyId,
      userId: user.id,
      planId,
      amount,
      currency: 'COP',
      status: 'pending',
      createdAt: new Date().toISOString()
    }
    
    await kv.set(`payment_intent:${paymentIntentId}`, JSON.stringify(paymentIntent))
    
    console.log(`Payment intent created: ${paymentIntentId} for company ${userProfile.companyId} - Plan: ${planId}`)
    
    // IMPORTANT: In production, you would redirect to payment gateway here
    // For example:
    // - MercadoPago: Create preference and return init_point
    // - Stripe: Create payment intent and return client_secret
    // - PayU: Create payment form URL
    
    // This is a placeholder response - integrate with your payment provider
    return c.json({
      success: true,
      paymentIntentId,
      // In production, return the payment URL from your payment provider
      paymentUrl: `https://checkout.yourpaymentprovider.com/pay/${paymentIntentId}`,
      message: 'Redirije al usuario a paymentUrl para completar el pago'
    })
  } catch (error) {
    console.log('Error creating payment intent:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Webhook for payment confirmation
// This endpoint should be called by your payment provider after payment is confirmed
app.post('/make-server-4d437e50/plans/webhook', async (c) => {
  try {
    // IMPORTANT: In production, verify the webhook signature from your payment provider
    // to ensure the request is authentic
    
    const body = await c.req.json()
    const { paymentIntentId, status, transactionId } = body
    
    if (!paymentIntentId) {
      return c.json({ success: false, error: 'paymentIntentId is required' }, 400)
    }
    
    // Get payment intent
    const paymentIntentStr = await kv.get(`payment_intent:${paymentIntentId}`)
    if (!paymentIntentStr) {
      return c.json({ success: false, error: 'Payment intent not found' }, 404)
    }
    
    const paymentIntent = JSON.parse(paymentIntentStr)
    
    // Only process if payment was successful
    if (status !== 'success' && status !== 'approved' && status !== 'paid') {
      paymentIntent.status = status || 'failed'
      paymentIntent.updatedAt = new Date().toISOString()
      await kv.set(`payment_intent:${paymentIntentId}`, JSON.stringify(paymentIntent))
      
      console.log(`Payment ${paymentIntentId} failed or cancelled. Status: ${status}`)
      return c.json({ success: true, message: 'Payment not successful' })
    }
    
    // Update payment intent
    paymentIntent.status = 'completed'
    paymentIntent.transactionId = transactionId
    paymentIntent.completedAt = new Date().toISOString()
    await kv.set(`payment_intent:${paymentIntentId}`, JSON.stringify(paymentIntent))
    
    // Update company plan
    const companyStr = await kv.get(`company:${paymentIntent.companyId}`)
    if (!companyStr) {
      return c.json({ success: false, error: 'Company not found' }, 404)
    }
    
    const company = JSON.parse(companyStr)
    const oldPlan = company.planId
    company.planId = paymentIntent.planId
    company.updatedAt = new Date().toISOString()
    
    // Remove trial fields when upgrading from trial
    if (company.trialEndsAt) {
      delete company.trialEndsAt
    }
    
    await kv.set(`company:${paymentIntent.companyId}`, JSON.stringify(company))
    
    console.log(`✅ Plan upgraded for company ${paymentIntent.companyId}: ${oldPlan} → ${paymentIntent.planId}`)
    
    return c.json({ 
      success: true, 
      message: 'Plan updated successfully',
      oldPlan,
      newPlan: paymentIntent.planId
    })
  } catch (error) {
    console.log('Error processing payment webhook:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Get current plan and usage
app.get('/make-server-4d437e50/plans/current', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'User profile not found' }, 404)
    }
    
    const companyStr = await kv.get(`company:${userProfile.companyId}`)
    if (!companyStr) {
      return c.json({ success: false, error: 'Company not found' }, 404)
    }
    
    const company = JSON.parse(companyStr)
    const license = await checkLicense(userProfile.companyId)
    const planId = license.planId || 'basico'
    const limits = PLAN_LIMITS[planId as keyof typeof PLAN_LIMITS]
    
    // Count current usage (only active users)
    const allUsers = await kv.getByPrefix('user:')
    const companyUsers = allUsers
      .map((u: string) => JSON.parse(u))
      .filter((u: any) => 
        u.companyId === userProfile.companyId && 
        (u.active === undefined || u.active === true) // Only count active users
      )
    
    const branchIdsStr = await kv.get(`company:${userProfile.companyId}:branches`)
    const branchCount = branchIdsStr ? JSON.parse(branchIdsStr).length : 0
    
    const usage = {
      branches: branchCount,
      admins: companyUsers.filter((u: any) => u.role === 'admin').length,
      advisors: companyUsers.filter((u: any) => u.role === 'asesor').length,
      technicians: companyUsers.filter((u: any) => u.role === 'tecnico').length
    }
    
    return c.json({
      success: true,
      currentPlan: {
        id: planId,
        limits,
        usage,
        inTrial: license.inTrial,
        trialExpired: license.trialExpired,
        trialEndsAt: license.trialEndsAt
      }
    })
  } catch (error) {
    console.log('Error fetching current plan:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Validate plan change
app.post('/make-server-4d437e50/plans/validate-change', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403)
    }
    
    const { targetPlanId } = await c.req.json()
    
    if (!PLAN_LIMITS[targetPlanId as keyof typeof PLAN_LIMITS]) {
      return c.json({ success: false, error: 'Plan inválido' }, 400)
    }
    
    const license = await checkLicense(userProfile.companyId)
    const currentPlanId = license.planId || 'basico'
    const targetLimits = PLAN_LIMITS[targetPlanId as keyof typeof PLAN_LIMITS]
    
    // Count current usage (only active users)
    const allUsers = await kv.getByPrefix('user:')
    const companyUsers = allUsers
      .map((u: string) => JSON.parse(u))
      .filter((u: any) => 
        u.companyId === userProfile.companyId && 
        (u.active === undefined || u.active === true) // Only count active users
      )
    
    const branchIdsStr = await kv.get(`company:${userProfile.companyId}:branches`)
    const branchCount = branchIdsStr ? JSON.parse(branchIdsStr).length : 0
    
    const currentUsage = {
      branches: branchCount,
      admins: companyUsers.filter((u: any) => u.role === 'admin').length,
      advisors: companyUsers.filter((u: any) => u.role === 'asesor').length,
      technicians: companyUsers.filter((u: any) => u.role === 'tecnico').length
    }
    
    // Validate if change is possible
    const violations = []
    
    if (currentUsage.branches > targetLimits.branches) {
      violations.push({
        resource: 'branches',
        current: currentUsage.branches,
        limit: targetLimits.branches,
        excess: currentUsage.branches - targetLimits.branches,
        message: `Debes eliminar ${currentUsage.branches - targetLimits.branches} sucursal${currentUsage.branches - targetLimits.branches > 1 ? 'es' : ''}`
      })
    }
    
    if (currentUsage.admins > targetLimits.admins) {
      violations.push({
        resource: 'admins',
        current: currentUsage.admins,
        limit: targetLimits.admins,
        excess: currentUsage.admins - targetLimits.admins,
        message: `Debes eliminar o cambiar el rol de ${currentUsage.admins - targetLimits.admins} administrador${currentUsage.admins - targetLimits.admins > 1 ? 'es' : ''}`
      })
    }
    
    if (currentUsage.advisors > targetLimits.advisors) {
      violations.push({
        resource: 'advisors',
        current: currentUsage.advisors,
        limit: targetLimits.advisors,
        excess: currentUsage.advisors - targetLimits.advisors,
        message: `Debes eliminar o cambiar el rol de ${currentUsage.advisors - targetLimits.advisors} asesor${currentUsage.advisors - targetLimits.advisors > 1 ? 'es' : ''}`
      })
    }
    
    if (currentUsage.technicians > targetLimits.technicians) {
      violations.push({
        resource: 'technicians',
        current: currentUsage.technicians,
        limit: targetLimits.technicians,
        excess: currentUsage.technicians - targetLimits.technicians,
        message: `Debes eliminar o cambiar el rol de ${currentUsage.technicians - targetLimits.technicians} técnico${currentUsage.technicians - targetLimits.technicians > 1 ? 's' : ''}`
      })
    }
    
    const canChange = violations.length === 0
    
    return c.json({
      success: true,
      canChange,
      currentPlanId,
      targetPlanId,
      currentUsage,
      targetLimits,
      violations
    })
  } catch (error) {
    console.log('Error validating plan change:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Change plan (admin only) - This is called after payment confirmation
app.post('/make-server-4d437e50/plans/change', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403)
    }
    
    const { targetPlanId } = await c.req.json()
    
    if (!PLAN_LIMITS[targetPlanId as keyof typeof PLAN_LIMITS]) {
      return c.json({ success: false, error: 'Plan inválido' }, 400)
    }
    
    // Validate change is possible (recheck - only active users)
    const targetLimits = PLAN_LIMITS[targetPlanId as keyof typeof PLAN_LIMITS]
    
    const allUsers = await kv.getByPrefix('user:')
    const companyUsers = allUsers
      .map((u: string) => JSON.parse(u))
      .filter((u: any) => 
        u.companyId === userProfile.companyId && 
        (u.active === undefined || u.active === true) // Only count active users
      )
    
    const branchIdsStr = await kv.get(`company:${userProfile.companyId}:branches`)
    const branchCount = branchIdsStr ? JSON.parse(branchIdsStr).length : 0
    
    const currentUsage = {
      branches: branchCount,
      admins: companyUsers.filter((u: any) => u.role === 'admin').length,
      advisors: companyUsers.filter((u: any) => u.role === 'asesor').length,
      technicians: companyUsers.filter((u: any) => u.role === 'tecnico').length
    }
    
    if (currentUsage.branches > targetLimits.branches || 
        currentUsage.admins > targetLimits.admins ||
        currentUsage.advisors > targetLimits.advisors ||
        currentUsage.technicians > targetLimits.technicians) {
      return c.json({ 
        success: false, 
        error: 'No se puede cambiar al plan porque excedes los límites. Elimina sucursales o usuarios primero.' 
      }, 400)
    }
    
    // Update company plan
    const companyStr = await kv.get(`company:${userProfile.companyId}`)
    if (!companyStr) {
      return c.json({ success: false, error: 'Company not found' }, 404)
    }
    
    const company = JSON.parse(companyStr)
    const oldPlanId = company.planId
    
    company.planId = targetPlanId
    company.planChangedAt = new Date().toISOString()
    company.previousPlanId = oldPlanId
    
    // Remove trial status when changing plan
    if (company.trialEndsAt) {
      delete company.trialEndsAt
    }
    
    await kv.set(`company:${userProfile.companyId}`, JSON.stringify(company))
    
    console.log(`Plan changed from ${oldPlanId} to ${targetPlanId} for company ${userProfile.companyId}`)
    
    return c.json({
      success: true,
      message: 'Plan actualizado exitosamente',
      oldPlan: oldPlanId,
      newPlan: targetPlanId
    })
  } catch (error) {
    console.log('Error changing plan:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Extend license (add months to current expiry)
app.post('/make-server-4d437e50/license/extend', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Solo administradores pueden extender la licencia' }, 403)
    }
    
    const { months } = await c.req.json()
    
    if (!months || months < 1 || months > 12) {
      return c.json({ success: false, error: 'Duración inválida. Debe ser entre 1 y 12 meses' }, 400)
    }
    
    // Get company
    const companyStr = await kv.get(`company:${userProfile.companyId}`)
    if (!companyStr) {
      return c.json({ success: false, error: 'Empresa no encontrada' }, 404)
    }
    
    const company = JSON.parse(companyStr)
    
    // Calculate new expiry date
    let currentExpiry = new Date(company.licenseExpiry || new Date())
    
    // If license is already expired, start from now
    const now = new Date()
    if (currentExpiry < now) {
      currentExpiry = now
    }
    
    // Add months to current expiry
    const newExpiry = new Date(currentExpiry)
    newExpiry.setMonth(newExpiry.getMonth() + months)
    
    // Update company with new expiry
    company.licenseExpiry = newExpiry.toISOString()
    company.licenseExtendedAt = now.toISOString()
    company.licenseExtendedBy = user.id
    company.monthsAdded = months
    
    // Remove trial status when extending license
    if (company.trialEndsAt) {
      delete company.trialEndsAt
    }
    
    await kv.set(`company:${userProfile.companyId}`, JSON.stringify(company))
    
    console.log(`✅ License extended for company ${userProfile.companyId} by ${months} months. New expiry: ${newExpiry.toISOString()}`)
    
    return c.json({
      success: true,
      message: `Licencia extendida por ${months} ${months === 1 ? 'mes' : 'meses'}`,
      previousExpiry: company.licenseExpiry,
      newExpiry: newExpiry.toISOString(),
      monthsAdded: months
    })
  } catch (error) {
    console.log('Error extending license:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Create PSE payment for license extension
app.post('/make-server-4d437e50/license/extend/pse', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Solo administradores pueden comprar extensiones' }, 403)
    }
    
    const { planId, months, amount, discount } = await c.req.json()
    
    console.log(`Creating PSE payment for license extension: ${months} months, amount: ${amount}, discount: ${discount}%`)
    
    // In production, integrate with actual PSE gateway
    // For now, return success for demo purposes
    
    return c.json({
      success: true,
      paymentUrl: 'https://pse.example.com/payment',
      paymentId: `pse_${Date.now()}`,
      message: 'Pago PSE creado exitosamente (modo demo)'
    })
  } catch (error) {
    console.log('Error creating PSE payment for extension:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Create Paddle payment for license extension
app.post('/make-server-4d437e50/license/extend/paddle', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ success: false, error: 'Solo administradores pueden comprar extensiones' }, 403)
    }
    
    const { planId, months, amount, discount } = await c.req.json()
    
    console.log(`Creating Paddle payment for license extension: ${months} months, amount: $${amount} USD, discount: ${discount}%`)
    
    // In production, integrate with actual Paddle API
    // For now, return success for demo purposes
    
    return c.json({
      success: true,
      paymentUrl: 'https://paddle.example.com/payment',
      paymentId: `paddle_${Date.now()}`,
      message: 'Pago Paddle creado exitosamente (modo demo)'
    })
  } catch (error) {
    console.log('Error creating Paddle payment for extension:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Get payment details for receipt
app.post('/make-server-4d437e50/license/payment-details', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'Usuario no encontrado' }, 404)
    }
    
    const { paymentIntentId, transactionId } = await c.req.json()
    
    // Get company info
    const companyStr = await kv.get(`company:${userProfile.companyId}`)
    if (!companyStr) {
      return c.json({ success: false, error: 'Empresa no encontrada' }, 404)
    }
    
    const company = JSON.parse(companyStr)
    
    // Get payment intent if provided
    let paymentIntent = null
    if (paymentIntentId) {
      const piStr = await kv.get(`payment_intent:${paymentIntentId}`)
      if (piStr) {
        paymentIntent = JSON.parse(piStr)
      }
    }
    
    // Construct payment details
    const planNames: Record<string, string> = {
      basico: 'Plan Básico',
      pyme: 'Plan PYME',
      enterprise: 'Plan Enterprise'
    }
    
    const details = {
      status: paymentIntent?.status === 'completed' ? 'success' : 
              paymentIntent?.status === 'failed' ? 'failed' : 'pending',
      transactionId: transactionId || paymentIntent?.transactionId || `TXN-${Date.now()}`,
      paymentDate: paymentIntent?.createdAt || new Date().toISOString(),
      planId: paymentIntent?.planId || company.planId || 'pyme',
      planName: planNames[paymentIntent?.planId || company.planId] || 'Plan PYME',
      amount: paymentIntent?.amount || 0,
      currency: paymentIntent?.currency || 'USD',
      months: paymentIntent?.months || 1,
      discount: paymentIntent?.discount || 0,
      companyName: company.name || userProfile.companyName,
      companyEmail: userProfile.email,
      receiptNumber: `REC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      paymentMethod: paymentIntent?.paymentMethod || 'PSE',
      newExpiryDate: company.licenseExpiry
    }
    
    return c.json({
      success: true,
      details
    })
  } catch (error) {
    console.log('Error getting payment details:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Send receipt via email
app.post('/make-server-4d437e50/license/send-receipt', async (c) => {
  try {
    const { error, user } = await verifyAuth(c.req.header('Authorization'))
    if (error || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
    
    const userProfile = await getUserProfile(user.id)
    if (!userProfile) {
      return c.json({ success: false, error: 'Usuario no encontrado' }, 404)
    }
    
    const { receiptNumber, transactionId } = await c.req.json()
    
    console.log(`Sending receipt ${receiptNumber} to ${userProfile.email}`)
    
    // TODO: Implement email sending with actual email service
    // For now, just log and return success
    
    return c.json({
      success: true,
      message: 'Recibo enviado por email (demo mode)'
    })
  } catch (error) {
    console.log('Error sending receipt email:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Start server
console.log('🚀 Oryon App Backend Server starting...')
Deno.serve(app.fetch)
