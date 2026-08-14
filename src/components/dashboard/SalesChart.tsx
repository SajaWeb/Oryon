import { useEffect, useState } from 'react'
import { projectId } from '../../utils/supabase/info'
import { TrendingUp } from 'lucide-react'
import { useChartColors } from './useChartColors'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface SalesChartProps {
  accessToken: string
}

interface MonthData {
  month: string
  ventas: number
  ingresos: number
}

export function SalesChart({ accessToken }: SalesChartProps) {
  const [chartData, setChartData] = useState<MonthData[]>([])
  const [loading, setLoading] = useState(true)
  const [chartType, setChartType] = useState<'line' | 'bar'>('bar')
  const c = useChartColors()

  useEffect(() => {
    fetchSalesData()
  }, [])

  const fetchSalesData = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/sales`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
      const data = await response.json()
      if (data.success) {
        const sales = data.sales.map((s: string) => JSON.parse(s))
        
        // Get last 6 months
        const monthsData: { [key: string]: { ventas: number; ingresos: number } } = {}
        const now = new Date()
        
        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const monthKey = date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
          monthsData[monthKey] = { ventas: 0, ingresos: 0 }
        }
        
        // Aggregate sales data
        sales.forEach((sale: any) => {
          const saleDate = new Date(sale.createdAt)
          const monthKey = saleDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
          
          if (monthsData[monthKey]) {
            monthsData[monthKey].ventas++
            monthsData[monthKey].ingresos += sale.total || 0
          }
        })
        
        // Convert to array
        const chartArray = Object.entries(monthsData).map(([month, data]) => ({
          month,
          ventas: data.ventas,
          ingresos: Math.round(data.ingresos)
        }))
        
        setChartData(chartArray)
      }
    } catch (error) {
      console.error('Error fetching sales data:', error)
    } finally {
      setLoading(false)
    }
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            padding: '10px 12px',
            background: 'var(--surface-raised)',
            border: 'var(--border-width) solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <p
            style={{
              margin: '0 0 6px',
              fontSize: 'var(--text-caption)',
              letterSpacing: 'var(--tr-caption)',
              textTransform: 'uppercase',
              fontWeight: 'var(--fw-semibold)',
              color: 'var(--text-tertiary)',
            }}
          >
            {payload[0].payload.month}
          </p>
          <p style={{ margin: 0, fontSize: 'var(--text-mono-size)', fontFamily: 'var(--font-mono)', color: 'var(--accent-400)' }}>
            Ventas: {payload[0].value}
          </p>
          <p style={{ margin: 0, fontSize: 'var(--text-mono-size)', fontFamily: 'var(--font-mono)', color: 'var(--state-ready)' }}>
            Ingresos: ${payload[1].value.toLocaleString()}
          </p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={20} />
            Tendencia de Ventas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-400)] mx-auto mb-2"></div>
            <p className="text-sm text-[var(--text-tertiary)]">Cargando datos...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasData = chartData.some(d => d.ventas > 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={20} />
            Tendencia de Ventas (Últimos 6 meses)
          </CardTitle>
          <div className="flex gap-2">
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1 text-sm rounded ${
                chartType === 'bar' ? 'oryon-toggle-on' : 'oryon-toggle-off'
              }`}
            >
              Barras
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1 text-sm rounded ${
                chartType === 'line' ? 'oryon-toggle-on' : 'oryon-toggle-off'
              }`}
            >
              Líneas
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="py-8 text-center text-gray-500">
            <p>No hay datos de ventas para mostrar</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            {chartType === 'bar' ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: c.axis }} stroke={c.grid} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: c.axis }} stroke={c.grid} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: c.axis }} stroke={c.grid} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="ventas" fill={c.series1} name="Ventas" />
                <Bar yAxisId="right" dataKey="ingresos" fill={c.series2} name="Ingresos ($)" />
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: c.axis }} stroke={c.grid} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: c.axis }} stroke={c.grid} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: c.axis }} stroke={c.grid} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="ventas" 
                  stroke={c.series1} 
                  strokeWidth={2}
                  name="Ventas"
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="ingresos" 
                  stroke={c.series2} 
                  strokeWidth={2}
                  name="Ingresos ($)"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
