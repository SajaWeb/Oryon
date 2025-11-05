import { useState } from 'react'
import { Upload, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Badge } from '../ui/badge'
import { Repair } from './types'
import { statusLabels, statusColors } from './constants'

interface StatusChangeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  repair: Repair | null
  onSubmit: (newStatus: string, notes: string, images: string[]) => Promise<void>
}

export function StatusChangeDialog({
  open,
  onOpenChange,
  repair,
  onSubmit
}: StatusChangeDialogProps) {
  const [newStatus, setNewStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setImages(prev => [...prev, base64String])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!newStatus) return
    
    setSubmitting(true)
    try {
      await onSubmit(newStatus, notes, images)
      // Reset form
      setNewStatus('')
      setNotes('')
      setImages([])
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  if (!repair) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Cambiar Estado - Orden #{repair.id}</DialogTitle>
          <DialogDescription className="text-sm">Actualiza el estado de la reparación y agrega notas o imágenes</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Estado Actual</Label>
            <p className="mt-1">
              <Badge className={statusColors[repair.status]}>
                {statusLabels[repair.status]}
              </Badge>
            </p>
          </div>

          <div>
            <Label htmlFor="newStatus">Nuevo Estado</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecciona un estado" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="statusNotes">Notas del Cambio</Label>
            <Textarea
              id="statusNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe los cambios, acciones realizadas, etc."
              rows={3}
              className="mt-2"
            />
          </div>

          <div>
            <Label className="text-sm sm:text-base">Imágenes Adicionales</Label>
            <div className="mt-2">
              <label htmlFor="status-image-upload" className="cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 text-center hover:border-gray-400 transition-colors active:bg-gray-50">
                  <Upload className="mx-auto mb-2 text-gray-400" size={24} />
                  <p className="text-sm text-gray-600">Toca para subir imágenes</p>
                </div>
              </label>
              <input
                id="status-image-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
                capture="environment"
              />
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img 
                      src={img} 
                      alt={`Status ${idx + 1}`} 
                      className="w-full h-20 object-cover rounded cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-md"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1 order-2 sm:order-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!newStatus || submitting}
              className="flex-1 order-1 sm:order-2"
            >
              {submitting ? (images.length > 0 ? 'Subiendo imágenes...' : 'Guardando...') : 'Guardar Cambio'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
