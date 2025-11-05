/**
 * Units Management Component
 * Manages individual units with IMEI/Serial numbers
 */

import { useState } from 'react'
import { Plus, List, Trash2 } from 'lucide-react'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { UNIT_STATUS } from './constants'
import { parseBulkUnitsInput } from './utils'
import type { Product, UnitFormData } from './types'

interface UnitsManagementProps {
  product: Product
  onAddUnit: (data: UnitFormData) => Promise<void>
  onAddBulkUnits: (units: Array<{ imei?: string; serialNumber?: string }>) => Promise<void>
  onDeleteUnit: (unitId: number) => Promise<void>
  isLoading?: boolean
  canEdit?: boolean
}

export function UnitsManagement({
  product,
  onAddUnit,
  onAddBulkUnits,
  onDeleteUnit,
  isLoading = false,
  canEdit = true
}: UnitsManagementProps) {
  const [unitForm, setUnitForm] = useState<UnitFormData>({
    imei: '',
    serialNumber: ''
  })

  const [bulkUnits, setBulkUnits] = useState('')

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!unitForm.imei && !unitForm.serialNumber) {
      alert('Debes ingresar al menos IMEI o Número de Serie')
      return
    }

    await onAddUnit(unitForm)
    setUnitForm({ imei: '', serialNumber: '' })
  }

  const handleBulkAdd = async () => {
    if (!bulkUnits.trim()) {
      alert('Ingresa al menos una unidad')
      return
    }

    const units = parseBulkUnitsInput(bulkUnits)
    
    if (units.length === 0) {
      alert('No se encontraron unidades válidas')
      return
    }

    await onAddBulkUnits(units)
    setBulkUnits('')
  }

  const handleDeleteUnit = async (unitId: number) => {
    if (!confirm('¿Estás seguro de eliminar esta unidad?')) return
    await onDeleteUnit(unitId)
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Permission Notice for Read-Only Mode */}
      {!canEdit && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 md:p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            ⚠️ <strong>Solo lectura:</strong> Solo puedes agregar o eliminar unidades de productos de tu sucursal asignada.
          </p>
        </div>
      )}

      {/* Add Single Unit */}
      {canEdit && (
        <div className="border rounded-lg p-3 md:p-4">
        <h4 className="mb-3 text-sm md:text-base">Agregar Unidad Individual</h4>
        <form onSubmit={handleAddUnit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div>
              <Label htmlFor="unit-imei">IMEI</Label>
              <Input
                id="unit-imei"
                value={unitForm.imei}
                onChange={(e) => setUnitForm({ ...unitForm, imei: e.target.value })}
                placeholder="356938035643809"
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="unit-serial">Número de Serie</Label>
              <Input
                id="unit-serial"
                value={unitForm.serialNumber}
                onChange={(e) => setUnitForm({ ...unitForm, serialNumber: e.target.value })}
                placeholder="SN123456789"
                disabled={isLoading}
              />
            </div>
          </div>
          <Button type="submit" size="sm" disabled={isLoading}>
            <Plus size={16} className="mr-2" />
            Agregar Unidad
          </Button>
        </form>
        </div>
      )}

      {/* Bulk Add Units */}
      {canEdit && (
        <div className="border rounded-lg p-3 md:p-4">
        <h4 className="mb-3 text-sm md:text-base">Agregar Múltiples Unidades</h4>
        <div className="space-y-3">
          <div>
            <Label htmlFor="bulk-units" className="text-sm">
              Una unidad por línea (IMEI, Serial)
            </Label>
            <Textarea
              id="bulk-units"
              value={bulkUnits}
              onChange={(e) => setBulkUnits(e.target.value)}
              placeholder={`356938035643809, SN001\n356938035643810, SN002\n356938035643811, SN003`}
              rows={5}
              className="text-sm font-mono"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Formato: IMEI, NumeroSerie (uno por línea). Puedes omitir cualquiera de los dos.
            </p>
          </div>
          <Button 
            onClick={handleBulkAdd} 
            size="sm" 
            disabled={!bulkUnits.trim() || isLoading}
          >
            <List size={16} className="mr-2" />
            Agregar Unidades en Lote
          </Button>
        </div>
        </div>
      )}

      {/* Units List */}
      <div>
        <h4 className="mb-3 text-sm md:text-base">
          Unidades Registradas ({product.units?.length || 0})
        </h4>
        {product.units && product.units.length > 0 ? (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs md:text-sm">IMEI</TableHead>
                  <TableHead className="text-xs md:text-sm">Serial</TableHead>
                  <TableHead className="text-xs md:text-sm">Estado</TableHead>
                  <TableHead className="text-right text-xs md:text-sm">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.units.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-mono text-xs md:text-sm">
                      {unit.imei || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs md:text-sm">
                      {unit.serialNumber || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          unit.status === 'available' ? 'default' :
                          unit.status === 'sold' ? 'secondary' :
                          'outline'
                        }
                        className="text-xs"
                      >
                        {UNIT_STATUS[unit.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {unit.status === 'available' && canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeleteUnit(unit.id)}
                          disabled={isLoading}
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 border rounded-lg text-sm">
            No hay unidades registradas. Agrega la primera unidad arriba.
          </div>
        )}
      </div>

      {/* Stock Summary */}
      {product.units && product.units.length > 0 && (
        <div className="border-t pt-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-xl">{product.units.length}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
              <p className="text-xs text-green-600 dark:text-green-400">Disponibles</p>
              <p className="text-xl text-green-600">
                {product.units.filter(u => u.status === 'available').length}
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
              <p className="text-xs text-blue-600 dark:text-blue-400">Vendidos</p>
              <p className="text-xl text-blue-600">
                {product.units.filter(u => u.status === 'sold').length}
              </p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg">
              <p className="text-xs text-yellow-600 dark:text-yellow-400">En Reparación</p>
              <p className="text-xl text-yellow-600">
                {product.units.filter(u => u.status === 'in_repair').length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
