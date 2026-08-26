/**
 * Product Transaction History Component
 * Displays a history of all product transactions with filtering and search
 */

import { useState, useEffect } from 'react'
import { History, Search, Filter, Calendar, User, Package, ArrowRight, FileText } from 'lucide-react'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { ScrollArea } from '../ui/scroll-area'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import type { ProductTransaction, Branch } from './types'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Loading } from '../oryon'

interface ProductTransactionHistoryProps {
  transactions: ProductTransaction[]
  branches: Branch[]
  isLoading?: boolean
}

const actionLabels: Record<ProductTransaction['action'], { label: string; color: string; icon: string }> = {
  create: { label: 'Producto Creado', color: 'bg-[var(--success-subtle)] text-success', icon: '➕' },
  edit: { label: 'Producto Editado', color: 'bg-[var(--accent-subtle)] text-primary', icon: '✏️' },
  adjust_inventory: { label: 'Ajuste de Inventario', color: 'bg-[color-mix(in_srgb,var(--state-diagnosis)_12%,transparent)] text-[var(--state-diagnosis)]', icon: '📊' },
  transfer: { label: 'Traslado', color: 'bg-[color-mix(in_srgb,var(--state-waiting)_12%,transparent)] text-[var(--state-waiting)]', icon: '🔄' },
  add_unit: { label: 'Unidad Agregada', color: 'bg-[var(--accent-subtle)] text-primary', icon: '📱' },
  add_variant: { label: 'Variante Agregada', color: 'bg-[color-mix(in_srgb,var(--state-diagnosis)_12%,transparent)] text-[var(--state-diagnosis)]', icon: '🎨' },
  update_variant: { label: 'Variante Actualizada', color: 'bg-[var(--accent-subtle)] text-primary', icon: '🔄' },
  delete: { label: 'Producto Eliminado', color: 'bg-[var(--danger-subtle)] text-danger', icon: '🗑️' },
  delete_unit: { label: 'Unidad Eliminada', color: 'bg-[var(--danger-subtle)] text-danger', icon: '❌' },
  delete_variant: { label: 'Variante Eliminada', color: 'bg-[var(--danger-subtle)] text-danger', icon: '❌' }
}

export function ProductTransactionHistory({ 
  transactions, 
  branches,
  isLoading = false 
}: ProductTransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [branchFilter, setBranchFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState<string>('all')

  // Get unique users from transactions
  const uniqueUsers = Array.from(new Set(transactions.map(t => JSON.stringify({ name: t.userName, role: t.userRole }))))
    .map(str => JSON.parse(str))

  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.userName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesAction = actionFilter === 'all' || transaction.action === actionFilter
    const matchesBranch = branchFilter === 'all' || transaction.branchId === branchFilter
    const matchesUser = userFilter === 'all' || transaction.userName === userFilter

    return matchesSearch && matchesAction && matchesBranch && matchesUser
  })

  if (isLoading) {
    return <Loading minHeight={256} width={88} label="Cargando historial" />
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="lg:col-span-2">
          <Label htmlFor="search">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-tertiary" size={16} />
            <Input
              id="search"
              placeholder="Buscar por producto, usuario o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Action Filter */}
        <div>
          <Label htmlFor="action-filter">Tipo de Acción</Label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger id="action-filter">
              <SelectValue placeholder="Todas las acciones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las acciones</SelectItem>
              <SelectItem value="create">Creación</SelectItem>
              <SelectItem value="edit">Edición</SelectItem>
              <SelectItem value="adjust_inventory">Ajustes</SelectItem>
              <SelectItem value="transfer">Traslados</SelectItem>
              <SelectItem value="add_unit">Unidades</SelectItem>
              <SelectItem value="add_variant">Variantes</SelectItem>
              <SelectItem value="delete">Eliminaciones</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Branch Filter */}
        <div>
          <Label htmlFor="branch-filter">Sucursal</Label>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger id="branch-filter">
              <SelectValue placeholder="Todas las sucursales" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sucursales</SelectItem>
              {branches.map(branch => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* User Filter */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="user-filter">Usuario</Label>
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger id="user-filter">
              <SelectValue placeholder="Todos los usuarios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los usuarios</SelectItem>
              {uniqueUsers.map((user, index) => (
                <SelectItem key={index} value={user.name}>
                  {user.name} ({user.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <p className="text-sm text-ink-secondary">
            Mostrando {filteredTransactions.length} de {transactions.length} transacciones
          </p>
        </div>
      </div>

      <Separator />

      {/* Transactions List */}
      <ScrollArea className="h-[500px] pr-4">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <History className="mx-auto h-12 w-12 text-ink-tertiary mb-4" />
            <h3 className="text-lg font-medium text-ink mb-2">
              No hay transacciones
            </h3>
            <p className="text-ink-tertiary">
              {searchTerm || actionFilter !== 'all' || branchFilter !== 'all' || userFilter !== 'all'
                ? 'No se encontraron transacciones con los filtros aplicados'
                : 'Aún no hay transacciones registradas'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.map((transaction) => {
              const actionInfo = actionLabels[transaction.action]
              
              return (
                <div
                  key={transaction.id}
                  className="border rounded-lg p-4 bg-surface-raised hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Header */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-2xl">{actionInfo.icon}</span>
                        <Badge className={actionInfo.color}>
                          {actionInfo.label}
                        </Badge>
                        <span className="font-medium text-ink">
                          {transaction.productName}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-ink-secondary">
                        {transaction.description}
                      </p>

                      {/* Details */}
                      {transaction.details && (
                        <div className="bg-sunken rounded p-2 text-sm text-ink-secondary">
                          <FileText size={14} className="inline mr-1" />
                          {transaction.details}
                        </div>
                      )}

                      {/* Transfer info */}
                      {transaction.action === 'transfer' && transaction.targetBranchName && (
                        <div className="flex items-center gap-2 text-sm text-ink-secondary">
                          <span>{transaction.branchName}</span>
                          <ArrowRight size={14} />
                          <span className="font-medium">{transaction.targetBranchName}</span>
                        </div>
                      )}

                      {/* Meta info */}
                      <div className="flex items-center gap-4 text-xs text-ink-tertiary flex-wrap">
                        <div className="flex items-center gap-1">
                          <User size={12} />
                          <span>{transaction.userName}</span>
                          <Badge variant="outline" className="ml-1 text-xs">
                            {transaction.userRole}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Package size={12} />
                          <span>{transaction.branchName || 'Sin sucursal'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          <span>
                            {formatDistanceToNow(new Date(transaction.timestamp), {
                              addSuffix: true,
                              locale: es
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quantity badge (if applicable) */}
                    {transaction.quantity !== undefined && transaction.quantity !== null && (
                      <div className="flex-shrink-0">
                        <Badge variant="secondary" className="text-lg px-3 py-1">
                          {transaction.quantity > 0 ? '+' : ''}{transaction.quantity}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
