import axios from 'axios'

const WOMPI_PUBLIC_KEY = import.meta.env.VITE_WOMPI_PUBLIC_KEY || 'pub_test_tu_clave_publica'
const WOMPI_ENV = import.meta.env.VITE_WOMPI_ENV || 'sandbox'
const WOMPI_INTEGRITY_SECRET = import.meta.env.VITE_WOMPI_INTEGRITY_SECRET || ''

const WOMPI_BASE_URL = WOMPI_ENV === 'production' 
  ? 'https://production.wompi.co/v1'
  : 'https://sandbox.wompi.co/v1'

const WOMPI_CHECKOUT_URL = 'https://checkout.wompi.co/p/'

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

/**
 * Genera la firma de integridad SHA-256 requerida opcionalmente por Wompi para asegurar
 * que los montos o referencias no sean alterados en el checkout.
 * Fórmula: SHA256(reference + amountInCents + currency + integritySecret)
 */
export async function generateWompiIntegritySignature(
  reference: string,
  amountInCents: number,
  currency: string = 'COP',
  secret: string = WOMPI_INTEGRITY_SECRET
): Promise<string | null> {
  if (!secret || secret.includes('tu_secreto')) {
    return null
  }

  try {
    const rawString = `${reference}${amountInCents}${currency}${secret}`
    const encoder = new TextEncoder()
    const data = encoder.encode(rawString)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch (err) {
    console.warn('No se pudo generar la firma de integridad de Wompi:', err)
    return null
  }
}

class WompiService {
  private publicKey: string
  private baseUrl: string
  private integritySecret: string

  constructor() {
    this.publicKey = WOMPI_PUBLIC_KEY
    this.baseUrl = WOMPI_BASE_URL
    this.integritySecret = WOMPI_INTEGRITY_SECRET
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
   * Crea un Payment Link alojado oficial en Wompi (checkout.wompi.co/l/:id)
   * 100% libre de errores 403 de CloudFront o bloqueos de iframe
   */
  async createHostedPaymentLink(params: {
    name: string
    description?: string
    amount_in_cents: number
    currency?: string
    redirect_url: string
    reference?: string
  }): Promise<string> {
    const privateKey =
      import.meta.env.VITE_WOMPI_PRIVATE_KEY || 'prv_test_vzQ20H2oGYLnxI4iI6LPcZFEVpaHpghH'

    try {
      const response = await axios.post(
        `${this.baseUrl}/payment_links`,
        {
          name: params.name,
          description: params.description || 'Suscripción Oryon',
          single_use: false,
          collect_shipping: false,
          currency: params.currency || 'COP',
          amount_in_cents: params.amount_in_cents,
          redirect_url: params.redirect_url,
        },
        {
          headers: {
            Authorization: `Bearer ${privateKey}`,
            'Content-Type': 'application/json',
          },
        }
      )

      const linkId = response.data?.data?.id
      if (linkId) {
        return `https://checkout.wompi.co/l/${linkId}`
      }
      throw new Error('No se recibió ID de link de pago de Wompi')
    } catch (err: any) {
      console.error('Error creando Hosted Payment Link en Wompi:', err?.response?.data || err)
      throw new Error(
        err?.response?.data?.error?.reason || 'Error al generar enlace de pago en Wompi'
      )
    }
  }

  /**
   * Abre el Checkout oficial de Wompi de forma robusta
   * 1. Primero intenta generar un Hosted Link oficial (checkout.wompi.co/l/:id)
   * 2. Si hay problemas de red, usa el Web Checkout con firma de integridad
   */
  async openCheckout(
    params: WompiPaymentLinkParams & { name?: string; description?: string }
  ): Promise<void> {
    try {
      const hostedUrl = await this.createHostedPaymentLink({
        name: params.name || `Suscripción Oryon - Ref: ${params.reference}`,
        description:
          params.description || `Reactivación de suscripción para taller Oryon (Ref: ${params.reference})`,
        amount_in_cents: params.amount_in_cents,
        currency: params.currency || 'COP',
        redirect_url: params.redirect_url,
        reference: params.reference,
      })

      console.log('✅ Redirigiendo a Wompi Hosted Checkout:', hostedUrl)
      window.location.href = hostedUrl
    } catch (apiErr) {
      console.warn('No se pudo crear hosted link, intentando checkout web directo...', apiErr)
      const fallbackUrl = await this.createPaymentLink(params)
      window.location.href = fallbackUrl
    }
  }

  /**
   * Crear un link de pago de Wompi (Checkout Widget URL)
   * Redirige al checkout seguro de Wompi (PSE, Bancolombia, Tarjetas, Nequi, etc.)
   */
  async createPaymentLink(params: WompiPaymentLinkParams): Promise<string> {
    const queryParams = new URLSearchParams({
      'public-key': this.publicKey,
      'currency': params.currency || 'COP',
      'amount-in-cents': params.amount_in_cents.toString(),
      'reference': params.reference,
      'redirect-url': params.redirect_url
    })

    // Calcular firma de integridad si existe secreto configurado
    if (this.integritySecret && !this.integritySecret.includes('tu_secreto')) {
      const signature = await generateWompiIntegritySignature(
        params.reference,
        params.amount_in_cents,
        params.currency || 'COP',
        this.integritySecret
      )
      if (signature) {
        queryParams.append('signature:integrity', signature)
      }
    }

    // Agregar email del cliente si está disponible
    if (params.customer_email) {
      queryParams.append('customer-data:email', params.customer_email)
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

    return `${WOMPI_CHECKOUT_URL}?${queryParams.toString()}`
  }

  /**
   * Versión sincrónica para compatibilidad inmediata si no se necesita esperar la firma
   */
  createPaymentLinkSync(params: WompiPaymentLinkParams): string {
    const queryParams = new URLSearchParams({
      'public-key': this.publicKey,
      'currency': params.currency || 'COP',
      'amount-in-cents': params.amount_in_cents.toString(),
      'reference': params.reference,
      'redirect-url': params.redirect_url
    })

    if (params.customer_email) {
      queryParams.append('customer-data:email', params.customer_email)
    }
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

    return `${WOMPI_CHECKOUT_URL}?${queryParams.toString()}`
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