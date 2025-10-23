"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Plus, Users, MapPin, Clock, Edit } from "lucide-react"

interface Crew {
  id: string;
  name: string;
  employees: Employee[];
  services: {
    serviceType: string;
    days: string[];
  }[];
  status: 'active' | 'inactive';
  currentLocation?: {
    lat: number;
    lng: number;
    lastUpdated: Date;
  };
  routeProgress: number; // 0-100
}

interface Employee {
  id: string;
  name: string;
  role: 'employee' | 'manager' | 'admin';
  location?: {
    lat: number;
    lng: number;
    lastUpdated: Date;
  };
  status: 'active' | 'inactive';
}

interface CrewCardProps {
  crew?: Crew
  isAddCard?: boolean
  onClick?: () => void
  onEdit?: (crew: Crew) => void
  calculateProgress?: (crew: Crew) => number
}

export function CrewCard({
  crew,
  isAddCard = false,
  onClick,
  onEdit,
  calculateProgress,
}: CrewCardProps) {
  if (isAddCard) {
    return (
      <Card
        className="h-full flex flex-col items-center justify-center border-dashed border-2 hover:border-primary hover:text-primary transition-all cursor-pointer bg-secondary/50"
        onClick={onClick}
      >
        <CardContent className="p-6 text-center flex flex-col items-center justify-center">
          <Plus className="w-10 h-10 mb-2" />
          <p className="font-semibold">Add New Crew</p>
        </CardContent>
      </Card>
    )
  }

  if (!crew) return null;

  const activeEmployees = crew.employees.filter(emp => emp.status === 'active');
  const _serviceTypes = crew.services.map(s => s.serviceType).join(', ');

  return (
    <Card
      className="h-full flex flex-col hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-headline">{crew.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={crew.status === 'active' ? 'default' : 'secondary'} className="text-xs">
              {crew.status}
            </Badge>
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(crew)
                }}
                className="h-6 w-6 p-0"
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        {/* Employee Count */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{activeEmployees.length} employees</span>
        </div>

        {/* Services */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Services:</p>
          <div className="flex flex-wrap gap-1">
            {crew.services.map((service, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {service.serviceType}
              </Badge>
            ))}
          </div>
        </div>

        {/* Route Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Route Progress</span>
            <span className="text-muted-foreground">
              {calculateProgress ? calculateProgress(crew) : 0}%
            </span>
          </div>
          <Progress value={calculateProgress ? calculateProgress(crew) : 0} className="h-2" />
        </div>

        {/* Current Location */}
        {crew.currentLocation && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>Location tracked</span>
          </div>
        )}

        {/* Last Updated */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Updated {crew.currentLocation?.lastUpdated.toLocaleTimeString()}</span>
        </div>
      </CardContent>
    </Card>
  )
} 
 