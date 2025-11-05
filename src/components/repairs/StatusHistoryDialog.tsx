import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import { Repair } from './types'
import { statusLabels, statusColors } from './constants'

interface StatusHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  repair: Repair | null
  onImageClick: (image: string) => void
}

export function StatusHistoryDialog({
  open,
  onOpenChange,
  repair,
  onImageClick
}: StatusHistoryDialogProps) {
  if (!repair) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] w-[95vw] sm:w-full p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Historial de Cambios - Orden #{repair.id}</DialogTitle>
          <DialogDescription className="text-sm">Trazabilidad completa de todos los cambios de estado</DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[500px] sm:h-[600px] pr-2 sm:pr-4">
          {repair.statusLogs && repair.statusLogs.length > 0 ? (
            <div className="space-y-4">
              {repair.statusLogs.map((log, idx) => (
                <Card key={idx}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">
                          {log.previousStatus ? (
                            <>
                              <Badge className={`${statusColors[log.previousStatus]} mr-2`}>
                                {statusLabels[log.previousStatus]}
                              </Badge>
                              →
                              <Badge className={`${statusColors[log.newStatus]} ml-2`}>
                                {statusLabels[log.newStatus]}
                              </Badge>
                            </>
                          ) : (
                            <Badge className={statusColors[log.newStatus]}>
                              {statusLabels[log.newStatus]}
                            </Badge>
                          )}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(log.timestamp).toLocaleString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <Badge variant="outline">{log.userName}</Badge>
                    </div>
                  </CardHeader>
                  {(log.notes || (log.images && log.images.length > 0)) && (
                    <CardContent>
                      {log.notes && (
                        <p className="text-xs sm:text-sm mb-3">{log.notes}</p>
                      )}
                      {log.images && log.images.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {log.images.map((img, imgIdx) => (
                            <img 
                              key={imgIdx}
                              src={img} 
                              alt={`Log ${idx + 1} Image ${imgIdx + 1}`}
                              className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80 active:opacity-70 transition-opacity"
                              onClick={() => onImageClick(img)}
                            />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No hay historial de cambios disponible
            </p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
