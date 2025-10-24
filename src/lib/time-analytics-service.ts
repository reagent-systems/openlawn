/**
 * Time Analytics Service
 *
 * Classifies and analyzes time spent during routes:
 * - Drive time: Travel between stops
 * - Work time: Time at customer locations
 * - Break time: Extended pauses
 * - Idle time: Unexplained gaps
 */

import { Route, RouteStop, TimeBreakdown, StopAnalytics } from './types';

/**
 * Calculate comprehensive time breakdown for a route
 */
export function calculateTimeBreakdown(route: Route): TimeBreakdown {
  let totalDriveTime = 0;
  let totalWorkTime = 0;
  let totalBreakTime = 0;
  let totalIdleTime = 0;

  const stopAnalytics: StopAnalytics[] = [];

  // Iterate through completed stops
  const completedStops = route.stops.filter(
    stop => stop.status === 'completed' && stop.actualArrival && stop.actualDeparture
  );

  for (let i = 0; i < completedStops.length; i++) {
    const stop = completedStops[i];
    const previousStop = i > 0 ? completedStops[i - 1] : null;

    // Calculate work time at this stop
    const workDuration = stop.workTime || calculateWorkTime(stop);
    totalWorkTime += workDuration;

    // Calculate drive time to this stop
    let driveDuration = 0;
    if (previousStop) {
      const driveData = calculateDriveTime(previousStop, stop);
      driveDuration = driveData.driveTime;

      // Check for breaks or idle time
      if (driveData.gap > 30) {
        // Gaps over 30 minutes are likely breaks
        const breakTime = driveData.gap - driveData.expectedDriveTime;
        if (breakTime > 0) {
          totalBreakTime += breakTime;
        }
      } else if (driveData.gap > driveData.expectedDriveTime * 1.5) {
        // Gaps 50% longer than expected might be idle time
        const idleTime = driveData.gap - driveData.expectedDriveTime;
        totalIdleTime += idleTime;
      }

      totalDriveTime += driveDuration;
    }

    // Calculate efficiency for this stop
    const totalTime = driveDuration + workDuration;
    const efficiency = totalTime > 0 ? workDuration / totalTime : 0;

    stopAnalytics.push({
      customerId: stop.customerId,
      customerName: stop.customerName,
      workDuration,
      driveDuration,
      efficiency,
    });
  }

  return {
    driveTime: Math.round(totalDriveTime),
    workTime: Math.round(totalWorkTime),
    breakTime: Math.round(totalBreakTime),
    idleTime: Math.round(totalIdleTime),
    stopAnalytics,
  };
}

/**
 * Calculate work time for a stop (in minutes)
 */
function calculateWorkTime(stop: RouteStop): number {
  if (!stop.actualArrival || !stop.actualDeparture) {
    return 0;
  }

  const arrivalTime = stop.actualArrival instanceof Date
    ? stop.actualArrival.getTime()
    : new Date(stop.actualArrival).getTime();

  const departureTime = stop.actualDeparture instanceof Date
    ? stop.actualDeparture.getTime()
    : new Date(stop.actualDeparture).getTime();

  // Subtract any pause time if exists
  let pauseTime = 0;
  if (stop.pausedAt && stop.resumedAt) {
    const pausedTime = stop.pausedAt instanceof Date
      ? stop.pausedAt.getTime()
      : new Date(stop.pausedAt).getTime();
    const resumedTime = stop.resumedAt instanceof Date
      ? stop.resumedAt.getTime()
      : new Date(stop.resumedAt).getTime();
    pauseTime = (resumedTime - pausedTime) / 1000 / 60;
  }

  return Math.round((departureTime - arrivalTime) / 1000 / 60 - pauseTime);
}

/**
 * Calculate drive time between stops
 */
