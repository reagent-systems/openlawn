"use client"

import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, MapPin, Calendar } from "lucide-react"
import type { DailyRoute, User } from "@/lib/firebase-types"

interface CrewPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  route: DailyRoute | null
  employees: User[]
}

export function CrewPopup({ open, onOpenChange, route, employees }: CrewPopupProps) {
  if (!route) return null

  // Find employees in this crew
  const crewEmployees = employees.filter(emp => emp.crewId === route.crewId)
  
  // Generate crew color
  const generateColor = (crewId: string): string => {
    let hash = 0;
    for (let i = 0; i < crewId.length; i++) {
      hash = crewId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };

  const crewColor = generateColor(route.crewId)
  const isToday = new Date(route.date).toDateString() === new Date().toDateString()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: crewColor }}
            />
            Crew {route.crewId}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Route Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Route Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Date:</span>
                <Badge variant={isToday ? "default" : "secondary"}>
                  {isToday ? "Today" : "Tomorrow"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Customers:</span>
                <span className="text-sm font-medium">{route.customers.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estimated Duration:</span>
                <span className="text-sm font-medium">{route.estimatedDuration} min</span>
              </div>
            </CardContent>
          </Card>

          {/* Crew Members */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                Crew Members ({crewEmployees.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {crewEmployees.map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div>
                      <p className="text-sm font-medium">{employee.name}</p>
                      <p className="text-xs text-muted-foreground">{employee.role}</p>
                    </div>
                    {employee.title && (
                      <Badge variant="outline" className="text-xs">
                        {employee.title}
                      </Badge>
                    )}
                  </div>
                ))}
                {crewEmployees.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No crew members assigned
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customers */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Assigned Customers ({route.customers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {route.customers.map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div>
                      <p className="text-sm font-medium">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.address}</p>
                    </div>
                    {customer.services.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {customer.services[0].type}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
} 