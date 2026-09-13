// Porting di hapticFeedback() dalla vecchia app — stessi pattern di vibrazione.
type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error'

const PATTERNS: Record<HapticType, number | number[]> = {
  light: 20,
  medium: 50,
  heavy: 100,
  success: [50, 30, 50],
  error: [100, 50, 100],
}

export function haptic(type: HapticType = 'light'): void {
  if (!navigator.vibrate) return
  navigator.vibrate(PATTERNS[type])
}
