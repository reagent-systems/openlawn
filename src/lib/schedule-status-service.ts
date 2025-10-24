/**
 * Schedule Status Service
 *
 * Calculates whether employees are on schedule, ahead, or behind
 * and provides status messages and time estimates
 */

import { Route, ScheduleStatus } from './types';
import { calculateTimeBreakdown } from './time-analytics-service';

/**
 * Calculate the schedule status for a route
 */
export function calculateScheduleStatus(
  route: Route,
  currentTime: Date = new Date()
): ScheduleStatus {
  // Get route timing information
  const startTime = getRouteStartTime(route);
  const totalPlannedDuration = route.estimatedDuration; // minutes

  // Calculate stops completed
  const completedStops = route.stops.filter(stop => stop.status === 'completed').length;
  const totalStops = route.stops.length;
  const stopsRemaining = totalStops - completedStops;

  // Get time breakdown
  const timeBreakdown = calculateTimeBreakdown(route);
  const timeElapsed = startTime
    ? (currentTime.getTime() - startTime.getTime()) / 1000 / 60 // minutes
    : 0;

  // Calculate progress ratios
  const plannedProgress = totalPlannedDuration > 0 ? timeElapsed / totalPlannedDuration : 0;
  const actualProgress = totalStops > 0 ? completedStops / totalStops : 0;

  // Determine status based on progress comparison
  let status: 'on_schedule' | 'ahead' | 'behind';
  let minutesDelta = 0;

  if (actualProgress >= plannedProgress * 0.95 && actualProgress <= plannedProgress * 1.05) {
    // Within 5% tolerance - on schedule
    status = 'on_schedule';
  } else if (actualProgress > plannedProgress * 1.05) {
    // More than 5% ahead
    status = 'ahead';
    minutesDelta = Math.round((actualProgress - plannedProgress) * totalPlannedDuration);
  } else {
    // More than 5% behind
    status = 'behind';
    minutesDelta = Math.round((plannedProgress - actualProgress) * totalPlannedDuration);
  }

  // Generate status message
  const message = generateStatusMessage(status, minutesDelta, completedStops, totalStops);

  // Estimate finish time
  const estimatedFinishTime = estimateFinishTime(
    route,
    currentTime,
    timeBreakdown,
    completedStops,
    stopsRemaining
  );

  return {
    status,
    minutesDelta,
    message,
    estimatedFinishTime,
    stopsRemaining,
    totalDriveTime: timeBreakdown.driveTime,
    totalWorkTime: timeBreakdown.workTime,
    totalBreakTime: timeBreakdown.breakTime,
  };
}

/**
 * Generate a user-friendly status message
 */
function generateStatusMessage(
  status: 'on_schedule' | 'ahead' | 'behind',
  minutesDelta: number,
  completedStops: number,
  totalStops: number
): string {
  const progress = `${completedStops}/${totalStops} stops`;

  switch (status) {
    case 'on_schedule':
      return `You're on track! (${progress})`;

    case 'ahead':
      if (minutesDelta < 10) {
        return `Slightly ahead of schedule! (${progress})`;
      } else {
        return `Great pace! ${minutesDelta} min ahead (${progress})`;
      }

    case 'behind':
      if (minutesDelta < 10) {
        return `Running a bit behind (${progress})`;
      } else if (minutesDelta < 30) {
        return `${minutesDelta} min behind schedule (${progress})`;
      } else {
        return `Significantly delayed: ${minutesDelta} min behind (${progress})`;
      }
  }
}

/**
 * Estimate when the route will be finished
 */
function estimateFinishTime(
  route: Route,
  currentTime: Date,
  timeBreakdown: { workTime: number; driveTime: number },
  completedStops: number,
  stopsRemaining: number
): Date {
  if (stopsRemaining === 0) {
    return currentTime;
  }

  // Calculate average time per completed stop
  const avgWorkTimePerStop = completedStops > 0
    ? timeBreakdown.workTime / completedStops
    : 20; // Default 20 min per stop

  const avgDriveTimePerStop = completedStops > 1
    ? timeBreakdown.driveTime / (completedStops - 1) // First stop has no drive time
    : 10; // Default 10 min drive time

  // Estimate remaining time
  const estimatedRemainingWork = avgWorkTimePerStop * stopsRemaining;
  const estimatedRemainingDrive = avgDriveTimePerStop * Math.max(stopsRemaining - 1, 0);
  const estimatedRemainingMinutes = estimatedRemainingWork + estimatedRemainingDrive;

  // Add to current time
  const finishTime = new Date(currentTime);
  finishTime.setMinutes(finishTime.getMinutes() + estimatedRemainingMinutes);

  return finishTime;
}

