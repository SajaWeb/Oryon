import { useState, useCallback } from 'react'
import { projectId } from '../../../utils/supabase/info'
import { Customer } from '../types'

export function useCustomers(accessToken: string | null) {
  const [customers, setCustomers] = useState<Customer[]>([])

  const fetchCustomers = useCallback(async () => {
    if (!accessToken) {
      console.error('Cannot fetch customers: no access token')
      throw new Error('No access token available')
    }
    
    try {
      console.log('Fetching customers...')
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/customers`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
      
      console.log('Customers response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Customers response not ok:', errorText)
        throw new Error(`Server responded with ${response.status}: ${errorText}`)
      }
      
      const data = await response.json()
      console.log('Customers data received, count:', data.customers?.length || 0)
      
      if (data.success) {
        const parsed = data.customers.map((c: string) => JSON.parse(c))
        setCustomers(parsed.sort((a: Customer, b: Customer) => a.name.localeCompare(b.name)))
      } else {
        throw new Error(data.error || 'Failed to fetch customers')
      }
    } catch (error) {
      console.error('Error fetching customers (catch block):', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown'
      })
      throw error
    }
  }, [accessToken])

  /* La búsqueda o creación del cliente al guardar vive en
     customers/customerDraft.ts (resolveCustomer), compartida con Ventas. */

  return {
    customers,
    fetchCustomers,
  }
}
