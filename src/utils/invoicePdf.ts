import type { jsPDF as JsPdf } from 'jspdf'
import type { InvoiceData, PrintConfig } from './print'

/**
 * Factura en PDF, generada en el navegador y descargada directamente.
 *
 * Sustituye a `printInvoice`, que abría una ventana emergente y llamaba a
 * `window.print()`. Aquello dependía de que el navegador permitiera popups —en
 * móvil casi nunca— y encima iba precedido de un `confirm()` nativo que bloqueaba
 * la página entera hasta que alguien lo cerrara.
 *
 * Se dibuja con primitivas de jsPDF en vez de convertir HTML: el HTML a PDF exige
 * otra dependencia pesada, y una factura son cuatro bloques de texto y una tabla.
 *
 * Los dos formatos del sistema:
 *   80mm         → rollo térmico, ancho fijo y alto variable según los ítems
 *   half-letter  → media carta, 140×216mm
 *
 * jsPDF entra por import dinámico: son ~400 KB que solo hacen falta al cobrar, y
 * cargarlos siempre empujaba el bundle por encima del límite de precache del PWA.
 */

const money = (n: number) => `$${Number(n || 0).toLocaleString('es-CO')}`

interface Metrics {
  width: number
  margin: number
  fontBase: number
  fontSmall: number
  fontTitle: number
  line: number
}

const METRICS: Record<'80mm' | 'half-letter', Metrics> = {
  '80mm': { width: 80, margin: 4, fontBase: 8, fontSmall: 6.5, fontTitle: 11, line: 3.6 },
  'half-letter': { width: 140, margin: 12, fontBase: 9.5, fontSmall: 8, fontTitle: 14, line: 4.6 },
}

/** Alto estimado para el rollo: crece con los ítems para no cortar la factura. */
function estimateHeight(data: InvoiceData, m: Metrics): number {
  const fixed = 90
  const perItem = m.line * 2.2
  return fixed + data.items.length * perItem + (data.notes ? 20 : 0)
}

export async function buildInvoicePdf(data: InvoiceData, config: PrintConfig): Promise<JsPdf> {
  const { jsPDF } = await import('jspdf')
  const format = config.format === '80mm' ? '80mm' : 'half-letter'
  const m = METRICS[format]

  const doc =
    format === '80mm'
      ? new jsPDF({ unit: 'mm', format: [m.width, estimateHeight(data, m)] })
      : new jsPDF({ unit: 'mm', format: [140, 216] })

  const right = m.width - m.margin
  const usable = m.width - m.margin * 2
  let y = m.margin + 2

  const text = (value: string, x: number, options?: { align?: 'left' | 'center' | 'right'; size?: number; bold?: boolean }) => {
    doc.setFontSize(options?.size ?? m.fontBase)
    doc.setFont('helvetica', options?.bold ? 'bold' : 'normal')
    doc.text(value, x, y, { align: options?.align ?? 'left' })
  }

  const rule = () => {
    doc.setDrawColor(180)
    doc.setLineWidth(0.2)
    doc.line(m.margin, y, right, y)
    y += m.line * 0.9
  }

  /** Parte una cadena larga para que no se salga del ancho útil. */
  const wrap = (value: string, width: number, size: number): string[] => {
    doc.setFontSize(size)
    return doc.splitTextToSize(value || '', width)
  }

  // ── Encabezado ────────────────────────────────────────────────────
  const center = m.width / 2
  text(config.companyName || 'Oryon', center, { align: 'center', size: m.fontTitle, bold: true })
  y += m.line * 1.4

  for (const linea of [
    config.taxId ? `${config.taxIdType || 'NIT'} ${config.taxId}` : '',
    config.companyAddress,
    config.companyPhone,
    config.companyEmail,
  ].filter(Boolean) as string[]) {
    text(linea, center, { align: 'center', size: m.fontSmall })
    y += m.line
  }

  y += m.line * 0.4
  rule()

  // ── Datos de la factura ───────────────────────────────────────────
  text(`Factura ${data.invoiceNumber}`, m.margin, { bold: true })
  y += m.line
  text(data.date, m.margin, { size: m.fontSmall })
  y += m.line

  for (const linea of wrap(`Cliente: ${data.customerName}`, usable, m.fontSmall)) {
    text(linea, m.margin, { size: m.fontSmall })
    y += m.line
  }
  if (data.customerPhone) {
    text(`Tel: ${data.customerPhone}`, m.margin, { size: m.fontSmall })
    y += m.line
  }
  if (data.repairOrderNumber) {
    text(`Orden: ${data.repairOrderNumber}`, m.margin, { size: m.fontSmall })
    y += m.line
  }
  if (data.deviceInfo) {
    for (const linea of wrap(data.deviceInfo, usable, m.fontSmall)) {
      text(linea, m.margin, { size: m.fontSmall })
      y += m.line
    }
  }

  y += m.line * 0.3
  rule()

  // ── Ítems ─────────────────────────────────────────────────────────
  for (const item of data.items) {
    for (const linea of wrap(item.name, usable, m.fontBase)) {
      text(linea, m.margin, {})
      y += m.line
    }
    text(`${item.quantity} x ${money(item.price)}`, m.margin, { size: m.fontSmall })
    text(money(item.total), right, { align: 'right' })
    y += m.line * 1.3
  }

  rule()

  // ── Totales ───────────────────────────────────────────────────────
  const totalRow = (label: string, value: string, bold = false, size?: number) => {
    text(label, m.margin, { bold, size })
    text(value, right, { align: 'right', bold, size })
    y += bold ? m.line * 1.5 : m.line
  }

  if (data.subtotal !== data.total) totalRow('Subtotal', money(data.subtotal))
  if (data.discount) totalRow('Descuento', `-${money(data.discount)}`)
  if (data.tax) totalRow('Impuesto', money(data.tax))
  totalRow('TOTAL', money(data.total), true, m.fontTitle)
  totalRow('Pago', data.paymentMethod)

  // ── Pie ───────────────────────────────────────────────────────────
  if (data.notes) {
    y += m.line * 0.4
    rule()
    for (const linea of wrap(data.notes, usable, m.fontSmall)) {
      text(linea, m.margin, { size: m.fontSmall })
      y += m.line
    }
  }

  for (const linea of [config.warrantyNotes, config.farewellMessage].filter(Boolean) as string[]) {
    y += m.line * 0.4
    for (const parte of wrap(linea, usable, m.fontSmall)) {
      text(parte, center, { align: 'center', size: m.fontSmall })
      y += m.line
    }
  }

  return doc
}

/** Nombre de archivo estable y ordenable. */
export function invoiceFileName(data: InvoiceData): string {
  return `${data.invoiceNumber || 'factura'}.pdf`.replace(/[^\w.\-]+/g, '-')
}

/**
 * Descarga la factura. Sin ventanas emergentes ni diálogo del navegador: el
 * archivo cae en Descargas y el usuario decide si lo imprime.
 */
export async function downloadInvoicePdf(data: InvoiceData, config: PrintConfig): Promise<void> {
  const doc = await buildInvoicePdf(data, config)
  doc.save(invoiceFileName(data))
}
