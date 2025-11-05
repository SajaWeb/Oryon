import { useState, useCallback } from 'react'
import { projectId } from '../../../utils/supabase/info'
import { Customer, RepairFormData } from '../types'

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

  const findOrCreateCustomer = useCallback(async (
    formData: RepairFormData, 
    selectedCustomerId: number | null
  ): Promise<number | null> => {
    if (!accessToken) {
      throw new Error('No access token available')
    }

    // Si se seleccionó un cliente existente, retornar su ID
    if (selectedCustomerId) {
      return selectedCustomerId
    }

    // Buscar cliente existente por nombre, teléfono o documento
    const existingCustomer = customers.find((c: Customer) => {
      // Buscar por nombre exacto
      if (c.name.toLowerCase() === formData.customerName.toLowerCase()) {
        return true
      }
      // Buscar por teléfono
      if (formData.customerPhone && formData.customerPhone.trim() && c.phone === formData.customerPhone) {
        return true
      }
      // Buscar por número de identificación
      if (formData.customerIdentificationNumber && formData.customerIdentificationNumber.trim() && 
          c.identificationNumber && 
          c.identificationNumber.toLowerCase().trim() === formData.customerIdentificationNumber.toLowerCase().trim()) {
        return true
      }
      return false
    })
    
    if (existingCustomer) {
      return existingCustomer.id
    }
    
    // Crear nuevo cliente
    const createResponse = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/customers`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.customerName,
          email: formData.customerEmail || `${formData.customerName.toLowerCase().replace(/\\s+/g, '.')}@cliente.com`,
          phone: formData.customerPhone || 'N/A',
          address: '',
          identificationType: formData.customerIdentificationType || undefined,
          identificationNumber: formData.customerIdentificationNumber || undefined
        })
      }
    )
    
    const createData = await createResponse.json()
    if (createData.success) {
      // Refrescar lista de clientes
      await fetchCustomers()
      return createData.customer.id
    } else {
      // Error al crear cliente (puede ser duplicado)
      throw new Error(createData.error || 'Error al crear el cliente')
    }
  }, [accessToken, customers, fetchCustomers])

  return {
    customers,
    fetchCustomers,
    findOrCreateCustomer
  }
}
