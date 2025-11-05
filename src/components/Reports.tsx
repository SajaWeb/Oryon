import { useEffect, useState } from 'react'
import { projectId } from '../utils/supabase/info'
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Activity, 
  Users, 
  Clock, 
  AlertTriangle,
  PhoneCall,
  Gift,
  CreditCard,
  DollarSign,
  Calendar,
  Percent,
  Wrench,
  PiggyBank,
  ArrowUpCircle,
  ArrowDownCircle,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ExportButton } from './ExportButton'
import { formatCurrency, formatDate, formatDateTime } from '../utils/export'

interface ReportsProps {
  accessToken: string
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

const statusLabels: Record<string, string> = {
  received: 'Recibido',
  diagnosing: 'En Diagnóstico',
  waiting_parts: 'Esperando Repuestos',
  repairing: 'En Reparación',
  completed: 'Completado',
  delivered: 'Entregado',
  cancelled: 'Cancelado'
}

export function Reports({ accessToken }: ReportsProps) {
  const [loading, setLoading] = useState(true)
  const [salesByDay, setSalesByDay] = useState<any[]>([])
  const [repairsByStatus, setRepairsByStatus] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [lowRotationProducts, setLowRotationProducts] = useState<any[]>([])
  const [readyRepairs, setReadyRepairs] = useState<any[]>([])
  const [avgRepairTime, setAvgRepairTime] = useState(0)
  const [commonRepairTypes, setCommonRepairTypes] = useState<any[]>([])
  const [topCustomers, setTopCustomers] = useState<any[]>([])
  const [inactiveCustomers, setInactiveCustomers] = useState<any[]>([])
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [monthlyComparison, setMonthlyComparison] = useState<any>(null)
  const [profitData, setProfitData] = useState<any>(null)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/reports`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
      const data = await response.json()
      
      if (data.success) {
        // Transform sales by day (show last 7 days for the chart)
        const salesEntries = Object.entries(data.reports.salesByDay)
        const last7Days = salesEntries.slice(-7)
        const salesData = last7Days.map(([date, values]: [string, any]) => ({
          date: new Date(date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
          ventas: values.count,
          ingresos: values.revenue,
          ganancia: values.profit
        }))
        setSalesByDay(salesData)

        // Transform repairs by status
        const repairsData = Object.entries(data.reports.repairsByStatus).map(([status, count]: [string, any]) => ({
          name: statusLabels[status] || status,
          value: count
        }))
        setRepairsByStatus(repairsData)

        // Payment methods
        const paymentData = Object.entries(data.reports.paymentMethods).map(([method, count]: [string, any]) => ({
          name: method,
          value: count
        }))
        setPaymentMethods(paymentData)

        setTopProducts(data.reports.topProducts)
        setLowRotationProducts(data.reports.lowRotationProducts)
        setReadyRepairs(data.reports.readyRepairs)
        setAvgRepairTime(data.reports.avgRepairTime)
        setCommonRepairTypes(data.reports.commonRepairTypes)
        setTopCustomers(data.reports.topCustomers)
        setInactiveCustomers(data.reports.inactiveCustomers)
        setMonthlyComparison(data.reports.monthlyComparison)

        // Calculate profit metrics
        const totalRevenue = Object.values(data.reports.salesByDay).reduce((sum: number, day: any) => sum + day.revenue, 0)
        const totalCost = Object.values(data.reports.salesByDay).reduce((sum: number, day: any) => sum + (day.revenue - day.profit), 0)
        const totalProfit = totalRevenue - totalCost
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

        setProfitData({
          totalRevenue,
          totalCost,
          totalProfit,
          profitMargin
        })
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-4 sm:p-8">Cargando reportes...</div>
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-4 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl mb-1 sm:mb-2">Reportes y Análisis</h2>
        <p className="text-sm sm:text-base text-gray-600">Insights para tomar mejores decisiones de negocio</p>
      </div>

      {/* Monthly Comparison */}
      {monthlyComparison && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar size={16} className="text-blue-600" />
                Este Mes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl sm:text-3xl">${monthlyComparison.thisMonth.revenue.toFixed(0)}</div>
              <p className="text-xs sm:text-sm text-gray-600">{monthlyComparison.thisMonth.count} ventas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar size={16} className="text-gray-600" />
                Mes Anterior
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl sm:text-3xl">${monthlyComparison.lastMonth.revenue.toFixed(0)}</div>
              <p className="text-xs sm:text-sm text-gray-600">{monthlyComparison.lastMonth.count} ventas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm flex items-center gap-2">
                {monthlyComparison.growth >= 0 ? (
                  <TrendingUp size={16} className="text-green-600" />
                ) : (
                  <TrendingDown size={16} className="text-red-600" />
                )}
                Crecimiento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className={`text-2xl sm:text-3xl ${monthlyComparison.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {monthlyComparison.growth >= 0 ? '+' : ''}{monthlyComparison.growth.toFixed(1)}%
              </div>
              <p className="text-xs sm:text-sm text-gray-600">vs mes anterior</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs for different report categories */}
      <Tabs defaultValue="profits" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto gap-1">
          <TabsTrigger value="profits" className="text-xs sm:text-sm py-2">
            <PiggyBank size={16} className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Ganancias</span>
            <span className="sm:hidden">Gan</span>
          </TabsTrigger>
          <TabsTrigger value="sales" className="text-xs sm:text-sm py-2">
            <DollarSign size={16} className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Ventas</span>
            <span className="sm:hidden">Vtas</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="text-xs sm:text-sm py-2">
            <Package size={16} className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Inventario</span>
            <span className="sm:hidden">Inv</span>
          </TabsTrigger>
          <TabsTrigger value="repairs" className="text-xs sm:text-sm py-2">
            <Wrench size={16} className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Reparaciones</span>
            <span className="sm:hidden">Rep</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="text-xs sm:text-sm py-2">
            <Users size={16} className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Clientes</span>
            <span className="sm:hidden">Cli</span>
          </TabsTrigger>
        </TabsList>

        {/* PROFITS TAB */}
        <TabsContent value="profits" className="space-y-4">
          {profitData ? (
            <>
              {/* Profit Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ArrowUpCircle size={16} className="text-green-600" />
                      Ingresos Totales
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl sm:text-3xl text-green-600">
                      ${profitData.totalRevenue.toFixed(0)}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">Últimos 30 días</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ArrowDownCircle size={16} className="text-red-600" />
                      Costos Totales
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl sm:text-3xl text-red-600">
                      ${profitData.totalCost.toFixed(0)}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">Costo de mercancía</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <PiggyBank size={16} className="text-blue-600" />
                      Ganancia Neta
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl sm:text-3xl text-blue-600">
                      ${profitData.totalProfit.toFixed(0)}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">Ingresos - Costos</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Percent size={16} className="text-purple-600" />
                      Margen de Ganancia
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className={`text-2xl sm:text-3xl ${
                      profitData.profitMargin >= 30 ? 'text-green-600' : 
                      profitData.profitMargin >= 20 ? 'text-yellow-600' : 
                      'text-orange-600'
                    }`}>
                      {profitData.profitMargin.toFixed(1)}%
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      {profitData.profitMargin >= 30 ? 'Excelente' : 
                       profitData.profitMargin >= 20 ? 'Bueno' : 
                       'Mejorar'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Profit Trend Chart */}
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="text-green-600" size={20} />
                    <CardTitle className="text-base sm:text-lg">Tendencia de Ganancias (Últimos 7 Días)</CardTitle>
                  </div>
                  <CardDescription className="text-xs sm:text-sm">
                    Comparación de ingresos, costos y ganancias
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  {salesByDay.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={salesByDay}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="ingresos" fill="#10b981" name="Ingresos ($)" />
                        <Bar dataKey="ganancia" fill="#3b82f6" name="Ganancia ($)" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-gray-500 py-8 text-sm">No hay datos de ganancias</p>
                  )}
                </CardContent>
              </Card>

              {/* Profit Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Profit Breakdown */}
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <div className="flex items-center gap-2">
                      <PiggyBank className="text-blue-600" size={20} />
                      <div>
                        <CardTitle className="text-base sm:text-lg">Desglose de Ganancias</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Análisis detallado</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    <div className="space-y-4">
                      <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-700">Ingresos Brutos</span>
                          <span className="text-green-600">${profitData.totalRevenue.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                        </div>
                      </div>

                      <div className="p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-700">Costos de Mercancía</span>
                          <span className="text-red-600">-${profitData.totalCost.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-red-600 h-2 rounded-full" 
                            style={{ width: `${(profitData.totalCost / profitData.totalRevenue) * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {((profitData.totalCost / profitData.totalRevenue) * 100).toFixed(1)}% de los ingresos
                        </p>
                      </div>

                      <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">Ganancia Neta</span>
                          <span className="text-blue-600 font-medium">${profitData.totalProfit.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${profitData.profitMargin}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {profitData.profitMargin.toFixed(1)}% de margen
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="text-orange-600" size={20} />
                      <div>
                        <CardTitle className="text-base sm:text-lg">Análisis y Recomendaciones</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Mejora tus ganancias</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    <div className="space-y-3">
                      {profitData.profitMargin < 20 && (
                        <Alert className="bg-orange-50 border-orange-200">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          <AlertDescription className="text-sm">
                            <strong>Margen bajo:</strong> Tu margen de ganancia está por debajo del 20%. 
                            Considera revisar tus precios de venta o negociar mejores costos con proveedores.
                          </AlertDescription>
                        </Alert>
                      )}

                      {profitData.profitMargin >= 20 && profitData.profitMargin < 30 && (
                        <Alert className="bg-yellow-50 border-yellow-200">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-sm">
                            <strong>Margen aceptable:</strong> Tu margen de ganancia es bueno, pero hay espacio para mejora. 
                            Analiza tus productos más rentables para optimizar tu inventario.
                          </AlertDescription>
                        </Alert>
                      )}

                      {profitData.profitMargin >= 30 && (
                        <Alert className="bg-green-50 border-green-200">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-sm">
                            <strong>Excelente margen:</strong> Tu margen de ganancia es muy saludable. 
                            Mantén esta tendencia y considera expandir tu línea de productos más rentables.
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="p-3 bg-blue-50 rounded-lg text-sm">
                        <p className="font-medium text-blue-900 mb-2">💡 Consejos para mejorar:</p>
                        <ul className="space-y-1 text-blue-800 text-xs sm:text-sm">
                          <li>• Negocia descuentos por volumen con proveedores</li>
                          <li>• Identifica y enfócate en productos de alto margen</li>
                          <li>• Reduce productos de baja rotación que ocupan capital</li>
                          <li>• Considera aumentar precios en productos con alta demanda</li>
                          <li>• Revisa los costos operacionales ocultos</li>
                        </ul>
                      </div>

                      <div className="p-3 bg-purple-50 rounded-lg text-sm">
                        <p className="font-medium text-purple-900 mb-1">📊 Métricas clave:</p>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                          <div>
                            <p className="text-gray-600">Ganancia por venta:</p>
                            <p className="font-medium text-purple-900">
                              ${salesByDay.length > 0 ? (profitData.totalProfit / salesByDay.reduce((sum, day) => sum + day.ventas, 0) || 0).toFixed(2) : '0.00'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">ROI (aprox):</p>
                            <p className="font-medium text-purple-900">
                              {profitData.totalCost > 0 ? ((profitData.totalProfit / profitData.totalCost) * 100).toFixed(1) : '0'}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {profitData.totalProfit <= 0 && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-sm">
                    <strong>⚠️ Alerta Crítica:</strong> No estás generando ganancias. Es urgente que revises:
                    <ul className="mt-2 ml-4 space-y-1">
                      <li>• Los costos de tus productos están correctamente registrados</li>
                      <li>• Tus precios de venta cubren los costos más un margen</li>
                      <li>• No hay errores en la captura de costos y precios</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Calculando ganancias...</p>
            </div>
          )}
        </TabsContent>

        {/* SALES TAB */}
        <TabsContent value="sales" className="space-y-4">
          {/* Sales Trend */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-blue-600" size={20} />
                <CardTitle className="text-base sm:text-lg">Tendencia de Ventas (Últimos 7 Días)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {salesByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={salesByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="ingresos" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Ingresos ($)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="ganancia" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Ganancia ($)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-8 text-sm">No hay datos de ventas</p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Products */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="text-green-600" size={20} />
                  <CardTitle className="text-base sm:text-lg">Productos Más Vendidos</CardTitle>
                </div>
                <CardDescription className="text-xs sm:text-sm">Top 10 por ingresos</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {topProducts.length > 0 ? (
                  <div className="space-y-3">
                    {topProducts.map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm truncate">{product.name}</p>
                          <p className="text-xs text-gray-600">{product.quantity} vendidos</p>
                        </div>
                        <div className="text-right ml-2">
                          <p className="text-sm sm:text-base text-green-600">${product.revenue.toFixed(0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8 text-sm">No hay datos</p>
                )}
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center gap-2">
                  <CreditCard className="text-purple-600" size={20} />
                  <CardTitle className="text-base sm:text-lg">Métodos de Pago</CardTitle>
                </div>
                <CardDescription className="text-xs sm:text-sm">Distribución de pagos</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {paymentMethods.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={paymentMethods}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {paymentMethods.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500 py-8 text-sm">No hay datos</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* INVENTORY TAB */}
        <TabsContent value="inventory" className="space-y-4">
          {/* Low Rotation Alert */}
          {lowRotationProducts.length > 0 && (
            <Alert className="bg-orange-50 border-orange-200">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-sm">
                <strong>Acción Requerida:</strong> Tienes {lowRotationProducts.length} productos con baja rotación. 
                Considera crear promociones para aumentar las ventas.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Gift className="text-orange-600" size={20} />
                  <div>
                    <CardTitle className="text-base sm:text-lg">Productos de Baja Rotación</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Productos que necesitan promoción</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="w-fit text-xs">
                  Oportunidad de promoción
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {lowRotationProducts.length > 0 ? (
                <div className="space-y-3">
                  {lowRotationProducts.map((product, index) => (
                    <div key={index} className="p-3 sm:p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm sm:text-base truncate">{product.name}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">{product.category}</Badge>
                            <Badge variant="outline" className="text-xs">{product.stock} en stock</Badge>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-sm sm:text-base">${product.price}</p>
                          <p className="text-xs text-orange-600">
                            {product.lastSold 
                              ? `${product.daysWithoutSale} días sin venta` 
                              : 'Nunca vendido'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 p-2 bg-blue-50 rounded text-xs sm:text-sm text-blue-900">
                        💡 Sugerencia: Ofrece un {Math.min(30, Math.floor(product.daysWithoutSale / 2))}% de descuento
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">¡Excelente! Todos tus productos tienen buena rotación</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* REPAIRS TAB */}
        <TabsContent value="repairs" className="space-y-4">
          {/* Ready Repairs Alert */}
          {readyRepairs.length > 0 && (
            <Alert className="bg-green-50 border-green-200">
              <PhoneCall className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm">
                <strong>Llamadas Pendientes:</strong> Hay {readyRepairs.length} equipos listos para entregar. 
                Contacta a los clientes para agilizar la entrega.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Repair Stats */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center gap-2">
                  <Clock className="text-blue-600" size={20} />
                  <CardTitle className="text-base sm:text-lg">Tiempo Promedio de Reparación</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="text-center">
                  <div className="text-4xl sm:text-5xl text-blue-600 mb-2">
                    {avgRepairTime.toFixed(1)}
                  </div>
                  <p className="text-sm sm:text-base text-gray-600">días promedio</p>
                  {avgRepairTime > 7 && (
                    <p className="mt-3 text-xs sm:text-sm text-orange-600">
                      ⚠️ Considera optimizar tus procesos para reducir tiempos
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Repairs by Status */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center gap-2">
                  <Activity className="text-orange-600" size={20} />
                  <CardTitle className="text-base sm:text-lg">Estado de Reparaciones</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {repairsByStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={repairsByStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {repairsByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500 py-8 text-sm">No hay reparaciones</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Common Repair Types */}
          {commonRepairTypes.length > 0 && (
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center gap-2">
                  <Wrench className="text-purple-600" size={20} />
                  <div>
                    <CardTitle className="text-base sm:text-lg">Reparaciones Más Comunes</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Optimiza tu inventario de repuestos</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-2">
                  {commonRepairTypes.map((type: any, index) => (
                    <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded">
                      <p className="text-xs sm:text-sm flex-1 min-w-0 truncate">{type.type}</p>
                      <Badge variant="secondary" className="ml-2 text-xs">{type.count} casos</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ready for Pickup */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <PhoneCall className="text-green-600" size={20} />
                  <div>
                    <CardTitle className="text-base sm:text-lg">Equipos Listos para Entregar</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Contacta estos clientes</CardDescription>
                  </div>
                </div>
                {readyRepairs.length > 0 && (
                  <Badge className="bg-green-100 text-green-800 w-fit text-xs">
                    {readyRepairs.length} pendiente{readyRepairs.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {readyRepairs.length > 0 ? (
                <div className="space-y-3">
                  {readyRepairs.map((repair) => (
                    <div key={repair.id} className="p-3 sm:p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm sm:text-base">{repair.customerName}</p>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {repair.deviceBrand} {repair.deviceType}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge 
                            variant={repair.daysWaiting > 7 ? 'destructive' : 'default'}
                            className="text-xs"
                          >
                            {repair.daysWaiting} día{repair.daysWaiting !== 1 ? 's' : ''}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            ${repair.estimatedCost}
                          </Badge>
                        </div>
                      </div>
                      <a 
                        href={`tel:${repair.customerPhone}`}
                        className="flex items-center gap-2 text-xs sm:text-sm text-blue-600 hover:underline"
                      >
                        <PhoneCall size={14} />
                        {repair.customerPhone}
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8 text-sm">
                  No hay equipos listos pendientes de entrega
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CUSTOMERS TAB */}
        <TabsContent value="customers" className="space-y-4">
          {/* Inactive Customers Alert */}
          {inactiveCustomers.length > 0 && (
            <Alert className="bg-blue-50 border-blue-200">
              <Users className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm">
                <strong>Oportunidad de Reactivación:</strong> Tienes {inactiveCustomers.length} clientes inactivos. 
                Contacta los más valiosos con ofertas especiales.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Customers */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center gap-2">
                  <Users className="text-green-600" size={20} />
                  <div>
                    <CardTitle className="text-base sm:text-lg">Mejores Clientes</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Por valor de compras</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {topCustomers.length > 0 ? (
                  <div className="space-y-3">
                    {topCustomers.map((customer: any, index) => (
                      <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm truncate">{customer.name}</p>
                          <p className="text-xs text-gray-600">
                            {customer.purchaseCount} compra{customer.purchaseCount !== 1 ? 's' : ''}
                            {customer.repairCount ? ` • ${customer.repairCount} reparación${customer.repairCount !== 1 ? 'es' : ''}` : ''}
                          </p>
                        </div>
                        <div className="text-right ml-2">
                          <p className="text-sm sm:text-base text-green-600">${customer.totalSpent.toFixed(0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8 text-sm">No hay datos</p>
                )}
              </CardContent>
            </Card>

            {/* Inactive Customers */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-orange-600" size={20} />
                  <div>
                    <CardTitle className="text-base sm:text-lg">Clientes Inactivos</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">+60 días sin actividad</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {inactiveCustomers.length > 0 ? (
                  <div className="space-y-3">
                    {inactiveCustomers.map((customer: any, index) => (
                      <div key={index} className="p-3 sm:p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm sm:text-base truncate">{customer.name}</p>
                            <p className="text-xs text-gray-600">
                              Gastó ${customer.totalSpent.toFixed(0)} en total
                            </p>
                          </div>
                          <Badge variant="outline" className="w-fit text-xs">
                            {customer.daysInactive} días
                          </Badge>
                        </div>
                        <div className="p-2 bg-purple-50 rounded text-xs sm:text-sm text-purple-900">
                          💡 Ofrece un descuento del 15% para reactivar
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8 text-sm">
                    ¡Excelente! Todos tus clientes están activos
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
