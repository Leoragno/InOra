import { useCallback, useState } from 'react'
import { acquireRefinedPosition } from '../lib/gpsRefine'
import type { GeoResult, GeoStatus } from '../types'

interface GeolocationState {
  status: GeoStatus
  result: GeoResult | null
  error: string | null
  progress: { accuracy: number; readings: number } | null
}

const UNAVAILABLE_MESSAGE = 'Il GPS non è disponibile su questo dispositivo.'

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({ status: 'idle', result: null, error: null, progress: null })

  const locate = useCallback((): Promise<GeoResult | null> => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        setState({ status: 'unavailable', result: null, error: UNAVAILABLE_MESSAGE, progress: null })
        resolve(null)
        return
      }
      setState((s) => ({ ...s, status: 'locating', error: null, progress: null }))
      acquireRefinedPosition((accuracy, readings) => {
        setState((s) => ({ ...s, progress: { accuracy, readings } }))
      }).then((pos) => {
        if (!pos) {
          setState({ status: 'unavailable', result: null, error: UNAVAILABLE_MESSAGE, progress: null })
          resolve(null)
          return
        }
        const result: GeoResult = { latitude: pos.latitude, longitude: pos.longitude, accuracy: pos.accuracy }
        setState({ status: 'ok', result, error: null, progress: { accuracy: pos.accuracy, readings: pos.readings } })
        resolve(result)
      })
    })
  }, [])

  return { ...state, locate }
}
