import { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { cn } from '../ui/utils'

interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  color: string
  bgColor: string
  subtitle?: string
  onClick?: () => void
  className?: string
}

export function StatCard({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
  subtitle,
  onClick,
  className
}: StatCardProps) {
  return (
    <Card 
      className={cn(
        onClick && "cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm text-gray-600">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={color} size={20} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl">{value}</div>
        {subtitle && (
          <p className="text-sm text-gray-600 mt-2">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
