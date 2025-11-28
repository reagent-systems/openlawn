"use client"

import * as React from 'react'
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  DirectionsRenderer,
} from '@react-google-maps/api'
import type { Customer, User, DailyRoute } from '@/lib/firebase-types'
import { Loader2, AlertTriangle, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generateGoogleMapsRouteUrl } from '@/lib/maps-utils'

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

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  styles: [
    {
      featureType: 'poi',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'transit',
      stylers: [{ visibility: 'off' }],
    },
    {
        featureType: "road",
        elementType: "labels.icon",
        stylers: [{ visibility: "off" }]
    }
  ],
}

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
  const [selectedRouteIndex, _setSelectedRouteIndex] = React.useState<number | null>(null)

  // Generate a color based on crewId
  const generateColor = (crewId: string): string => {
    let hash = 0;
    for (let i = 0; i < crewId.length; i++) {
      hash = crewId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };

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
      <div className="flex h-full w-full items-center justify-center bg-gray-200">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  // Handle opening route in Google Maps
  const handleOpenInGoogleMaps = () => {
    if (routes.length === 0) return
    
    // If there's a selected route (tomorrow route), use that
    // Otherwise use the first route (today's route)
    const routeToOpen = selectedRouteIndex !== null 
      ? routes[selectedRouteIndex] 
      : routes.find(r => isTodayRoute(r)) || routes[0]
    
    if (!routeToOpen) return
    
    const url = generateGoogleMapsRouteUrl(routeToOpen, baseLocation)
    window.open(url, '_blank')
  }

  return (
    <div className="relative h-full w-full">
      {/* Floating action button to open in Google Maps */}
      {routes.length > 0 && (
        <Button
          onClick={handleOpenInGoogleMaps}
          className="absolute top-4 right-4 z-10 shadow-lg"
          size="sm"
          variant="default"
        >
          <MapPin className="w-4 h-4 mr-2" />
          Open in Google Maps
        </Button>
      )}
      
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        options={mapOptions}
        onLoad={(map) => {mapRef.current = map}}
      >
      {/* Customer markers */}
      {customers.map((customer) => {
        // Ensure lat/lng are numbers
        const lat = Number(customer.lat);
        const lng = Number(customer.lng);

        // Skip if invalid coordinates
        if (isNaN(lat) || isNaN(lng)) {
          console.warn(`Invalid coordinates for customer ${customer.name}:`, customer.lat, customer.lng);
          return null;
        }

        // Check if this customer is in the selected tomorrow route
        const isInSelectedRoute = selectedRouteIndex !== null &&
          routes[selectedRouteIndex]?.customers.some(c => c.id === customer.id);

        return (
          <Marker
            key={customer.id}
            position={{ lat, lng }}
            title={customer.name}
            onClick={() => onSelectCustomer(customer)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: selectedCustomer?.id === customer.id ? 10 : isInSelectedRoute ? 9 : 7,
              fillColor: selectedCustomer?.id === customer.id ? 'hsl(var(--ring))' :
                        isInSelectedRoute ? 'hsl(var(--accent))' : 'hsl(var(--primary))',
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: 'white',
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
        const color = generateColor(route.crewId);
        const isToday = isTodayRoute(route);
        
        return (
          <DirectionsRenderer
            key={`directions-${index}`}
            directions={directionsResponse}
            options={{
              suppressMarkers: true, // We're using our own markers
              polylineOptions: {
                strokeColor: color,
                strokeOpacity: isToday ? 0.8 : 0.3, // Solid for today, transparent for tomorrow
                strokeWeight: isToday ? 4 : 2,
                clickable: !isToday, // Only tomorrow routes are clickable
              },
            }}
          />
        );
      })}
      </GoogleMap>
    </div>
  )
} 