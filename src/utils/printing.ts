/**
 * Impresión de documentos: factura, orden de trabajo y etiqueta.
 *
 * Un solo motor para los tres. Antes había dos mecanismos y tres tipografías:
 * la factura y la OT se imprimían enteras en Courier New, la etiqueta en Arial, y
 * cada generador armaba su HTML por su cuenta.
 *
 * Dos decisiones que lo ordenan:
 *
 * 1. **Una sola fuente** en todos los documentos y todos los formatos. Es una pila
 *    del sistema, sin webfonts: no hay nada que descargar, imprime igual sin
 *    conexión y las térmicas la renderizan nítida. Los dígitos de Helvetica y
 *    Arial ya son de ancho fijo, así que los montos alinean en columna sin
 *    necesidad de una monoespaciada aparte.
 *
 * 2. **Sin ventana emergente.** El documento se arma en un iframe oculto de la
 *    propia página y se manda a imprimir desde ahí. La ventana emergente que se
 *    usaba antes la bloquea el navegador en móvil casi siempre.
 */

/** Los tres destinos reales de un taller. */
export type PrintFormat = '55mm' | '80mm' | 'carta'

/** La misma pila en los tres documentos: eso es lo que da concordancia. */
const FONT_STACK = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`

interface FormatSpec {
  label: string
  /** Ancho de página. `auto` de alto en rollo: el ticket crece con el contenido. */
  page: string
  padding: string
  /** Escala tipográfica en px; los rollos necesitan cuerpos más pequeños. */
  base: number
  small: number
  title: number
  total: number
  /** El rollo no admite dos columnas. */
  columns: boolean
}

export const FORMATS: Record<PrintFormat, FormatSpec> = {
  '55mm': { label: 'Rollo térmico 55 mm', page: '55mm auto', padding: '3mm', base: 8, small: 7, title: 11, total: 13, columns: false },
  '80mm': { label: 'Rollo térmico 80 mm', page: '80mm auto', padding: '4mm', base: 9, small: 8, title: 13, total: 16, columns: false },
  carta: { label: 'Hoja carta', page: 'letter', padding: '14mm', base: 11, small: 9.5, title: 19, total: 22, columns: true },
}

/**
 * Normaliza el formato guardado.
 *
 * La configuración llegó a ofrecer `A4` mientras el código solo entendía
 * `half-letter`, así que un taller que eligiera A4 imprimía en un formato que
 * nunca pidió. Los valores viejos se traducen aquí y nadie tiene que reconfigurar.
 */
export function normalizeFormat(value?: string): PrintFormat {
  switch ((value ?? '').toLowerCase()) {
    case '55mm':
      return '55mm'
    case '80mm':
      return '80mm'
    default:
      // 'carta', 'letter', 'a4', 'half-letter' y cualquier cosa desconocida.
      return 'carta'
  }
}

export interface PrintConfig {
  format?: string
  companyName: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  taxId?: string
  taxIdType?: string
  companyLogo?: string
  website?: string
  socialMedia?: string
  warrantyNotes?: string
  welcomeMessage?: string
  farewellMessage?: string
}

export interface InvoiceData {
  invoiceNumber: string
  date: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  items: Array<{ name: string; quantity: number; price: number; total: number }>
  subtotal: number
  tax?: number
  discount?: number
  total: number
  paymentMethod: string
  notes?: string
  repairOrderNumber?: string
  deviceInfo?: string
  technicianName?: string
}

export interface ServiceOrderData {
  orderNumber: string
  date: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  device: string
  brand?: string
  model?: string
  serialNumber?: string
  problem: string
  observations?: string
  estimatedCost?: number
  estimatedDate?: string
  status: string
  technician?: string
  accessories?: string
  trackingUrl?: string
}

export interface DeviceLabelData {
  orderNumber: string
  customerName: string
  customerPhone: string
  problem: string
  devicePassword?: string
  devicePasswordType?: 'text' | 'pattern'
}

/* ───────────────────────── utilidades ───────────────────────── */

const money = (n?: number) => `$${Number(n || 0).toLocaleString('es-CO')}`

/** Todo lo que venga de la base pasa por aquí antes de entrar al HTML. */
function esc(value?: string | number): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Hoja de estilos común. Es la pieza que hace que los tres documentos rimen. */
function styles(f: FormatSpec): string {
  return `
    @page { size: ${f.page}; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body {
      font-family: ${FONT_STACK};
      font-size: ${f.base}px;
      line-height: 1.4;
      color: #000;
      padding: ${f.padding};
    }
    .doc { width: 100%; }
    h1 { font-size: ${f.title}px; font-weight: 700; margin: 0 0 2px; letter-spacing: -0.01em; }
    h2 { font-size: ${f.base + 1}px; font-weight: 700; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.06em; }
    .muted { color: #444; font-size: ${f.small}px; }
    .center { text-align: center; }
    .right { text-align: right; }
    .rule { border: 0; border-top: 1px solid #000; margin: 6px 0; }
    .rule-soft { border: 0; border-top: 1px dashed #888; margin: 5px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    .stack { display: flex; flex-direction: column; gap: 2px; }
    .block { margin-bottom: 7px; }
    table { width: 100%; border-collapse: collapse; }
    th { font-size: ${f.small}px; text-transform: uppercase; letter-spacing: 0.05em; text-align: left; padding: 3px 0; border-bottom: 1px solid #000; }
    td { padding: 3px 0; vertical-align: top; }
    tbody tr + tr td { border-top: 1px solid #ddd; }
    /* Los dígitos de esta pila ya son de ancho fijo: las cifras alinean solas. */
    .num { font-variant-numeric: tabular-nums; white-space: nowrap; }
    .total { font-size: ${f.total}px; font-weight: 700; }
    .kv { display: grid; grid-template-columns: auto 1fr; gap: 1px 8px; }
    .kv dt { color: #444; font-size: ${f.small}px; }
    .kv dd { margin: 0; }
    .box { border: 1px solid #000; padding: 5px 6px; margin: 6px 0; }
    .logo { max-width: ${f.columns ? '160px' : '46mm'}; max-height: 18mm; display: block; margin: 0 auto 4px; }
    .qr { display: block; margin: 4px auto 2px; width: ${f.columns ? '110px' : '28mm'}; }
    .sign { margin-top: ${f.columns ? '18mm' : '10mm'}; }
    .sign-line { border-top: 1px solid #000; padding-top: 3px; font-size: ${f.small}px; }
    ${f.columns ? '.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; }' : '.cols { display: block; }'}
  `
}

/** Cabecera común: es lo que hace que los tres se vean de la misma casa. */
function header(config: PrintConfig, f: FormatSpec): string {
  const datos = [
    config.taxId ? `${esc(config.taxIdType || 'NIT')} ${esc(config.taxId)}` : '',
    esc(config.companyAddress),
    esc(config.companyPhone),
    esc(config.companyEmail),
  ].filter(Boolean)

  return `
    <div class="block center">
      ${config.companyLogo ? `<img class="logo" src="${esc(config.companyLogo)}" alt="">` : ''}
      <h1>${esc(config.companyName || 'Oryon')}</h1>
      ${datos.length ? `<div class="muted">${datos.join(' · ')}</div>` : ''}
    </div>
    <hr class="rule">
  `
}

function footer(config: PrintConfig): string {
  const lineas = [esc(config.warrantyNotes), esc(config.farewellMessage), esc(config.website)].filter(Boolean)
  if (!lineas.length) return ''
  return `<hr class="rule-soft"><div class="center muted">${lineas.join('<br>')}</div>`
}

function shell(title: string, f: FormatSpec, body: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${styles(f)}</style></head><body><div class="doc">${body}</div></body></html>`
}

/* ───────────────────────── documentos ───────────────────────── */

export function invoiceHtml(data: InvoiceData, config: PrintConfig): string {
  const f = FORMATS[normalizeFormat(config.format)]

  const filas = data.items
    .map(
      (item) => `
      <tr>
        <td>${esc(item.name)}<div class="muted num">${item.quantity} × ${money(item.price)}</div></td>
        <td class="right num">${money(item.total)}</td>
      </tr>`
    )
    .join('')

  const totales = [
    data.subtotal !== data.total ? ['Subtotal', money(data.subtotal)] : null,
    data.discount ? ['Descuento', `-${money(data.discount)}`] : null,
    data.tax ? ['Impuesto', money(data.tax)] : null,
  ].filter(Boolean) as string[][]

  return shell(
    `Factura ${data.invoiceNumber}`,
    f,
    `
    ${header(config, f)}
    <div class="block">
      <div class="row"><strong>Factura ${esc(data.invoiceNumber)}</strong><span class="muted num">${esc(data.date)}</span></div>
      <dl class="kv">
        <dt>Cliente</dt><dd>${esc(data.customerName)}</dd>
        ${data.customerPhone ? `<dt>Teléfono</dt><dd class="num">${esc(data.customerPhone)}</dd>` : ''}
        ${data.repairOrderNumber ? `<dt>Orden</dt><dd class="num">${esc(data.repairOrderNumber)}</dd>` : ''}
        ${data.deviceInfo ? `<dt>Equipo</dt><dd>${esc(data.deviceInfo)}</dd>` : ''}
        ${data.technicianName ? `<dt>Técnico</dt><dd>${esc(data.technicianName)}</dd>` : ''}
      </dl>
    </div>
    <table>
      <thead><tr><th>Detalle</th><th class="right">Importe</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
    <hr class="rule">
    ${totales.map(([k, v]) => `<div class="row"><span class="muted">${k}</span><span class="num">${v}</span></div>`).join('')}
    <div class="row total"><span>TOTAL</span><span class="num">${money(data.total)}</span></div>
    <div class="row"><span class="muted">Pago</span><span>${esc(data.paymentMethod)}</span></div>
    ${data.notes ? `<hr class="rule-soft"><div class="muted">${esc(data.notes)}</div>` : ''}
    ${footer(config)}
  `
  )
}

export function serviceOrderHtml(data: ServiceOrderData, config: PrintConfig, qrDataUrl?: string): string {
  const f = FORMATS[normalizeFormat(config.format)]

  const equipo = `
    <div class="block">
      <h2>Equipo</h2>
      <dl class="kv">
        <dt>Tipo</dt><dd>${esc(data.device)}</dd>
        ${data.brand ? `<dt>Marca</dt><dd>${esc(data.brand)}</dd>` : ''}
        ${data.model ? `<dt>Modelo</dt><dd>${esc(data.model)}</dd>` : ''}
        ${data.serialNumber ? `<dt>IMEI / Serie</dt><dd class="num">${esc(data.serialNumber)}</dd>` : ''}
        ${data.accessories ? `<dt>Accesorios</dt><dd>${esc(data.accessories)}</dd>` : ''}
      </dl>
    </div>`

  const servicio = `
    <div class="block">
      <h2>Servicio</h2>
      <dl class="kv">
        <dt>Estado</dt><dd>${esc(data.status)}</dd>
        ${data.technician ? `<dt>Técnico</dt><dd>${esc(data.technician)}</dd>` : ''}
        ${data.estimatedDate ? `<dt>Entrega est.</dt><dd class="num">${esc(data.estimatedDate)}</dd>` : ''}
      </dl>
      <div class="box">
        <div class="muted">Falla reportada</div>
        <div>${esc(data.problem)}</div>
      </div>
      ${data.observations ? `<div class="muted">${esc(data.observations)}</div>` : ''}
      ${
        data.estimatedCost != null
          ? `<div class="row total"><span>Costo estimado</span><span class="num">${money(data.estimatedCost)}</span></div>`
          : ''
      }
    </div>`

  return shell(
    `Orden ${data.orderNumber}`,
    f,
    `
    ${header(config, f)}
    <div class="block">
      <div class="row"><strong>Orden de trabajo ${esc(data.orderNumber)}</strong><span class="muted num">${esc(data.date)}</span></div>
      <dl class="kv">
        <dt>Cliente</dt><dd>${esc(data.customerName)}</dd>
        ${data.customerPhone ? `<dt>Teléfono</dt><dd class="num">${esc(data.customerPhone)}</dd>` : ''}
        ${data.customerEmail ? `<dt>Correo</dt><dd>${esc(data.customerEmail)}</dd>` : ''}
      </dl>
    </div>
    <div class="cols">${equipo}${servicio}</div>
    ${
      qrDataUrl
        ? `<hr class="rule-soft"><div class="center"><img class="qr" src="${qrDataUrl}" alt=""><div class="muted">Consulta el estado de tu equipo escaneando el código</div></div>`
        : ''
    }
    <div class="sign"><div class="sign-line">Firma del cliente · recibí conforme</div></div>
    ${footer(config)}
  `
  )
}

/**
 * La etiqueta va siempre en rollo de 55 mm: es un adhesivo que se pega al equipo,
 * no depende de la impresora elegida para los demás documentos.
 */
export function deviceLabelHtml(data: DeviceLabelData): string {
  const f = FORMATS['55mm']
  const clave =
    data.devicePasswordType === 'pattern'
      ? 'Patrón (ver en la orden)'
      : data.devicePassword
        ? esc(data.devicePassword)
        : '—'

  return shell(
    `Etiqueta ${data.orderNumber}`,
    f,
    `
    <div class="center block">
      <h1 class="num">${esc(data.orderNumber)}</h1>
    </div>
    <hr class="rule">
    <dl class="kv">
      <dt>Cliente</dt><dd>${esc(data.customerName)}</dd>
      <dt>Teléfono</dt><dd class="num">${esc(data.customerPhone)}</dd>
      <dt>Clave</dt><dd class="num">${clave}</dd>
    </dl>
    <div class="box">${esc(data.problem)}</div>
  `
  )
}

/* ───────────────────────── impresión ───────────────────────── */

/**
 * Manda un documento a la impresora sin abrir ventana.
 *
 * El iframe es del mismo origen y queda fuera de pantalla; se retira cuando el
 * navegador termina con el diálogo. Un `window.open` en su lugar lo bloquea el
 * navegador en móvil, que era el problema de antes.
 */
export function printHtml(html: string): void {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(frame)

  const limpiar = () => {
    // Un respiro antes de retirarlo: Safari cancela la impresión si el iframe
    // desaparece mientras el diálogo sigue abierto.
    window.setTimeout(() => frame.remove(), 1000)
  }

  frame.onload = () => {
    const win = frame.contentWindow
    if (!win) return limpiar()
    try {
      win.focus()
      win.onafterprint = limpiar
      win.print()
    } catch (err) {
      console.error('No se pudo imprimir:', err)
    }
    // Respaldo por si onafterprint no llega (lo omiten algunos navegadores).
    window.setTimeout(limpiar, 60000)
  }

  const doc = frame.contentDocument
  if (!doc) return limpiar()
  doc.open()
  doc.write(html)
  doc.close()
}

export const printInvoice = (data: InvoiceData, config: PrintConfig) => printHtml(invoiceHtml(data, config))

export async function printServiceOrder(data: ServiceOrderData, config: PrintConfig): Promise<void> {
  let qr = ''
  if (data.trackingUrl) {
    try {
      const QRCode = (await import('qrcode')).default
      qr = await QRCode.toDataURL(data.trackingUrl, { width: 220, margin: 1 })
    } catch (err) {
      console.error('No se pudo generar el QR de seguimiento:', err)
    }
  }
  printHtml(serviceOrderHtml(data, config, qr))
}

export const printDeviceLabel = (data: DeviceLabelData) => printHtml(deviceLabelHtml(data))
