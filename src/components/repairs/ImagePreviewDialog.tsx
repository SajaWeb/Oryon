import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'

interface ImagePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  image: string | null
}

export function ImagePreviewDialog({
  open,
  onOpenChange,
  image
}: ImagePreviewDialogProps) {
  if (!image) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Vista Previa de Imagen</DialogTitle>
          <DialogDescription>Visualización de imagen en tamaño completo</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center">
          <img 
            src={image} 
            alt="Preview" 
            className="max-w-full max-h-[70vh] object-contain rounded"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