function calculateDriveTime(
  previousStop: RouteStop,
  currentStop: RouteStop
): {
  driveTime: number;
  gap: number;
  expectedDriveTime: number;
} {
  if (!previousStop.actualDeparture || !currentStop.actualArrival) {
    return { driveTime: 0, gap: 0, expectedDriveTime: 0 };
  }

  const departureTime = previousStop.actualDeparture instanceof Date
    ? previousStop.actualDeparture.getTime()
    : new Date(previousStop.actualDeparture).getTime();

  const arrivalTime = currentStop.actualArrival instanceof Date
    ? currentStop.actualArrival.getTime()
    : new Date(currentStop.actualArrival).getTime();

  const gap = (arrivalTime - departureTime) / 1000 / 60; // Total time between stops

  // Estimate expected drive time based on distance (rough estimate: 1 mile = 2 minutes in city)
  const distance = calculateDistance(
    previousStop.lat,
    previousStop.lng,
    currentStop.lat,
    currentStop.lng
  );
  const expectedDriveTime = (distance / 1609.34) * 2; // Convert meters to miles, assume 2 min per mile

  return {
    driveTime: Math.min(gap, expectedDriveTime * 1.5), // Cap at 1.5x expected time
    gap,
    expectedDriveTime,
  };
}

/**
 * Calculate distance between coordinates (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Calculate overall route efficiency (work time / total time)
 */
export function calculateRouteEfficiency(timeBreakdown: TimeBreakdown): number {
  const totalTime =
    timeBreakdown.driveTime +
    timeBreakdown.workTime +
    timeBreakdown.breakTime +
    timeBreakdown.idleTime;

  if (totalTime === 0) return 0;

  return timeBreakdown.workTime / totalTime;
}

/**
 * Get performance summary for a route
 */
export function getPerformanceSummary(route: Route): {
  totalTime: number;
  driveTimePercentage: number;
  workTimePercentage: number;
  breakTimePercentage: number;
  efficiency: number;
  averageTimePerStop: number;
  fastestStop: StopAnalytics | null;
  slowestStop: StopAnalytics | null;
} {
  const timeBreakdown = calculateTimeBreakdown(route);
  const totalTime =
    timeBreakdown.driveTime +
    timeBreakdown.workTime +
    timeBreakdown.breakTime +
    timeBreakdown.idleTime;

  const efficiency = calculateRouteEfficiency(timeBreakdown);

  // Find fastest and slowest stops
  let fastestStop: StopAnalytics | null = null;
  let slowestStop: StopAnalytics | null = null;

  timeBreakdown.stopAnalytics.forEach(stop => {
    if (!fastestStop || stop.workDuration < fastestStop.workDuration) {
      fastestStop = stop;
    }
    if (!slowestStop || stop.workDuration > slowestStop.workDuration) {
      slowestStop = stop;
    }
  });

  const completedStops = route.stops.filter(stop => stop.status === 'completed').length;
  const averageTimePerStop = completedStops > 0 ? timeBreakdown.workTime / completedStops : 0;

  return {
    totalTime,
    driveTimePercentage: totalTime > 0 ? (timeBreakdown.driveTime / totalTime) * 100 : 0,
    workTimePercentage: totalTime > 0 ? (timeBreakdown.workTime / totalTime) * 100 : 0,
    breakTimePercentage: totalTime > 0 ? (timeBreakdown.breakTime / totalTime) * 100 : 0,
    efficiency,
    averageTimePerStop,
    fastestStop,
    slowestStop,
  };
}

/**
 * Format minutes into human-readable time string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}min`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}min`;
}

/**
 * Get time breakdown formatted for display
 */
export function getFormattedTimeBreakdown(route: Route): {
  drive: string;
  work: string;
  break: string;
  idle: string;
  total: string;
} {
  const breakdown = calculateTimeBreakdown(route);
  const total =
    breakdown.driveTime +
    breakdown.workTime +
    breakdown.breakTime +
    breakdown.idleTime;

  return {
    drive: formatDuration(breakdown.driveTime),
    work: formatDuration(breakdown.workTime),
    break: formatDuration(breakdown.breakTime),
    idle: formatDuration(breakdown.idleTime),
    total: formatDuration(total),
  };
}
