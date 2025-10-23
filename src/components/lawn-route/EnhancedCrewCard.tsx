"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { 
  Plus, 
  Users, 
  MapPin, 
  Clock, 
  Edit, 
  CheckCircle, 
  AlertTriangle, 
  Timer,
  TrendingUp,
  Navigation
} from "lucide-react"
import type { RouteProgress } from "@/lib/route-progress-service"

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
  email: string;
  role: 'employee' | 'manager' | 'admin';
  location?: {
    lat: number;
    lng: number;
    lastUpdated: Date;
  };
  status: 'active' | 'inactive';
}

interface EnhancedCrewCardProps {
  crew?: Crew
  progress?: RouteProgress
  isAddCard?: boolean
  onClick?: () => void
  onEdit?: (crew: Crew) => void
  onMarkStopCompleted?: (customerId: string) => void
  onMarkStopIncomplete?: (customerId: string) => void
}

export function EnhancedCrewCard({
  crew,
  progress,
  isAddCard = false,
  onClick,
  onEdit,
  onMarkStopCompleted: _onMarkStopCompleted,
  onMarkStopIncomplete: _onMarkStopIncomplete,
}: EnhancedCrewCardProps) {
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

  // Get status color and icon
  const getStatusInfo = () => {
    if (!progress) return { color: 'secondary', icon: Clock, text: 'No Progress' }
    
    switch (progress.status) {
      case 'completed':
        return { color: 'default', icon: CheckCircle, text: 'Completed' }
      case 'in_progress':
        return { color: 'default', icon: TrendingUp, text: 'In Progress' }
      case 'delayed':
        return { color: 'destructive', icon: AlertTriangle, text: 'Delayed' }
      case 'not_started':
        return { color: 'secondary', icon: Timer, text: 'Not Started' }
      default:
        return { color: 'secondary', icon: Clock, text: 'Unknown' }
    }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  // Format time
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  // Format distance
  const formatDistance = (meters: number) => {
    const km = meters / 1000
    return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(meters)} m`
  }

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
            {progress && (
              <Badge variant={statusInfo.color as any} className="text-xs flex items-center gap-1">
                <StatusIcon className="w-3 h-3" />
                {statusInfo.text}
              </Badge>
            )}
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
        {progress && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Route Progress</span>
              <span className="text-muted-foreground">{progress.progressPercentage}%</span>
            </div>
            <Progress value={progress.progressPercentage} className="h-2" />
            
            {/* Progress Details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Stops */}
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <CheckCircle className="w-3 h-3" />
                  <span>Stops</span>
                </div>
                <div className="font-medium">
                  {progress.stopsCompleted}/{progress.totalStops}
                </div>
              </div>
              
              {/* Distance */}
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Navigation className="w-3 h-3" />
                  <span>Distance</span>
                </div>
                <div className="font-medium">
                  {formatDistance(progress.distanceTraveled)}
                </div>
              </div>
              
              {/* Time */}
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Time</span>
                </div>
                <div className="font-medium">
                  {formatTime(progress.timeElapsed)}
                </div>
              </div>
              
              {/* Avg Time/Stop */}
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Timer className="w-3 h-3" />
                  <span>Avg/Stop</span>
                </div>
                <div className="font-medium">
                  {formatTime(progress.averageTimePerStop)}
                </div>
              </div>
            </div>

            {/* Performance Indicators */}
            {progress.delayMinutes > 0 && (
              <div className="flex items-center gap-2 text-xs text-destructive">
                <AlertTriangle className="w-3 h-3" />
                <span>{formatTime(progress.delayMinutes)} behind schedule</span>
              </div>
            )}

            {progress.isOnSchedule && progress.status === 'in_progress' && (
              <div className="flex items-center gap-2 text-xs text-green-600">
                <CheckCircle className="w-3 h-3" />
                <span>On schedule</span>
              </div>
            )}

            {/* Current Stop */}
            {progress.currentStop && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Current Stop:</p>
                <p className="text-xs">{progress.currentStop.customerName}</p>
                <p className="text-xs text-muted-foreground">{progress.currentStop.address}</p>
              </div>
            )}

            {/* Next Stop */}
            {progress.nextStop && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Next Stop:</p>
                <p className="text-xs">{progress.nextStop.customerName}</p>
                <p className="text-xs text-muted-foreground">{progress.nextStop.address}</p>
              </div>
            )}

            {/* Estimated Completion */}
            {progress.status === 'in_progress' && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Estimated Completion:</p>
                <p className="text-xs">
                  {progress.estimatedCompletionTime.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            )}
          </div>
        )}

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
          <span>
            Updated {progress?.lastUpdated.toLocaleTimeString() || crew.currentLocation?.lastUpdated.toLocaleTimeString()}
          </span>
        </div>
      </CardContent>
    </Card>
  )
} 