"use client"

import * as React from 'react'
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  DirectionsRenderer,
} from '@react-google-maps/api'
import type { Customer } from '@/lib/firebase-types'
import { Loader2, AlertTriangle } from 'lucide-react'

interface RouteMapProps {
  customers: Customer[]
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

export function RouteMap({ customers, selectedCustomer, onSelectCustomer, apiKey }: RouteMapProps) {

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
      console.error("Error details:", {
        message: loadError.message,
        name: loadError.name,
        stack: loadError.stack
      });
    }
  }, [loadError]);

  React.useEffect(() => {
    console.log("Google Maps API Key:", apiKey ? "Present" : "Missing");
    console.log("Google Maps Loaded:", isLoaded);
    console.log("Google Maps Load Error:", loadError);
  }, [apiKey, isLoaded, loadError]);

  const [directionsResponse, setDirectionsResponse] =
    React.useState<google.maps.DirectionsResult | null>(null)
  
  const mapRef = React.useRef<google.maps.Map | null>(null)

  React.useEffect(() => {
    if (!isLoaded) return

    if (customers.length < 2) {
      setDirectionsResponse(null)
      if (mapRef.current && customers.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        customers.forEach(({ lat, lng }) => {
            bounds.extend(new google.maps.LatLng(lat, lng));
        });
        mapRef.current.fitBounds(bounds, 100);
      }
      return
    }

    const directionsService = new google.maps.DirectionsService()
    const origin = { lat: customers[0].lat, lng: customers[0].lng }
    const destination = {
      lat: customers[customers.length - 1].lat,
      lng: customers[customers.length - 1].lng,
    }
    const waypoints = customers.slice(1, -1).map((customer) => ({
      location: { lat: customer.lat, lng: customer.lng },
      stopover: true,
    }))

    directionsService.route(
      {
        origin: origin,
        destination: destination,
        waypoints: waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: true,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirectionsResponse(result)
          if (mapRef.current) {
            const bounds = result.routes[0].bounds;
            mapRef.current.fitBounds(bounds, 60);
          }
        } else {
          console.error(`Error fetching directions: ${status}`, result)
        }
      }
    )
  }, [customers, isLoaded])

  if (loadError) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center bg-destructive/10 text-destructive p-4">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <h2 className="text-lg font-semibold">Error Loading Map</h2>
        <p className="text-center text-sm">Could not load Google Maps. Please check the following:</p>
        <ul className="list-disc list-inside text-sm mt-2 text-left">
          <li>The API key in your <strong>.env</strong> file is correct.</li>
          <li>The <strong>Maps JavaScript API</strong> & <strong>Directions API</strong> are enabled.</li>
          <li>Billing is enabled for your Google Cloud project.</li>
          <li>There are no restrictive API key restrictions.</li>
        </ul>
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
      {directionsResponse ? (
        <DirectionsRenderer
          directions={directionsResponse}
          options={{
            suppressMarkers: true, 
            polylineOptions: {
              strokeColor: 'hsl(var(--accent))',
              strokeOpacity: 0.8,
              strokeWeight: 6,
            },
          }}
        />
      ) : null}

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
    </GoogleMap>
  )
}
