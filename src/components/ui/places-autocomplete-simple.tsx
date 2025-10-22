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

export function PlacesAutocompleteSimple({
  value,
  onChange,
  placeholder = "Enter address...",
  className,
  disabled = false,
  onPlaceSelect,
}: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [showPredictions, setShowPredictions] = useState(false)

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
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  const getPlacePredictions = async (input: string) => {
    if (!isLoaded || !input || input.length < 3) {
      setPredictions([])
      setShowPredictions(false)
      return
    }

    const service = new window.google.maps.places.AutocompleteService()
    
    service.getPlacePredictions({
      input,
      types: ['address'],
      componentRestrictions: { country: 'us' }
    }, (predictions: any, status: any) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
        setPredictions(predictions)
        setShowPredictions(true)
      } else {
        setPredictions([])
        setShowPredictions(false)
      }
    })
  }

  const selectPlace = async (prediction: google.maps.places.AutocompletePrediction) => {
    const service = new window.google.maps.places.PlacesService(document.createElement('div'))
    
    service.getDetails({
      placeId: prediction.place_id
    }, (place: any, status: any) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
        console.log("Place details:", place)
        if (place.formatted_address) {
          onChange(place.formatted_address)
          onPlaceSelect?.(place)
        }
      }
    })
    
    setShowPredictions(false)
    setPredictions([])
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    getPlacePredictions(newValue)
  }

  const handleInputFocus = () => {
    if (value.length >= 3) {
      setShowPredictions(true)
    }
  }

  const handleInputBlur = () => {
    // Delay hiding to allow clicking on predictions
    setTimeout(() => {
      setShowPredictions(false)
    }, 200)
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        className={className}
        disabled={disabled || !isLoaded}
      />
      
      {showPredictions && predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
          {predictions.map((prediction) => (
            <div
              key={prediction.place_id}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
              onMouseDown={(e) => {
                e.preventDefault()
                selectPlace(prediction)
              }}
            >
              <div className="font-medium">{prediction.structured_formatting?.main_text}</div>
              <div className="text-sm text-gray-500">{prediction.structured_formatting?.secondary_text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 