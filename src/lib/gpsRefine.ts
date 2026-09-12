// Acquisizione GPS "a raffinamento" — porting fedele della strategia della
// vecchia app: non si accontenta della prima lettura, ne raccoglie diverse
// per qualche secondo e tiene una media pesata delle più precise, finché non
// raggiunge una precisione buona o scade il tempo massimo. Non fallisce mai
// "silenziosamente": nel caso peggiore restituisce la miglior lettura
// disponibile invece di null, cosicché la timbratura possa sempre procedere.

export const GPS_CONFIG = {
  MAX_WAIT_TIME: 20000,
  FIRST_READING_TIMEOUT: 6000,
  REFINEMENT_TIMEOUT: 12000,
  GOOD_ACCURACY_THRESHOLD: 40,
  ACCEPTABLE_ACCURACY: 120,
  DISTANCE_BUFFER: 40,
} as const

export interface RefinedPosition {
  latitude: number
  longitude: number
  accuracy: number
  readings: number
}

type Progress = (accuracy: number, readings: number) => void

function weightedBest(all: GeolocationPosition[], fallback: GeolocationPosition | null): GeolocationPosition | null {
  const good = all.filter((p) => p.coords.accuracy < 200)
  if (!good.length) return fallback
  let totalWeight = 0
  let avgLat = 0
  let avgLon = 0
  for (const p of good) {
    const weight = 1 / Math.max(p.coords.accuracy, 1)
    totalWeight += weight
    avgLat += p.coords.latitude * weight
    avgLon += p.coords.longitude * weight
  }
  if (totalWeight <= 0) return fallback
  const minAccuracy = good.reduce((min, p) => Math.min(min, p.coords.accuracy), 999)
  return {
    coords: { latitude: avgLat / totalWeight, longitude: avgLon / totalWeight, accuracy: minAccuracy },
  } as GeolocationPosition
}

export function acquireRefinedPosition(onProgress?: Progress): Promise<RefinedPosition | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(null)
      return
    }

    let bestPos: GeolocationPosition | null = null
    let allPositions: GeolocationPosition[] = []
    let watchId: number | null = null
    let gpsTimer: ReturnType<typeof setTimeout> | null = null
    let refinementTimer: ReturnType<typeof setTimeout> | null = null
    let done = false

    function cleanup() {
      if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null }
      if (gpsTimer !== null) { clearTimeout(gpsTimer); gpsTimer = null }
      if (refinementTimer !== null) { clearTimeout(refinementTimer); refinementTimer = null }
    }

    function finish(pos: GeolocationPosition | null) {
      if (done) return
      done = true
      cleanup()
      const final = weightedBest(allPositions, bestPos) ?? pos
      if (!final) { resolve(null); return }
      resolve({
        latitude: final.coords.latitude,
        longitude: final.coords.longitude,
        accuracy: Math.round(final.coords.accuracy),
        readings: allPositions.length,
      })
    }

    function startRefinement() {
      refinementTimer = setTimeout(() => {
        finish(bestPos ?? allPositions[allPositions.length - 1] ?? null)
      }, GPS_CONFIG.REFINEMENT_TIMEOUT)

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (done) return
          allPositions.push(pos)
          if (!bestPos || pos.coords.accuracy < bestPos.coords.accuracy) bestPos = pos
          onProgress?.(Math.round(pos.coords.accuracy), allPositions.length)
          if (pos.coords.accuracy <= GPS_CONFIG.GOOD_ACCURACY_THRESHOLD) finish(pos)
          else if (allPositions.length >= 5 && pos.coords.accuracy <= GPS_CONFIG.ACCEPTABLE_ACCURACY) finish(pos)
        },
        () => { if (bestPos && !done) finish(bestPos) },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 },
      )
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        bestPos = pos
        allPositions.push(pos)
        const acc = Math.round(pos.coords.accuracy)
        onProgress?.(acc, 1)
        if (acc <= GPS_CONFIG.GOOD_ACCURACY_THRESHOLD) finish(pos)
        else startRefinement()
      },
      () => {
        startRefinement()
        gpsTimer = setTimeout(() => {
          if (!done) finish(allPositions[allPositions.length - 1] ?? bestPos ?? null)
        }, GPS_CONFIG.MAX_WAIT_TIME)
      },
      { enableHighAccuracy: true, timeout: GPS_CONFIG.FIRST_READING_TIMEOUT, maximumAge: 5000 },
    )
  })
}