/**
 * Get the next stop's ETA
 */
export function getNextStopETA(route: Route, currentTime: Date = new Date()): Date | null {
  const nextStop = route.stops.find(stop => stop.status === 'pending');
  if (!nextStop) return null;

  // Get current stop if exists
  const currentStop = route.stops.find(stop => stop.status === 'in_progress');

  if (currentStop) {
    // Estimate based on average work time + drive time
    const timeBreakdown = calculateTimeBreakdown(route);
    const completedStops = route.stops.filter(s => s.status === 'completed').length;

    const avgWorkTime = completedStops > 0 ? timeBreakdown.workTime / completedStops : 20;
    const avgDriveTime = completedStops > 1 ? timeBreakdown.driveTime / (completedStops - 1) : 10;

    // Estimate when current stop will finish + drive time to next
    const remainingAtCurrent = currentStop.actualArrival
      ? Math.max(avgWorkTime - (currentTime.getTime() - (currentStop.actualArrival instanceof Date ? currentStop.actualArrival.getTime() : new Date(currentStop.actualArrival).getTime())) / 1000 / 60, 0)
      : avgWorkTime;

    const eta = new Date(currentTime);
    eta.setMinutes(eta.getMinutes() + remainingAtCurrent + avgDriveTime);

    return eta;
  } else {
    // No current stop, use estimated arrival from route
    if (nextStop.estimatedArrival) {
      const [hours, minutes] = nextStop.estimatedArrival.split(':').map(Number);
      const eta = new Date(route.date);
      eta.setHours(hours, minutes, 0, 0);
      return eta;
    }

    return null;
  }
}

/**
 * Get route start time from first stop's estimated arrival
 */
function getRouteStartTime(route: Route): Date | null {
  const firstStop = route.stops[0];
  if (!firstStop?.estimatedArrival) return null;

  const [hours, minutes] = firstStop.estimatedArrival.split(':').map(Number);
  const startTime = new Date(route.date);
  startTime.setHours(hours, minutes, 0, 0);

  return startTime;
}

/**
 * Format time as HH:MM AM/PM
 */
export function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Get a detailed schedule summary for display
 */
export function getScheduleSummary(route: Route, currentTime: Date = new Date()): {
  status: ScheduleStatus;
  nextStopETA: Date | null;
  nextStopETAFormatted: string;
  estimatedFinishFormatted: string;
  progressPercentage: number;
} {
  const status = calculateScheduleStatus(route, currentTime);
  const nextStopETA = getNextStopETA(route, currentTime);

  const completedStops = route.stops.filter(stop => stop.status === 'completed').length;
  const progressPercentage = route.stops.length > 0
    ? Math.round((completedStops / route.stops.length) * 100)
    : 0;

  return {
    status,
    nextStopETA,
    nextStopETAFormatted: nextStopETA ? formatTime(nextStopETA) : 'N/A',
    estimatedFinishFormatted: formatTime(status.estimatedFinishTime),
    progressPercentage,
  };
}

/**
 * Check if a crew is significantly delayed (more than 30 minutes behind)
 */
export function isSignificantlyDelayed(route: Route, currentTime: Date = new Date()): boolean {
  const status = calculateScheduleStatus(route, currentTime);
  return status.status === 'behind' && status.minutesDelta >= 30;
}

/**
 * Get status badge color for UI display
 */
export function getStatusBadgeColor(status: 'on_schedule' | 'ahead' | 'behind'): string {
  switch (status) {
    case 'on_schedule':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'ahead':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'behind':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }
}

/**
 * Get status icon for UI display
 */
export function getStatusIcon(status: 'on_schedule' | 'ahead' | 'behind'): string {
  switch (status) {
    case 'on_schedule':
      return '✓';
    case 'ahead':
      return '⚡';
    case 'behind':
      return '⏱️';
  }
}
