import { describe, it, expect } from 'vitest'
import { isMissingCustomerError } from './stripe-errors'

describe('isMissingCustomerError', () => {
  it('recognises Stripe\'s "No such customer" error', () => {
    expect(isMissingCustomerError({ code: 'resource_missing', param: 'customer' })).toBe(true)
  })

  it('ignores a missing price or any other error', () => {
    expect(isMissingCustomerError({ code: 'resource_missing', param: 'line_items[0][price]' })).toBe(false)
    expect(isMissingCustomerError({ code: 'api_connection_error' })).toBe(false)
    expect(isMissingCustomerError(new Error('boom'))).toBe(false)
  })

  it('ignores values that are not objects', () => {
    expect(isMissingCustomerError(null)).toBe(false)
    expect(isMissingCustomerError('resource_missing')).toBe(false)
  })
})
