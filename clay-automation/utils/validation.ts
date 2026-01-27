// Input validation utilities

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && value > 0 && !isNaN(value)
}

export function validateRequired<T>(
  value: T | undefined | null,
  fieldName: string
): asserts value is T {
  if (value === undefined || value === null) {
    throw new Error(`${fieldName} is required`)
  }
}

export function validateOneOf<T>(
  value: T,
  allowedValues: readonly T[],
  fieldName: string
): void {
  if (!allowedValues.includes(value)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}`)
  }
}

export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): void {
  if (value < min || value > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`)
  }
}

export function validateArray<T>(
  value: unknown,
  fieldName: string,
  itemValidator?: (item: unknown) => item is T
): asserts value is T[] {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array`)
  }

  if (itemValidator) {
    for (let i = 0; i < value.length; i++) {
      if (!itemValidator(value[i])) {
        throw new Error(`${fieldName}[${i}] is invalid`)
      }
    }
  }
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9_.-]/gi, '_')
    .replace(/_+/g, '_')
    .slice(0, 255)
}

export function sanitizeTableName(name: string): string {
  return name
    .replace(/[^\w\s-]/g, '')
    .trim()
    .slice(0, 100)
}

export default {
  isValidEmail,
  isValidUrl,
  isNonEmptyString,
  isPositiveNumber,
  validateRequired,
  validateOneOf,
  validateRange,
  validateArray,
  sanitizeFilename,
  sanitizeTableName,
}
