// Export utilities for PDF and Excel
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

export interface ExportColumn {
  header: string
  dataKey: string
  width?: number
}

export interface ExportOptions {
  title: string
  subtitle?: string
  filename: string
  columns: ExportColumn[]
  data: any[]
  companyName?: string
  orientation?: 'portrait' | 'landscape'
}

// Export to PDF
export function exportToPDF(options: ExportOptions) {
  const { title, subtitle, filename, columns, data, companyName, orientation = 'portrait' } = options

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'letter'
  })

  // Add company header
  doc.setFontSize(20)
  doc.text(companyName || 'Oryon App', 14, 15)

  // Add title
  doc.setFontSize(16)
  doc.text(title, 14, 25)

  // Add subtitle
  if (subtitle) {
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(subtitle, 14, 32)
    doc.setTextColor(0)
  }

  // Add date
  doc.setFontSize(8)
  doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 14, subtitle ? 38 : 32)

  // Prepare table columns
  const tableColumns = columns.map(col => ({
    header: col.header,
    dataKey: col.dataKey
  }))

  // Add table
  doc.autoTable({
    startY: subtitle ? 42 : 36,
    head: [tableColumns.map(col => col.header)],
    body: data.map(row => 
      tableColumns.map(col => {
        const value = row[col.dataKey]
        if (value === null || value === undefined) return ''
        if (typeof value === 'number') {
          return value.toLocaleString('es-CO')
        }
        return String(value)
      })
    ),
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    margin: { top: 10 }
  })

  // Add footer with page numbers
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
  }

  // Save PDF
  doc.save(`${filename}.pdf`)
}

// Export to Excel (CSV format)
export function exportToExcel(options: ExportOptions) {
  const { title, filename, columns, data } = options

  // Create CSV content
  const headers = columns.map(col => col.header).join(',')
  const rows = data.map(row => 
    columns.map(col => {
      let value = row[col.dataKey]
      if (value === null || value === undefined) value = ''
      
      // Escape commas and quotes
      if (typeof value === 'string') {
        value = value.replace(/"/g, '""')
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value}"`
        }
      }
      
      return value
    }).join(',')
  )

  const csv = [headers, ...rows].join('\n')

  // Add BOM for proper Excel UTF-8 encoding
  const BOM = '\uFEFF'
  const csvContent = BOM + csv

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

// Format currency for exports
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

// Format date for exports
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// Format datetime for exports
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
