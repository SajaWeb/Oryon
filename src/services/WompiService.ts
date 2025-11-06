import axios from 'axios'

const WOMPI_PUBLIC_KEY = import.meta.env.VITE_WOMPI_PUBLIC_KEY || 'pub_test_tu_clave_publica'
const WOMPI_BASE_URL = import.meta.env.VITE_WOMPI_ENV === 'production' 
  ? 'https://production.wompi.co/v1'
  : 'https://sandbox.wompi.co/v1'

interface WompiPaymentLinkParams {
  amount_in_cents: number
  currency: string
  reference: string
  customer_email: string
  redirect_url: string
  customer_data?: {
    full_name?: string
    phone_number?: string
    legal_id?: string
    legal_id_type?: string
  }
}

interface WompiTransaction {
  id: string
  status: 'APPROVED' | 'DECLINED' | 'PENDING' | 'VOIDED' | 'ERROR'
  amount_in_cents: number
  reference: string
  customer_email: string
  currency: string
  payment_method_type: string
  created_at: string
}

class WompiService {
  private publicKey: string

  constructor() {
    this.publicKey = WOMPI_PUBLIC_KEY
  }

  /**
   * Obtener el token de aceptación de términos y condiciones
   * Requerido para crear transacciones
   */
  async getAcceptanceToken(): Promise<string> {
    try {
      const response = await axios.get(`${WOMPI_BASE_URL}/merchants/${this.publicKey}`)
      return response.data.data.presigned_acceptance.acceptance_token
    } catch (error) {
      console.error('Error obteniendo acceptance token:', error)
      throw new Error('No se pudo obtener el token de aceptación')
    }
  }

  /**
   * Crear un link de pago de Wompi (Checkout Widget)
   * Este es el método más simple para pagos con PSE
   */
  createPaymentLink(params: WompiPaymentLinkParams): string {
    const checkoutUrl = 'https://checkout.wompi.co/p/'
    
    const queryParams = new URLSearchParams({
      'public-key': this.publicKey,
      'currency': params.currency,
      'amount-in-cents': params.amount_in_cents.toString(),
      'reference': params.reference,
      'redirect-url': params.redirect_url
    })

    // Agregar email del cliente si está disponible
    if (params.customer_email) {
      queryParams.append('customer-email', params.customer_email)
    }

    // Agregar datos adicionales del cliente si están disponibles
    if (params.customer_data?.full_name) {
      queryParams.append('customer-data:full-name', params.customer_data.full_name)
    }
    if (params.customer_data?.phone_number) {
      queryParams.append('customer-data:phone-number', params.customer_data.phone_number)
    }
    if (params.customer_data?.legal_id) {
      queryParams.append('customer-data:legal-id', params.customer_data.legal_id)
    }
    if (params.customer_data?.legal_id_type) {
      queryParams.append('customer-data:legal-id-type', params.customer_data.legal_id_type)
    }

    return `${checkoutUrl}?${queryParams.toString()}`
  }

  /**
   * Consultar el estado de una transacción
   */
  async getTransaction(transactionId: string): Promise<WompiTransaction> {
    try {
      const response = await axios.get(`${WOMPI_BASE_URL}/transactions/${transactionId}`)
      return response.data.data
    } catch (error) {
      console.error('Error consultando transacción:', error)
      throw new Error('No se pudo consultar la transacción')
    }
  }

  /**
   * Crear una transacción con PSE directamente
   * Nota: Requiere que el usuario seleccione su banco primero
   */
  async createPSETransaction(params: {
    acceptance_token: string
    amount_in_cents: number
    currency: string
    customer_email: string
    reference: string
    payment_method: {
      type: 'PSE'
      user_type: string // 0 = Persona Natural, 1 = Persona Jurídica
      user_legal_id_type: string // CC, CE, NIT, etc.
      user_legal_id: string
      financial_institution_code: string // Código del banco
      payment_description: string
    }
    customer_data?: {
      phone_number?: string
      full_name?: string
    }
  }) {
    try {
      const response = await axios.post(
        `${WOMPI_BASE_URL}/transactions`,
        params,
        {
          headers: {
            'Authorization': `Bearer ${this.publicKey}`,
            'Content-Type': 'application/json'
          }
        }
      )
      return response.data.data
    } catch (error) {
      console.error('Error creando transacción PSE:', error)
      throw new Error('No se pudo crear la transacción')
    }
  }

  /**
   * Obtener lista de bancos disponibles para PSE
   */
  async getPSEFinancialInstitutions() {
    try {
      const response = await axios.get(`${WOMPI_BASE_URL}/pse/financial_institutions`)
      return response.data.data
    } catch (error) {
      console.error('Error obteniendo bancos PSE:', error)
      throw new Error('No se pudieron obtener los bancos')
    }
  }
}

export default new WompiService()
export type { WompiTransaction, WompiPaymentLinkParams }