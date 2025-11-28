/**
 * Email Service
 * 
 * Handles sending email notifications to customers
 * Uses a backend API route to send emails (for security)
 */

import type { Customer } from './firebase-types'

/**
 * Send "running late" notification to customer
 */
export async function sendLateNotification(
  customer: Customer,
  delayMinutes: number,
  estimatedArrival?: string
): Promise<void> {
  if (!customer.billingInfo?.email) {
    console.warn(`No email address for customer ${customer.name}`)
    return
  }

  // Call API route to send email
  // TODO: Create API route at /app/api/emails/send-late/route.ts
  try {
    const response = await fetch('/api/emails/send-late', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerEmail: customer.billingInfo.email,
        customerName: customer.name,
        customerAddress: customer.address,
        delayMinutes,
        estimatedArrival,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to send late notification email')
    }
  } catch (error) {
    console.error('Error sending late notification:', error)
    // Don't throw - email failures shouldn't break the app
  }
}

/**
 * Send "service started" notification to customer
 */
export async function sendServiceStartedNotification(
  customer: Customer,
  estimatedCompletion?: string
): Promise<void> {
  if (!customer.billingInfo?.email) {
    console.warn(`No email address for customer ${customer.name}`)
    return
  }

  try {
    const response = await fetch('/api/emails/send-started', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerEmail: customer.billingInfo.email,
        customerName: customer.name,
        customerAddress: customer.address,
        estimatedCompletion,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to send service started email')
    }
  } catch (error) {
    console.error('Error sending service started notification:', error)
  }
}

/**
 * Send "scheduled today" notification to customer
 */
export async function sendServiceScheduledNotification(
  customer: Customer,
  scheduledTime: string,
  crewName?: string
): Promise<void> {
  if (!customer.billingInfo?.email) {
    console.warn(`No email address for customer ${customer.name}`)
    return
  }

  try {
    const response = await fetch('/api/emails/send-scheduled', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerEmail: customer.billingInfo.email,
        customerName: customer.name,
        customerAddress: customer.address,
        scheduledTime,
        crewName,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to send scheduled notification email')
    }
  } catch (error) {
    console.error('Error sending scheduled notification:', error)
  }
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

