import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Info } from 'lucide-react';
import type { ServicePreferences, DayOfWeek } from '@/lib/types';

interface ServicePreferencesFormProps {
  preferences: ServicePreferences;
  onChange: (preferences: ServicePreferences) => void;
  disabled?: boolean;
}

const DAYS_OF_WEEK: { value: DayOfWeek; label: string; short: string }[] = [
  { value: 'monday', label: 'Monday', short: 'Mon' },
  { value: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { value: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { value: 'thursday', label: 'Thursday', short: 'Thu' },
  { value: 'friday', label: 'Friday', short: 'Fri' },
  { value: 'saturday', label: 'Saturday', short: 'Sat' },
  { value: 'sunday', label: 'Sunday', short: 'Sun' },
];

const SERVICE_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'one-time', label: 'One-time' },
];

// Convert time string (HH:MM) to minutes since midnight
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Convert minutes since midnight to time string (HH:MM)
const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export function ServicePreferencesForm({ 
  preferences, 
  onChange, 
  disabled = false 
}: ServicePreferencesFormProps) {
  const [startMinutes, setStartMinutes] = useState(timeToMinutes(preferences.preferredTimeRange.start));
  const [endMinutes, setEndMinutes] = useState(timeToMinutes(preferences.preferredTimeRange.end));

  const handleDayToggle = (day: DayOfWeek) => {
    const newDays = preferences.preferredDays.includes(day)
      ? preferences.preferredDays.filter(d => d !== day)
      : [...preferences.preferredDays, day];
    
    onChange({
      ...preferences,
      preferredDays: newDays,
    });
  };

  const handleTimeRangeChange = (values: number[]) => {
    const [start, end] = values;
    setStartMinutes(start);
    setEndMinutes(end);
    
    onChange({
      ...preferences,
      preferredTimeRange: {
        start: minutesToTime(start),
        end: minutesToTime(end),
      },
    });
  };

  const handleFrequencyChange = (frequency: string) => {
    onChange({
      ...preferences,
      serviceFrequency: frequency as ServicePreferences['serviceFrequency'],
    });
  };

  // Convert serviceFrequency to string for the Select component
  const frequencyValue = typeof preferences.serviceFrequency === 'number'
    ? preferences.serviceFrequency === 7 ? 'weekly'
    : preferences.serviceFrequency === 14 ? 'biweekly'
    : preferences.serviceFrequency === 30 ? 'monthly'
    : 'one-time'
    : preferences.serviceFrequency;

  const handleSpecialInstructionsChange = (instructions: string) => {
    onChange({
      ...preferences,
      specialInstructions: instructions,
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Service Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preferred Days */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Preferred Service Days</Label>
          <div className="grid grid-cols-7 gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day.value} className="flex flex-col items-center space-y-2">
                <Checkbox
                  id={day.value}
                  checked={preferences.preferredDays.includes(day.value)}
                  onCheckedChange={() => handleDayToggle(day.value)}
                  disabled={disabled}
                />
                <Label 
                  htmlFor={day.value} 
                  className="text-xs font-medium cursor-pointer"
                >
                  {day.short}
                </Label>
              </div>
            ))}
          </div>
          {preferences.preferredDays.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {preferences.preferredDays.map((day) => {
                const dayInfo = DAYS_OF_WEEK.find(d => d.value === day);
                return (
                  <Badge key={day} variant="secondary" className="text-xs">
                    {dayInfo?.label}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        {/* Time Range */}
        <div className="space-y-3">
          <Label className="text-base font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Preferred Time Range
          </Label>
          <div className="px-2">
            <Slider
              value={[startMinutes, endMinutes]}
              onValueChange={handleTimeRangeChange}
              max={1440} // 24 hours in minutes
              min={0}
              step={15} // 15-minute intervals
              disabled={disabled}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
              <span>{minutesToTime(startMinutes)}</span>
              <span>{minutesToTime(endMinutes)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="w-4 h-4" />
            <span>
              Service window: {minutesToTime(startMinutes)} - {minutesToTime(endMinutes)}
            </span>
          </div>
        </div>

        {/* Service Frequency */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Service Frequency</Label>
          <Select
            value={frequencyValue}
            onValueChange={handleFrequencyChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_FREQUENCIES.map((frequency) => (
                <SelectItem key={frequency.value} value={frequency.value}>
                  {frequency.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Special Instructions */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Special Instructions</Label>
          <Textarea
            placeholder="Any special instructions for service (e.g., gate code, pet information, etc.)"
            value={preferences.specialInstructions || ''}
            onChange={(e) => handleSpecialInstructionsChange(e.target.value)}
            disabled={disabled}
            rows={3}
          />
        </div>

        {/* Summary */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm">Service Summary</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <span className="font-medium">Frequency:</span> {SERVICE_FREQUENCIES.find(f => f.value === preferences.serviceFrequency)?.label}
            </p>
            <p>
              <span className="font-medium">Days:</span> {preferences.preferredDays.length > 0 
                ? preferences.preferredDays.map(day => DAYS_OF_WEEK.find(d => d.value === day)?.label).join(', ')
                : 'No days selected'
              }
            </p>
            <p>
              <span className="font-medium">Time:</span> {minutesToTime(startMinutes)} - {minutesToTime(endMinutes)}
            </p>
            {preferences.specialInstructions && (
              <p>
                <span className="font-medium">Notes:</span> {preferences.specialInstructions}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 