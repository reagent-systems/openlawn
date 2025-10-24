"use client"

import React from 'react';

interface TimeAnalysisBarProps {
  workTimeMinutes: number;
  nonWorkTimeMinutes: number;
  showLegend?: boolean;
  className?: string;
}

export function TimeAnalysisBar({
  workTimeMinutes,
  nonWorkTimeMinutes,
  showLegend = false,
  className = ''
}: TimeAnalysisBarProps) {
  const totalMinutes = workTimeMinutes + nonWorkTimeMinutes;
  const workPercentage = totalMinutes > 0 ? (workTimeMinutes / totalMinutes) * 100 : 0;
  const nonWorkPercentage = totalMinutes > 0 ? (nonWorkTimeMinutes / totalMinutes) * 100 : 0;

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className={`w-full ${className}`}>
      {/* The Bar */}
      <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-green-500 transition-all"
          style={{ width: `${workPercentage}%` }}
        />
        <div
          className="absolute right-0 top-0 h-full bg-red-500 transition-all"
          style={{ width: `${nonWorkPercentage}%` }}
        />
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-sm" />
            <span>Work: {formatTime(workTimeMinutes)}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-sm" />
            <span>Non-Work: {formatTime(nonWorkTimeMinutes)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
