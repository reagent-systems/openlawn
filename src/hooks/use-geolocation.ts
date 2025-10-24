"use client"

import { useState, useEffect, useCallback } from 'react'

interface GeolocationState {
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  timestamp: number | null
  error: string | null
  isTracking: boolean
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

export function useGeolocation(options: GeolocationOptions = {}) {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
    error: null,
    isTracking: false,
  })

  const [watchId, setWatchId] = useState<number | null>(null)

  const onSuccess = useCallback((position: GeolocationPosition) => {
    setState({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
      error: null,
      isTracking: true,
    })
  }, [])

  const onError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = 'Unknown error occurred'
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied'
        break
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable'
        break
      case error.TIMEOUT:
        errorMessage = 'Location request timed out'
        break
    }

    setState(prev => ({
      ...prev,
      error: errorMessage,
      isTracking: false,
    }))
  }, [])

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by this browser',
        isTracking: false,
      }))
      return
    }

    const defaultOptions: GeolocationOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
      ...options,
    }

    try {
      const id = navigator.geolocation.watchPosition(
        onSuccess,
        onError,
        defaultOptions
      )
      setWatchId(id)
      setState(prev => ({ ...prev, isTracking: true }))
    } catch {
      setState(prev => ({
        ...prev,
        error: 'Failed to start location tracking',
        isTracking: false,
      }))
    }
  }, [onSuccess, onError, options])

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      setWatchId(null)
      setState(prev => ({ ...prev, isTracking: false }))
    }
  }, [watchId])

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by this browser',
      }))
      return Promise.reject(new Error('Geolocation not supported'))
    }

    const defaultOptions: GeolocationOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
      ...options,
    }

    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, defaultOptions)
    })
  }, [options])

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [watchId])

  return {
    ...state,
    startTracking,
    stopTracking,
    getCurrentPosition,
  }
} 
 