"use client"

import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Calendar } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface ScheduleSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ScheduleSheet({ open, onOpenChange }: ScheduleSheetProps) {
  const { userProfile } = useAuth()
  const [selectedDate, setSelectedDate] = React.useState(new Date())

  // Generate time slots (8 AM to 6 PM)
  const timeSlots = React.useMemo(() => {
    const slots = []
    for (let hour = 8; hour <= 18; hour++) {
      const time = `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`
      slots.push(time)
    }
    return slots
  }, [])

  // Get days of the week (Monday - Sunday)
  const getDaysOfWeek = () => {
    const today = new Date()
    const days = []
    const currentDay = today.getDay()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - currentDay + 1) // Monday

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
    }
    return days
  }

  const weekDays = getDaysOfWeek()

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }

  const getDayNumber = (date: Date) => {
    return date.getDate()
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString()
  }

  // Get user schedule for a specific day
  const getScheduleForDay = (date: Date) => {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof typeof userProfile.schedule
    return userProfile?.schedule?.[dayName]
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-lg max-h-[90svh] overflow-y-auto"
      >
        <SheetHeader className="text-left">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <SheetTitle>My Schedule</SheetTitle>
          </div>
          <SheetDescription>
            View your weekly schedule and availability
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Week Calendar */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, index) => (
              <button
                key={index}
                onClick={() => setSelectedDate(day)}
                className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                  isSelected(day)
                    ? 'bg-primary text-primary-foreground'
                    : isToday(day)
                    ? 'bg-blue-100 text-blue-800'
                    : 'hover:bg-muted'
                }`}
              >
                <span className="text-xs font-medium">{getDayName(day)}</span>
                <span className="text-lg font-bold">{getDayNumber(day)}</span>
              </button>
            ))}
          </div>

          {/* Selected Day Schedule */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </h3>

            {(() => {
              const daySchedule = getScheduleForDay(selectedDate)

              if (!daySchedule) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No schedule set for this day</p>
                  </div>
                )
              }

              return (
                <div className="space-y-2">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Working Hours</p>
                        <p className="text-lg font-semibold text-green-800">
                          {daySchedule.start} - {daySchedule.end}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Status</p>
                        <p className="text-sm font-medium text-green-800">Available</p>
                      </div>
                    </div>
                  </div>

                  {/* Time slots visualization */}
                  <div className="mt-4 space-y-1">
                    <p className="text-sm text-muted-foreground mb-2">Schedule Timeline</p>
                    {timeSlots.map((slot) => {
                      const slotHour = parseInt(slot.split(':')[0])
                      const isPM = slot.includes('PM')
                      const hour24 = isPM && slotHour !== 12 ? slotHour + 12 : slotHour

                      const startHour = parseInt(daySchedule.start.split(':')[0])
                      const endHour = parseInt(daySchedule.end.split(':')[0])

                      const isInSchedule = hour24 >= startHour && hour24 < endHour

                      return (
                        <div
                          key={slot}
                          className={`flex items-center gap-2 p-2 rounded ${
                            isInSchedule
                              ? 'bg-green-100 border-l-4 border-green-500'
                              : 'bg-muted/30'
                          }`}
                        >
                          <span className="text-sm font-medium w-24">{slot}</span>
                          {isInSchedule && (
                            <span className="text-xs text-green-700">Working</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
