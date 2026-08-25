import axios from 'axios'
import { makeAuthenticatedRequest } from '../utils/api'

/**
 * Cliente de Wompi.
 *
 * Solo queda aquí lo que puede ser público: la llave `pub_`, el entorno y las
 * consultas de lectura que Wompi expone con ella.
 *
 * Lo demás se movió al Edge Function (`POST /payments/wompi/checkout`):
 *
 *  - La llave privada estaba escrita en este archivo como valor por defecto y
 *    además se leía de VITE_WOMPI_PRIVATE_KEY. Todo lo que lleva prefijo VITE_ se
 *    incrusta en el bundle, así que era pública: cualquiera podía crear enlaces
 *    de pago del comercio.
 *  - El secreto de integridad firmaba el monto en el navegador. Una firma que el
 *    comprador puede recalcular no protege el monto de nada.
 *
 * Las dos claves hay que rotarlas en el panel de Wompi: ya se publicaron.
 */

const WOMPI_PUBLIC_KEY = import.meta.env.VITE_WOMPI_PUBLIC_KEY || ''
const WOMPI_ENV = import.meta.env.VITE_WOMPI_ENV || 'sandbox'

const WOMPI_BASE_URL = WOMPI_ENV === 'production' 
  ? 'https://production.wompi.co/v1'
  : 'https://sandbox.wompi.co/v1'

export interface WompiPaymentLinkParams {
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

export interface WompiTransaction {
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
  private baseUrl: string

  constructor() {
    this.publicKey = WOMPI_PUBLIC_KEY
    this.baseUrl = WOMPI_BASE_URL
  }

  getEnvironment(): string {
    return WOMPI_ENV
  }

  getPublicKey(): string {
    return this.publicKey
  }

  /**
   * Obtener el token de aceptación de términos y condiciones
   * Requerido para crear transacciones directas con API de Wompi
   */
  async getAcceptanceToken(): Promise<string> {
    try {
      const response = await axios.get(`${this.baseUrl}/merchants/${this.publicKey}`)
      return response.data.data.presigned_acceptance.acceptance_token
    } catch (error) {
      console.error('Error obteniendo acceptance token de Wompi:', error)
      throw new Error('No se pudo obtener el token de aceptación')
    }
  }

  /**
   * Pide al servidor la URL de checkout y lleva al usuario allí.
   *
   * El monto, la referencia y la URL de retorno se validan y se firman en el Edge
   * Function, que es el único que conoce la llave privada y el secreto de
   * integridad. Si el enlace alojado falla, el servidor devuelve el Web Checkout
   * ya firmado, así que aquí no hay ramas que decidir.
   */
  async openCheckout(
    params: WompiPaymentLinkParams & { name?: string; description?: string },
    accessToken: string
  ): Promise<void> {
    const result = await makeAuthenticatedRequest<{ success: boolean; url?: string; error?: string }>(
      '/payments/wompi/checkout',
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          reference: params.reference,
          amount_in_cents: params.amount_in_cents,
          currency: params.currency || 'COP',
          redirect_url: params.redirect_url,
          name: params.name,
          description: params.description,
          customer_email: params.customer_email,
          customer_data: params.customer_data,
        }),
      }
    )

    if (!result.success || !result.url) {
      throw new Error(result.error || 'No se pudo abrir el checkout de Wompi')
    }

    window.location.href = result.url
  }

  /**
   * Consultar el estado de una transacción directamente en Wompi API
   */
  async getTransaction(transactionId: string): Promise<WompiTransaction> {
    try {
      const response = await axios.get(`${this.baseUrl}/transactions/${transactionId}`)
      return response.data.data
    } catch (error) {
      console.error('Error consultando transacción en Wompi:', error)
      throw new Error('No se pudo consultar la transacción en Wompi')
    }
  }

  /**
   * Crear una transacción con PSE directamente mediante API (opcional)
   */
  async createPSETransaction(params: {
    acceptance_token: string
    amount_in_cents: number
    currency: string
    customer_email: string
    reference: string
    payment_method: {
      type: 'PSE'
      user_type: string
      user_legal_id_type: string
      user_legal_id: string
      financial_institution_code: string
      payment_description: string
    }
    customer_data?: {
      phone_number?: string
      full_name?: string
    }
  }) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transactions`,
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
      throw new Error('No se pudo crear la transacción PSE')
    }
  }

  /**
   * Obtener lista de bancos disponibles para PSE
   */
  async getPSEFinancialInstitutions() {
    try {
      const response = await axios.get(`${this.baseUrl}/pse/financial_institutions`)
      return response.data.data
    } catch (error) {
      console.error('Error obteniendo bancos PSE:', error)
      throw new Error('No se pudieron obtener los bancos')
    }
  }
}

export default new WompiService()