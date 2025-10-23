import type { Customer } from "@/lib/firebase-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Plus, Calendar, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface CustomerCardProps {
  customer?: Customer
  isAddCard?: boolean
  onClick?: () => void
}

export function CustomerCard({
  customer,
  isAddCard = false,
  onClick,
}: CustomerCardProps) {
  if (isAddCard) {
    return (
      <Card
        className="h-full flex flex-col items-center justify-center border-dashed border-2 hover:border-primary hover:text-primary transition-all cursor-pointer bg-secondary/50"
        onClick={onClick}
      >
        <CardContent className="p-6 text-center flex flex-col items-center justify-center">
          <Plus className="w-10 h-10 mb-2" />
          <p className="font-semibold">Add New Customer</p>
        </CardContent>
      </Card>
    )
  }

  const primaryService = customer?.services?.[0];
  const lastServiceDate = customer?.lastServiceDate;

  return (
    <Card
      className="h-full flex flex-col hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-headline">{customer?.name}</CardTitle>
          {primaryService && (
            <Badge variant="outline" className="text-xs">
              {primaryService.type}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <div className="flex items-start text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 mr-2 mt-1 shrink-0" />
          <p>{customer?.address}</p>
        </div>
        
        {primaryService && (
          <div className="space-y-2">
            <div className="flex items-center text-xs text-muted-foreground">
              <Calendar className="w-3 h-3 mr-1" />
              <span>
                {primaryService.scheduledDate ? 
                  new Date(primaryService.scheduledDate.toDate()).toLocaleDateString() : 
                  'No date scheduled'
                }
              </span>
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="w-3 h-3 mr-1" />
              <span>
                ${primaryService.price}
              </span>
            </div>
          </div>
        )}
        
        {lastServiceDate && (
          <div className="text-xs text-muted-foreground">
            Last service: {new Date(lastServiceDate.toDate()).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
