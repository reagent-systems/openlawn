/**
 * Payment Service
 * 
 * Handles Stripe payment processing for customer payments
 */

import type { Customer, PaymentRecord } from './firebase-types'
import { Timestamp } from 'firebase/firestore'

// Note: In production, Stripe API calls should be made from a backend API route
// This is a client-side service that will call Next.js API routes

/**
 * Create a payment intent for a customer payment
 * This should call a Next.js API route that uses Stripe server-side
 */
export async function createPaymentIntent(
  amount: number,
  customerId: string,
  customerEmail?: string
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  // In production, this would call: /api/payments/create-intent
  // For now, return a mock response structure
  // TODO: Implement API route at /app/api/payments/create-intent/route.ts
  
  const response = await fetch('/api/payments/create-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100), // Convert to cents
      customerId,
      customerEmail,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to create payment intent')
  }

  return response.json()
}

/**
 * Process a payment for a customer
 * Records the payment in Firestore
 */
export async function processPayment(
  amount: number,
  customerId: string,
  employeeId: string,
  employeeName: string,
  paymentMethod: 'card' | 'cash' | 'check' | 'other',
  stripePaymentIntentId?: string,
  notes?: string
): Promise<PaymentRecord> {
  const { updateDocument, getDocument } = await import('./firebase-services')
  
  // Get customer to update payment history
  const customer = await getDocument('customers', customerId) as Customer | null
  if (!customer) {
    throw new Error('Customer not found')
  }

  // Create payment record
  const paymentRecord: PaymentRecord = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    amount,
    date: Timestamp.now(),
    employeeId,
    employeeName,
    paymentMethod,
    stripePaymentIntentId,
    notes,
    status: 'completed',
  }

  // Update customer with payment history
  const updatedPaymentHistory = [...(customer.paymentHistory || []), paymentRecord]
  
  await updateDocument('customers', customerId, {
    paymentHistory: updatedPaymentHistory,
  })

  return paymentRecord
}

/**
 * Get payment history for a customer
 */
export async function getPaymentHistory(customerId: string): Promise<PaymentRecord[]> {
  const { getDocument } = await import('./firebase-services')
  
  const customer = await getDocument('customers', customerId) as Customer | null
  if (!customer) {
    return []
  }

  return customer.paymentHistory || []
}

/**
 * Get total payments for a customer (sum of all payments)
 */
export function getTotalPayments(paymentHistory: PaymentRecord[]): number {
  return paymentHistory
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)
}

/**
 * Format amount as currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

