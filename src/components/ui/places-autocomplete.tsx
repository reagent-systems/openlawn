"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { useRef, useEffect, useState } from "react"
import { googleMapsConfig } from "@/lib/env"

interface PlacesAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  onPlaceSelect?: (place: google.maps.places.PlaceResult) => void
}

declare global {
  interface Window {
    google: any
  }
}

export function PlacesAutocomplete({
  value,
  onChange,
  placeholder = "Enter address...",
  className,
  disabled = false,
  onPlaceSelect,
}: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Check if Google Maps API is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsLoaded(true)
      return
    }

    // Load Google Maps API if not already loaded
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsConfig.apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => setIsLoaded(true)
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  useEffect(() => {
    if (!isLoaded || !inputRef.current || disabled) return

    // Create autocomplete instance
    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      componentRestrictions: { country: "us" }, // Restrict to US addresses
    })

    // Add place_changed event listener
    if (!autocompleteRef.current) return;

    const listener = autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace()
      console.log("Place selected:", place)
      if (place && place.formatted_address) {
        console.log("Setting address to:", place.formatted_address)
        onChange(place.formatted_address)
        onPlaceSelect?.(place)
      } else {
        console.log("No formatted address found in place:", place)
      }
    })

    // Add CSS to ensure autocomplete dropdown is visible and clickable
    const style = document.createElement('style')
    style.textContent = `
      .pac-container {
        z-index: 99999 !important;
        position: fixed !important;
        background: white !important;
        border: 1px solid #ccc !important;
        border-radius: 4px !important;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important;
        font-family: inherit !important;
        pointer-events: auto !important;
      }
      .pac-item {
        padding: 8px 12px !important;
        cursor: pointer !important;
        border-bottom: 1px solid #f0f0f0 !important;
        pointer-events: auto !important;
      }
      .pac-item:hover {
        background-color: #f5f5f5 !important;
      }
      .pac-item:last-child {
        border-bottom: none !important;
      }
      .pac-item-query {
        font-weight: 500 !important;
        color: #333 !important;
      }
      .pac-matched {
        font-weight: bold !important;
        color: #000 !important;
      }
    `
    document.head.appendChild(style)

    // Prevent clicks on autocomplete from closing the sheet
    const handlePacClick = (e: Event) => {
      const target = e.target as Element
      if (target.closest('.pac-container') || target.closest('.pac-item')) {
        e.stopPropagation()
      }
    }

    // Add event listeners to prevent sheet closing only for autocomplete elements
    document.addEventListener('click', handlePacClick, true)
    document.addEventListener('mousedown', handlePacClick, true)

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.removeListener(listener)
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
      // Remove the style when component unmounts
      if (style.parentNode) {
        style.parentNode.removeChild(style)
      }
      // Remove event listeners
      document.removeEventListener('click', handlePacClick, true)
      document.removeEventListener('mousedown', handlePacClick, true)
    }
  }, [isLoaded, onChange, onPlaceSelect, disabled])

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        disabled={disabled || !isLoaded}
      />
    </div>
  )
} 