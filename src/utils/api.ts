/**
 * API utilities for making authenticated requests
 */

import { projectId } from './supabase/info'

export interface ApiError {
  status: number
  message: string
  isAuthError: boolean
}

/**
 * Makes an authenticated API request
 * @param endpoint - The API endpoint (e.g., '/stats' or '/repairs')
 * @param accessToken - The user's access token
 * @param options - Fetch options
 * @returns The response data or throws an ApiError
 */
export async function makeAuthenticatedRequest<T = any>(
  endpoint: string,
  accessToken: string | null,
  options: RequestInit = {}
): Promise<T> {
  // Validate token
  if (!accessToken) {
    const error: ApiError = {
      status: 401,
      message: 'No access token available. Please login again.',
      isAuthError: true
    }
    throw error
  }

  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  
  // Build URL
  const url = `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50${normalizedEndpoint}`

  // Merge headers
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    ...(options.headers || {})
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    })

    // Handle non-OK responses
    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`
      
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
      } catch {
        // If JSON parsing fails, try text
        try {
          errorMessage = await response.text() || errorMessage
        } catch {
          // Keep default message
        }
      }

      const error: ApiError = {
        status: response.status,
        message: errorMessage,
        isAuthError: response.status === 401 || response.status === 403
      }

      console.error(`❌ API Error [${response.status}] ${normalizedEndpoint}:`, errorMessage)
      throw error
    }

    // Parse and return JSON response
    return await response.json()
  } catch (error) {
    // If it's already an ApiError, re-throw it
    if ((error as any).isAuthError !== undefined) {
      throw error
    }

    // Otherwise, wrap it in an ApiError
    const apiError: ApiError = {
      status: 0,
      message: error instanceof Error ? error.message : 'Network error',
      isAuthError: false
    }
    
    console.error(`❌ Network Error ${normalizedEndpoint}:`, error)
    throw apiError
  }
}

/**
 * Checks if an error is an authentication error
 */
export function isAuthError(error: any): boolean {
  return error?.isAuthError === true || error?.status === 401 || error?.status === 403
}

/**
 * Gets a user-friendly error message
 */
export function getErrorMessage(error: any): string {
  if (isAuthError(error)) {
    return 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
  }

  if (error?.message) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return 'Ocurrió un error inesperado. Por favor, intenta nuevamente.'
}
