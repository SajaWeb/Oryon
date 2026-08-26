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
  /**
   * Ancho físico del documento, fijado en el `body`.
   *
   * No es redundante con `@page size`. Si la impresora resuelve a carta —porque es
   * la única que hay, o porque el usuario la elige en el diálogo—, un documento sin
   * ancho propio se estira a los 216 mm de la hoja y el ticket sale deformado. Con
   * el ancho puesto aquí, los 80 mm son 80 mm salga en el rollo o en una esquina de
   * la hoja carta.
   */
  width: string
  padding: string
  /** Escala tipográfica en px; los rollos necesitan cuerpos más pequeños. */
  base: number
  small: number
  title: number
  total: number
  /**
   * Tinta del texto secundario.
   *
   * Las térmicas son de un bit: no imprimen gris, lo tramas. Un #444 a 8 px sale
   * moteado y sucio, que es justo lo que hace que un tique parezca casero. En rollo
   * todo va en negro y la jerarquía la marcan el cuerpo, la versalita y el peso.
   */
  muted: string
  /** Regla secundaria. Punteada en láser; sólida y negra en térmica. */
  ruleSoft: string
  /** El rollo no admite dos columnas. */
  columns: boolean
}

export const FORMATS: Record<PrintFormat, FormatSpec> = {
  '55mm': {
    label: 'Rollo térmico 55 mm',
    page: '55mm auto',
    width: '55mm',
    padding: '3mm',
    base: 9,
    small: 8,
    title: 12,
    total: 14,
    muted: '#000',
    ruleSoft: '1px solid #000',
    columns: false,
  },
  '80mm': {
    label: 'Rollo térmico 80 mm',
    page: '80mm auto',
    width: '80mm',
    padding: '4mm',
    base: 10,
    small: 9,
    title: 14,
    total: 17,
    muted: '#000',
    ruleSoft: '1px solid #000',
    columns: false,
  },
  carta: {
    label: 'Hoja carta',
    page: 'letter',
    // En carta el ancho sí lo pone la hoja: el documento ocupa el papel que haya.
    width: 'auto',
    padding: '14mm',
    base: 11,
    small: 9.5,
    title: 19,
    total: 22,
    muted: '#444',
    ruleSoft: '1px dashed #888',
    columns: true,
  },
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
  const rollo = !f.columns
  return `
    @page { size: ${f.page}; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body {
      font-family: ${FONT_STACK};
      font-size: ${f.base}px;
      line-height: 1.38;
      color: #000;
      width: ${f.width};
      padding: ${f.padding};
    }
    /* Repetido a propósito dentro de @media print: es la regla que impide que el
       documento se estire cuando la impresora resuelve a un papel más ancho. */
    @media print { body { width: ${f.width}; } }

    .doc { width: 100%; }
    /* Un nombre de producto largo no puede desbordar 72 mm de rollo. */
    .doc, td, dd { overflow-wrap: anywhere; }

    h1 { font-size: ${f.title}px; font-weight: 700; margin: 0 0 2px; letter-spacing: -0.01em; }
    h2 {
      font-size: ${f.small}px;
      font-weight: 700;
      margin: 0 0 3px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .muted { color: ${f.muted}; font-size: ${f.small}px; }
    .center { text-align: center; }
    .right { text-align: right; }

    .rule { border: 0; border-top: 1px solid #000; margin: 5px 0; }
    .rule-soft { border: 0; border-top: ${f.ruleSoft}; margin: 5px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    .block { margin-bottom: 7px; }

    /* Banda de identificación: qué documento es y cuál, antes que nada. */
    .docband {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: ${rollo ? '3px 0' : '5px 0'};
      margin-bottom: 6px;
    }
    .docband .kind {
      font-size: ${f.small}px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .docband .no { font-size: ${f.title - (rollo ? 2 : 4)}px; font-weight: 700; }

    table { width: 100%; border-collapse: collapse; }
    th {
      font-size: ${f.small}px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      text-align: left;
      padding: 3px 0;
      border-bottom: 1px solid #000;
      /* Un encabezado partido en dos líneas ("CA / NT.") desalinea la columna. */
      white-space: nowrap;
    }
    td { padding: ${rollo ? '3px 0' : '4px 0'}; vertical-align: top; }
    tbody tr + tr td { border-top: ${rollo ? '0' : '1px solid #ddd'}; }
    /* Una fila no se parte entre dos hojas. */
    tr { break-inside: avoid; page-break-inside: avoid; }
    /* Los dígitos de esta pila ya son de ancho fijo: las cifras alinean solas. */
    .num { font-variant-numeric: tabular-nums; white-space: nowrap; }

    /* Bloque de totales: el importe a pagar es lo que se busca de un vistazo. */
    .totals { margin-top: 5px; }
    .totals .row { padding: 1px 0; }
    .grand {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      border-top: 2px solid #000;
      margin-top: 3px;
      padding-top: 4px;
      font-size: ${f.total}px;
      font-weight: 700;
    }
    .grand .label { font-size: ${f.base}px; text-transform: uppercase; letter-spacing: 0.08em; }

    .kv { display: grid; grid-template-columns: auto 1fr; gap: 1px 8px; }
    .kv dt { color: ${f.muted}; font-size: ${f.small}px; }
    .kv dd { margin: 0; }
    .box { border: 1px solid #000; padding: 5px 6px; margin: 5px 0; }
    .box .label {
      font-size: ${f.small}px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 2px;
    }
    .logo { max-width: ${f.columns ? '160px' : '40mm'}; max-height: 16mm; display: block; margin: 0 auto 4px; }
    .qr { display: block; margin: 4px auto 2px; width: ${f.columns ? '110px' : '26mm'}; }
    .sign { margin-top: ${f.columns ? '18mm' : '9mm'}; break-inside: avoid; }
    .sign-line { border-top: 1px solid #000; padding-top: 3px; font-size: ${f.small}px; }
    ${f.columns ? '.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; align-items: start; }' : '.cols { display: block; }'}
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

/**
 * Banda de identificación del documento.
 *
 * Antes el tipo y el número iban como un `<strong>` suelto en una fila, con el
 * mismo peso visual que la fecha. En un mostrador lo primero que se busca es qué
 * papel es y cuál: eso va enmarcado y con jerarquía propia.
 */
function docBand(kind: string, number: string, date: string): string {
  return `
    <div class="docband">
      <div>
        <div class="kind">${esc(kind)}</div>
        <div class="no num">${esc(number)}</div>
      </div>
      <div class="muted num right">${esc(date)}</div>
    </div>`
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

  /* En carta hay sitio para desglosar cantidad y valor unitario en columnas; en
     rollo no, así que van bajo el nombre. Es el mismo dato, no dos documentos. */
  const tabla = f.columns
    ? `
      <table>
        <thead>
          <tr>
            <th>Detalle</th>
            <th class="right">Cant.</th>
            <th class="right">V. unitario</th>
            <th class="right">Importe</th>
          </tr>
        </thead>
        <tbody>
          ${data.items
            .map(
              (item) => `
          <tr>
            <td>${esc(item.name)}</td>
            <td class="right num">${item.quantity}</td>
            <td class="right num">${money(item.price)}</td>
            <td class="right num">${money(item.total)}</td>
          </tr>`
            )
            .join('')}
        </tbody>
      </table>`
    : `
      <table>
        <thead><tr><th>Detalle</th><th class="right">Importe</th></tr></thead>
        <tbody>
          ${data.items
            .map(
              (item) => `
          <tr>
            <td>${esc(item.name)}<div class="muted num">${item.quantity} × ${money(item.price)}</div></td>
            <td class="right num">${money(item.total)}</td>
          </tr>`
            )
            .join('')}
        </tbody>
      </table>`

  const totales = [
    data.subtotal !== data.total ? ['Subtotal', money(data.subtotal)] : null,
    data.discount ? ['Descuento', `-${money(data.discount)}`] : null,
    data.tax ? ['Impuesto', money(data.tax)] : null,
  ].filter(Boolean) as string[][]

  const referencias = [
    data.repairOrderNumber ? `<dt>Orden</dt><dd class="num">${esc(data.repairOrderNumber)}</dd>` : '',
    data.deviceInfo ? `<dt>Equipo</dt><dd>${esc(data.deviceInfo)}</dd>` : '',
    data.technicianName ? `<dt>Técnico</dt><dd>${esc(data.technicianName)}</dd>` : '',
  ].join('')

  return shell(
    `Factura ${data.invoiceNumber}`,
    f,
    `
    ${header(config, f)}
    ${docBand('Factura de venta', data.invoiceNumber, data.date)}
    <div class="block">
      <dl class="kv">
        <dt>Cliente</dt><dd>${esc(data.customerName)}</dd>
        ${data.customerPhone ? `<dt>Teléfono</dt><dd class="num">${esc(data.customerPhone)}</dd>` : ''}
        ${data.customerEmail ? `<dt>Correo</dt><dd>${esc(data.customerEmail)}</dd>` : ''}
        ${referencias}
      </dl>
    </div>
    ${tabla}
    <div class="totals">
      ${totales.map(([k, v]) => `<div class="row"><span class="muted">${k}</span><span class="num">${v}</span></div>`).join('')}
      <div class="grand"><span class="label">Total</span><span class="num">${money(data.total)}</span></div>
      <div class="row"><span class="muted">Forma de pago</span><span>${esc(data.paymentMethod)}</span></div>
    </div>
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
        <div class="label">Falla reportada</div>
        <div>${esc(data.problem)}</div>
      </div>
      ${data.observations ? `<div class="muted">${esc(data.observations)}</div>` : ''}
      ${
        data.estimatedCost != null
          ? `<div class="grand"><span class="label">Costo estimado</span><span class="num">${money(data.estimatedCost)}</span></div>
             <div class="muted">Valor aproximado. No es una factura; el importe final se confirma al entregar.</div>`
          : ''
      }
    </div>`

  return shell(
    `Orden ${data.orderNumber}`,
    f,
    `
    ${header(config, f)}
    ${docBand('Orden de trabajo', data.orderNumber, data.date)}
    <div class="block">
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
      <div class="kind" style="font-size:${f.small}px;font-weight:700;text-transform:uppercase;letter-spacing:.1em">Orden</div>
      <div class="num" style="font-size:${f.title + 10}px;font-weight:700;line-height:1.05">${esc(data.orderNumber)}</div>
    </div>
    <hr class="rule">
    <dl class="kv">
      <dt>Cliente</dt><dd>${esc(data.customerName)}</dd>
      <dt>Teléfono</dt><dd class="num">${esc(data.customerPhone)}</dd>
      <dt>Clave</dt><dd class="num">${clave}</dd>
    </dl>
    <div class="box">
      <div class="label">Falla</div>
      <div>${esc(data.problem)}</div>
    </div>
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
