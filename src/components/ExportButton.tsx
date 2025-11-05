import { useState } from 'react'
import { Download, FileText, FileSpreadsheet } from 'lucide-react'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { exportToPDF, exportToExcel, ExportColumn } from '../utils/export'
import { toast } from 'sonner@2.0.3'

interface ExportButtonProps {
  title: string
  subtitle?: string
  filename: string
  columns: ExportColumn[]
  data: any[]
  companyName?: string
  orientation?: 'portrait' | 'landscape'
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function ExportButton({
  title,
  subtitle,
  filename,
  columns,
  data,
  companyName,
  orientation,
  variant = 'outline',
  size = 'default'
}: ExportButtonProps) {
  const [exporting, setExporting] = useState(false)

  const handleExportPDF = async () => {
    try {
      setExporting(true)
      toast.loading('Generando PDF...', { id: 'export-pdf' })
      
      // Small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 300))
      
      exportToPDF({
        title,
        subtitle,
        filename,
        columns,
        data,
        companyName,
        orientation
      })
      
      toast.success('PDF generado exitosamente', { id: 'export-pdf' })
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      toast.error('Error al generar el PDF', { id: 'export-pdf' })
    } finally {
      setExporting(false)
    }
  }

  const handleExportExcel = async () => {
    try {
      setExporting(true)
      toast.loading('Generando Excel...', { id: 'export-excel' })
      
      // Small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 300))
      
      exportToExcel({
        title,
        subtitle,
        filename,
        columns,
        data,
        companyName
      })
      
      toast.success('Excel generado exitosamente', { id: 'export-excel' })
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      toast.error('Error al generar el Excel', { id: 'export-excel' })
    } finally {
      setExporting(false)
    }
  }

  if (data.length === 0) {
    return (
      <Button variant={variant} size={size} disabled>
        <Download className="h-4 w-4 mr-2" />
        Exportar
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={exporting}>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
          <FileText className="mr-2 h-4 w-4 text-red-600" />
          <span>Exportar a PDF</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
          <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
          <span>Exportar a Excel</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
