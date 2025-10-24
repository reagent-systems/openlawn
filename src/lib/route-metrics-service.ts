import { getFirebaseDb } from './firebase';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import type { RouteMetrics, Route } from './types';

/**
 * Save route metrics to Firebase
 */
export async function saveRouteMetrics(
  route: Route,
  companyId: string
): Promise<string> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not initialized');

  // Calculate metrics from route
  let totalDriveTime = 0;
  let totalWorkTime = 0;
  const totalBreakTime = 0;

  const stopMetrics = route.stops.map(stop => {
    const driveTime = stop.driveTime || 0;
    const workTime = stop.workTime || 0;

    totalDriveTime += driveTime;
    totalWorkTime += workTime;

    const efficiency = (driveTime + workTime) > 0
      ? workTime / (driveTime + workTime)
      : 0;

    return {
      customerId: stop.customerId,
      driveTime,
      workTime,
      efficiency
    };
  });

  const totalTime = totalDriveTime + totalWorkTime + totalBreakTime;
  const efficiency = totalTime > 0 ? totalWorkTime / totalTime : 0;

  const metrics: Omit<RouteMetrics, 'id'> = {
    companyId,
    crewId: route.crewId,
    routeId: route.id,
    date: Timestamp.fromDate(route.date),
    totalDriveTime,
    totalWorkTime,
    totalBreakTime,
    efficiency,
    stopMetrics,
    recordedAt: serverTimestamp() as any
  };

  const docRef = await addDoc(collection(db, 'route_metrics'), metrics);
  return docRef.id;
}

/**
 * Get route metrics for a specific date range
 */
export async function getRouteMetrics(
  companyId: string,
  startDate: Date,
  endDate: Date
): Promise<RouteMetrics[]> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not initialized');

  const q = query(
    collection(db, 'route_metrics'),
    where('companyId', '==', companyId),
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate)),
    orderBy('date', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as RouteMetrics[];
}

/**
 * Get route metrics for a specific crew
 */
export async function getCrewRouteMetrics(
  companyId: string,
  crewId: string,
  startDate: Date,
  endDate: Date
): Promise<RouteMetrics[]> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not initialized');

  const q = query(
    collection(db, 'route_metrics'),
    where('companyId', '==', companyId),
    where('crewId', '==', crewId),
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate)),
    orderBy('date', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as RouteMetrics[];
}

/**
 * Format route metrics for export (CSV format)
 */
export function formatMetricsForExport(metrics: RouteMetrics[]): string {
  if (metrics.length === 0) {
    return 'No data available for export';
  }

  // CSV header
  let csv = 'Date,Crew ID,Route ID,Drive Time (min),Work Time (min),Break Time (min),Efficiency (%),Customer Stops\n';

  // Add each route's summary
  metrics.forEach(metric => {
    const date = metric.date instanceof Date
      ? metric.date.toLocaleDateString()
      : new Date((metric.date as any).seconds * 1000).toLocaleDateString();

    csv += `${date},${metric.crewId},${metric.routeId},${metric.totalDriveTime.toFixed(1)},${metric.totalWorkTime.toFixed(1)},${metric.totalBreakTime.toFixed(1)},${(metric.efficiency * 100).toFixed(1)}%,${metric.stopMetrics.length}\n`;
  });

  csv += '\n\nDetailed Stop Breakdown\n';
  csv += 'Date,Crew ID,Customer ID,Drive Time (min),Work Time (min),Efficiency (%)\n';

  // Add detailed stop information
  metrics.forEach(metric => {
    const date = metric.date instanceof Date
      ? metric.date.toLocaleDateString()
      : new Date((metric.date as any).seconds * 1000).toLocaleDateString();

    metric.stopMetrics.forEach(stop => {
      csv += `${date},${metric.crewId},${stop.customerId},${stop.driveTime.toFixed(1)},${stop.workTime.toFixed(1)},${(stop.efficiency * 100).toFixed(1)}%\n`;
    });
  });

  return csv;
}

/**
 * Download metrics as CSV file
 */
export function downloadMetricsCSV(metrics: RouteMetrics[], filename: string = 'route-metrics.csv') {
  const csv = formatMetricsForExport(metrics);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
