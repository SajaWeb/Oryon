import { useEffect, useState } from 'react'
import { DollarSign, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { projectId } from '../../utils/supabase/info'
import { motion, AnimatePresence } from 'motion/react'

interface RevenueCardProps {
  accessToken: string
}

type Period = 'day' | 'week' | 'month'

interface RevenueData {
  totalRevenue: number
  totalSales: number
  averageTicket: number
  period: Period
}

export function RevenueCard({ accessToken }: RevenueCardProps) {
  const [period, setPeriod] = useState<Period>('month')
  const [revenueData, setRevenueData] = useState<RevenueData>({
    totalRevenue: 0,
    totalSales: 0,
    averageTicket: 0,
    period: 'month'
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchRevenueData(period)
  }, [period])

  const fetchRevenueData = async (selectedPeriod: Period) => {
    setLoading(true)
    try {
      if (!accessToken) {
        console.error('❌ No access token available for revenue request')
        return
      }
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d437e50/stats/revenue?period=${selectedPeriod}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
      
      if (!response.ok) {
        console.error('❌ Revenue API error:', response.status)
        const errorText = await response.text()
        console.error('❌ Error details:', errorText)
        return
      }
      
      const data = await response.json()
      if (data.success) {
        setRevenueData(data.revenue)
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error)
    } finally {
      setLoading(false)
    }
  }

  const periodLabels = {
    day: 'Hoy',
    week: 'Últimos 7 días',
    month: 'Últimos 30 días'
  }

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-300 hover:scale-105"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="text-green-600" size={20} />
          Ingresos Totales
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Period selector buttons */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            {(['day', 'week', 'month'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 px-3 py-2 rounded-md text-sm transition-all ${
                  period === p
                    ? 'bg-green-500/20 text-green-700 shadow-sm'
                    : 'text-gray-600 hover:bg-white/50'
                }`}
              >
                {p === 'day' ? 'Día' : p === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>

          {/* Revenue display */}
          <div className="space-y-3">
            <div className="text-xs text-gray-500">
              {periodLabels[period]}
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={period}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {loading ? (
                  <div className="text-4xl text-green-600 animate-pulse">
                    Cargando...
                  </div>
                ) : (
                  <div className="text-4xl text-green-600">
                    ${revenueData.totalRevenue.toLocaleString()}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="space-y-2">
              <motion.div
                key={`sales-${period}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex justify-between items-center text-sm"
              >
                <span className="text-gray-600">Total de ventas</span>
                <span className="font-medium">{revenueData.totalSales.toLocaleString()}</span>
              </motion.div>
              
              {revenueData.totalSales > 0 && (
                <motion.div
                  key={`ticket-${period}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-gray-600">Ticket promedio</span>
                  <span className="font-medium flex items-center gap-1">
                    <TrendingUp size={14} className="text-green-600" />
                    ${revenueData.averageTicket.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
