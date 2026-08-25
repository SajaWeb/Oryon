/**
 * Branch Selector Component
 * Reusable component for selecting a branch with validation
 */

import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import type { Branch } from './types'

interface BranchSelectorProps {
  value: string
  onChange: (value: string) => void
  branches: Branch[]
  required?: boolean
  label?: string
  helperText?: string
  disabled?: boolean
}

export function BranchSelector({
  value,
  onChange,
  branches,
  required = true,
  label = 'Sucursal',
  helperText = 'Los productos se asignan a una sucursal específica',
  disabled = false
}: BranchSelectorProps) {
  return (
    <div>
      <Label htmlFor="branchId">
        {label} {required && <span className="text-danger">*</span>}
      </Label>
      <Select
        value={value}
        onValueChange={onChange}
        required={required}
        disabled={disabled || branches.length === 0}
      >
        <SelectTrigger id="branchId">
          <SelectValue placeholder={branches.length > 0 ? 'Selecciona una sucursal' : 'No hay sucursales disponibles'} />
        </SelectTrigger>
        <SelectContent>
          {branches.map((branch) => (
            <SelectItem key={branch.id} value={branch.id}>
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {helperText && (
        <p className="text-xs text-ink-tertiary mt-1">
          {helperText}
        </p>
      )}
      {branches.length === 0 && (
        <p className="text-xs text-danger mt-1">
          ⚠️ No tienes sucursales creadas. Crea una sucursal primero.
        </p>
      )}
    </div>
  )
}
