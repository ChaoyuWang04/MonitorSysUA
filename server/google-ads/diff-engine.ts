/**
 * Deep Diff Engine
 *
 * This is a TypeScript port of the Python MVP's deep_diff algorithm.
 * It recursively compares two objects and returns all field-level differences.
 *
 * Reference: legacy mvp/googlemvptest.py:39-72 (see git history)
 */

export interface DiffResult {
  [key: string]: {
    old: any
    new: any
  }
}

/**
 * Recursively compare two objects and extract all field differences
 *
 * @param oldObj - The old/previous object state
 * @param newObj - The new/updated object state
 * @param prefix - The current field path (used for recursion)
 * @returns Object containing all changed fields with their old and new values
 */
export function deepDiff(
  oldObj: any,
  newObj: any,
  prefix: string = ''
): DiffResult {
  const diffs: DiffResult = {}

  // Get all unique keys from both objects
  const allKeys = new Set([
    ...Object.keys(oldObj || {}),
    ...Object.keys(newObj || {})
  ])

  for (const key of allKeys) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    const oldVal = oldObj?.[key]
    const newVal = newObj?.[key]

    // Skip if values are deeply equal
    if (deepEqual(oldVal, newVal)) {
      continue
    }

    // Case 1: Both are objects (not arrays, not null) - recurse
    if (isObject(oldVal) && isObject(newVal)) {
      const nested = deepDiff(oldVal, newVal, fullKey)
      Object.assign(diffs, nested)
      continue
    }

    // Case 2: Both are arrays - record entire array change
    // (don't diff individual items, as per MVP design)
    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      if (!deepEqual(oldVal, newVal)) {
        diffs[fullKey] = { old: oldVal, new: newVal }
      }
      continue
    }

    // Case 3: Basic field change (including type changes)
    diffs[fullKey] = { old: oldVal, new: newVal }
  }

  return diffs
}

/**
 * Deep equality check for any value
 *
 * @param a - First value
 * @param b - Second value
 * @returns true if values are deeply equal
 */
function deepEqual(a: any, b: any): boolean {
  // Strict equality check
  if (a === b) return true

  // Null/undefined handling
  if (a == null || b == null) return false

  // Type mismatch
  if (typeof a !== typeof b) return false

  // Array comparison
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((val, idx) => deepEqual(val, b[idx]))
  }

  // Object comparison
  if (isObject(a) && isObject(b)) {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) return false
    return keysA.every(key => deepEqual(a[key], b[key]))
  }

  // Primitive comparison
  return false
}

/**
 * Check if value is a plain object (not array, not null)
 *
 * @param val - Value to check
 * @returns true if value is a plain object
 */
function isObject(val: any): boolean {
  return val !== null && typeof val === 'object' && !Array.isArray(val)
}
