"use client"

import * as React from 'react'
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Polyline,
} from '@react-google-maps/api'
import type { Customer, User } from '@/lib/firebase-types'
import { Loader2, AlertTriangle } from 'lucide-react'

interface ManagerMapProps {
  customers: Customer[]
  employees: User[]
  routes?: any[] // Add routes prop
  selectedCustomer: Customer | null
  onSelectCustomer: (customer: Customer) => void
  apiKey?: string;
}

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

// Keep libraries constant to avoid reloading
const libraries: ("places")[] = ['places']

export function ManagerMap({
  customers,
  employees,
  routes = [],
  selectedCustomer,
  onSelectCustomer,
  apiKey
}: ManagerMapProps) {

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

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={12}
      options={mapOptions}
      onLoad={(map) => {mapRef.current = map}}
    >
      {/* Customer markers */}
      {customers.map((customer) => (
        <Marker
          key={customer.id}
          position={{ lat: customer.lat, lng: customer.lng }}
          title={customer.name}
          onClick={() => onSelectCustomer(customer)}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: selectedCustomer?.id === customer.id ? 10 : 7,
            fillColor: selectedCustomer?.id === customer.id ? 'hsl(var(--ring))' : 'hsl(var(--primary))',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: 'white',
          }}
        />
      ))}

      {/* Employee location markers */}
      {employees.map((employee) => {
        if (!employee.currentLocation) return null;

        return (
          <Marker
            key={`employee-${employee.id}`}
            position={{ 
              lat: employee.currentLocation.lat, 
              lng: employee.currentLocation.lng 
            }}
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

      {/* Route lines */}
      {routes.map((route, index) => {
        console.log('Rendering route:', route);
        if (!route.optimizedPath || route.optimizedPath.length < 2) {
          console.log('Route skipped - no optimizedPath or insufficient points:', route);
          return null;
        }

        return (
          <Polyline
            key={`route-${index}`}
            path={route.optimizedPath}
            options={{
              strokeColor: '#3B82F6',
              strokeOpacity: 0.8,
              strokeWeight: 3,
            }}
          />
        );
      })}
    </GoogleMap>
  )
} 
 