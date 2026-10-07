"use client"

import * as React from 'react'
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  DirectionsRenderer,
  Polyline,
} from '@react-google-maps/api'
import type { Customer, User, DailyRoute } from '@/lib/firebase-types'
import { Loader2, AlertTriangle } from 'lucide-react'
import { flatRunSheetMapOptions } from '@/lib/flat-map-styles'

interface RouteDisplayProps {
  customers: Customer[]
  employees: User[]
  routes: DailyRoute[]
  selectedCustomer: Customer | null
  onSelectCustomer: (customer: Customer) => void
  onRouteClick?: (route: DailyRoute) => void
  baseLocation?: { lat: number; lng: number; address: string } | null
  apiKey?: string;
}

// Keep libraries constant to avoid reloading
const libraries: ("places")[] = ['places']

const containerStyle = {
  width: '100%',
  height: '100%',
}

const center = {
  lat: 27.6648,
  lng: -81.5158,
}

const mapOptions = flatRunSheetMapOptions

export function RouteDisplay({
  customers,
  employees,
  routes,
  selectedCustomer,
  onSelectCustomer,
  onRouteClick: _onRouteClick,
  baseLocation,
  apiKey
}: RouteDisplayProps) {
  
  React.useEffect(() => {
    if (!apiKey) {
      console.error("Google Maps API key is missing. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env file.");
    }
  }, [apiKey]);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || "",
    libraries
  })

  React.useEffect(() => {
    if (loadError) {
      console.error("Google Maps Load Error:", loadError);
    }
  }, [loadError]);

  const mapRef = React.useRef<google.maps.Map | null>(null)
  const [directionsResponses, setDirectionsResponses] = React.useState<google.maps.DirectionsResult[]>([])

  React.useEffect(() => {
    const map = mapRef.current
    if (!isLoaded || !map) return

    const points: { lat: number; lng: number }[] = []
    customers.forEach((customer) => {
      const lat = Number(customer.lat)
      const lng = Number(customer.lng)
      if (!isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0)) {
        points.push({ lat, lng })
      }
    })
    routes.forEach((route) => {
      (route.optimizedPath || []).forEach((point) => {
        const lat = Number(point.lat)
        const lng = Number(point.lng)
        if (!isNaN(lat) && !isNaN(lng)) points.push({ lat, lng })
      })
    })
    if (baseLocation) {
      const lat = Number(baseLocation.lat)
      const lng = Number(baseLocation.lng)
      if (!isNaN(lat) && !isNaN(lng)) points.push({ lat, lng })
    }
    if (points.length === 0) return

    const bounds = new google.maps.LatLngBounds()
    points.forEach((point) => bounds.extend(point))
    map.fitBounds(bounds, 48)
  }, [isLoaded, customers, routes, baseLocation])

  const routeStroke = '#6B7D50'

  // Check if a route is for today or tomorrow
  const isTodayRoute = (route: DailyRoute): boolean => {
    const today = new Date();
    const routeDate = new Date(route.date);
    return routeDate.toDateString() === today.toDateString();
  };

  // Generate directions for each route
  React.useEffect(() => {
    if (!isLoaded || routes.length === 0) return;

    console.log('RouteDisplay - Processing routes:', routes.length);
    console.log('RouteDisplay - Route details:', routes.map(r => ({
      crewId: r.crewId,
      customerCount: r.customers.length,
      customers: r.customers.map(c => c.name),
      date: r.date
    })));
    console.log('RouteDisplay - Base location:', baseLocation);

    const generateDirections = async () => {
      const directionsService = new google.maps.DirectionsService();
      const newDirectionsResponses: google.maps.DirectionsResult[] = [];

      for (const route of routes) {
        console.log('RouteDisplay - Processing route:', route.crewId, 'with', route.customers.length, 'customers');

        if (route.customers.length === 0) {
          console.log('RouteDisplay - Skipping route with no customers');
          continue;
        }

        try {
          // Determine origin and destination
          let origin: { lat: number; lng: number };
          let destination: { lat: number; lng: number };
          let waypoints: google.maps.DirectionsWaypoint[];

          if (baseLocation) {
            // Start and end at home base
            const baseLat = Number(baseLocation.lat);
            const baseLng = Number(baseLocation.lng);

            if (isNaN(baseLat) || isNaN(baseLng)) {
              console.warn('Invalid base location coordinates, falling back to customer route');
              origin = { lat: Number(route.customers[0].lat), lng: Number(route.customers[0].lng) };
              destination = {
                lat: Number(route.customers[route.customers.length - 1].lat),
                lng: Number(route.customers[route.customers.length - 1].lng)
              };
              waypoints = route.customers.slice(1, -1).map(customer => ({
                location: { lat: Number(customer.lat), lng: Number(customer.lng) },
                stopover: true,
              }));
            } else {
              origin = { lat: baseLat, lng: baseLng };
              destination = { lat: baseLat, lng: baseLng };
              // All customers become waypoints
              waypoints = route.customers.map(customer => ({
                location: { lat: Number(customer.lat), lng: Number(customer.lng) },
                stopover: true,
              }));
              console.log('RouteDisplay - Using home base as origin/destination');
            }
          } else {
            // Fallback: customer to customer (old behavior)
            if (route.customers.length < 2) {
              console.log('RouteDisplay - Skipping route with less than 2 customers and no base location');
              continue;
            }
            origin = { lat: Number(route.customers[0].lat), lng: Number(route.customers[0].lng) };
            destination = {
              lat: Number(route.customers[route.customers.length - 1].lat),
              lng: Number(route.customers[route.customers.length - 1].lng)
            };
            waypoints = route.customers.slice(1, -1).map(customer => ({
              location: { lat: Number(customer.lat), lng: Number(customer.lng) },
              stopover: true,
            }));
          }

          const result = await directionsService.route({
            origin,
            destination,
            waypoints,
            travelMode: google.maps.TravelMode.DRIVING,
            optimizeWaypoints: false, // Disable optimization to keep routes separate
          });

          newDirectionsResponses.push(result);
        } catch (error) {
          console.error('Error generating directions for route:', route.crewId, error);
        }
      }

      setDirectionsResponses(newDirectionsResponses);
    };

    generateDirections();
  }, [routes, isLoaded, baseLocation]);

  if (loadError) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center bg-destructive/10 text-destructive p-4">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <h2 className="text-lg font-semibold">Error Loading Map</h2>
        <p className="text-center text-sm">Could not load Google Maps. Please check your API key and settings.</p>
        <p className="mt-4 text-xs text-destructive/80">Error: {loadError.message}</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#eef1e8]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={12}
      options={mapOptions}
      onLoad={(map) => {mapRef.current = map}}
    >
      {/* Customer markers — numbered olive pins for routed stops */}
      {customers.map((customer) => {
        const lat = Number(customer.lat);
        const lng = Number(customer.lng);
        if (isNaN(lat) || isNaN(lng)) return null;

        let stopNumber: number | null = null;
        for (const route of routes) {
          const idx = route.customers.findIndex((c) => c.id === customer.id);
          if (idx >= 0) {
            stopNumber = idx + 1;
            break;
          }
        }

        const selected = selectedCustomer?.id === customer.id;

        return (
          <Marker
            key={customer.id}
            position={{ lat, lng }}
            title={customer.name}
            onClick={() => onSelectCustomer(customer)}
            label={
              stopNumber != null
                ? {
                    text: String(stopNumber),
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: '700',
                  }
                : undefined
            }
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: selected ? 14 : stopNumber != null ? 12 : 7,
              fillColor: selected ? '#4A5A34' : routeStroke,
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#ffffff',
              labelOrigin: new google.maps.Point(0, 0),
            }}
          />
        );
      })}

      {/* Employee location markers */}
      {employees.map((employee) => {
        if (!employee.currentLocation) return null;

        const lat = Number(employee.currentLocation.lat);
        const lng = Number(employee.currentLocation.lng);

        if (isNaN(lat) || isNaN(lng)) {
          console.warn(`Invalid coordinates for employee ${employee.name}:`, employee.currentLocation);
          return null;
        }

        return (
          <Marker
            key={`employee-${employee.id}`}
            position={{ lat, lng }}
            title={employee.name}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: 'hsl(var(--accent))',
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: 'white',
            }}
          />
        );
      })}

      {/* Home base marker */}
      {baseLocation && (() => {
        const lat = Number(baseLocation.lat);
        const lng = Number(baseLocation.lng);

        if (isNaN(lat) || isNaN(lng)) {
          console.warn('Invalid coordinates for base location:', baseLocation);
          return null;
        }

        return (
          <Marker
            position={{ lat, lng }}
            title={`Home Base: ${baseLocation.address}`}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: '#10b981', // Green color for home base
              fillOpacity: 1,
              strokeWeight: 3,
              strokeColor: '#ffffff',
            }}
            label={{
              text: '🏠',
              fontSize: '20px',
              color: '#ffffff',
            }}
          />
        );
      })()}

      {/* Route directions */}
      {directionsResponses.map((directionsResponse, index) => {
        const route = routes[index];
        const isToday = isTodayRoute(route);
        
        return (
          <DirectionsRenderer
            key={`directions-${index}`}
            directions={directionsResponse}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: routeStroke,
                strokeOpacity: isToday ? 0.9 : 0.35,
                strokeWeight: isToday ? 4 : 2,
                clickable: !isToday,
              },
            }}
          />
        );
      })}

      {/* Fallback path when Directions API is unavailable */}
      {directionsResponses.length === 0 && routes.map((route) => {
        const path = (route.optimizedPath || [])
          .map((point) => ({ lat: Number(point.lat), lng: Number(point.lng) }))
          .filter((point) => !isNaN(point.lat) && !isNaN(point.lng));
        if (path.length < 2) return null;
        const isToday = isTodayRoute(route);
        return (
          <Polyline
            key={`path-${route.crewId}`}
            path={path}
            options={{
              strokeColor: routeStroke,
              strokeOpacity: isToday ? 0.9 : 0.35,
              strokeWeight: isToday ? 4 : 2,
            }}
          />
        );
      })}
    </GoogleMap>
  )
} 