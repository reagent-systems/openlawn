/**
 * Email Templates
 * 
 * HTML email templates for customer notifications
 */

export function getLateNotificationTemplate(data: {
  customerName: string
  delayMinutes: number
  estimatedArrival?: string
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Service Update</h1>
        </div>
        <div class="content">
          <p>Hello ${data.customerName},</p>
          <p>We wanted to let you know that our crew is running approximately <strong>${data.delayMinutes} minutes</strong> behind schedule.</p>
          ${data.estimatedArrival ? `<p>We now expect to arrive at your location around <strong>${data.estimatedArrival}</strong>.</p>` : ''}
          <p>We apologize for any inconvenience and appreciate your patience.</p>
          <p>Thank you for your understanding!</p>
        </div>
        <div class="footer">
          <p>This is an automated notification from OpenLawn</p>
        </div>
      </div>
    </body>
    </html>
  `
}

export function getServiceStartedTemplate(data: {
  customerName: string
  estimatedCompletion?: string
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Service Started</h1>
        </div>
        <div class="content">
          <p>Hello ${data.customerName},</p>
          <p>Great news! Our crew has arrived and has started your service.</p>
          ${data.estimatedCompletion ? `<p>We expect to complete your service around <strong>${data.estimatedCompletion}</strong>.</p>` : ''}
          <p>Thank you for choosing OpenLawn!</p>
        </div>
        <div class="footer">
          <p>This is an automated notification from OpenLawn</p>
        </div>
      </div>
    </body>
    </html>
  `
}

export function getScheduledTodayTemplate(data: {
  customerName: string
  scheduledTime: string
  crewName?: string
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Service Scheduled Today</h1>
        </div>
        <div class="content">
          <p>Hello ${data.customerName},</p>
          <p>This is a reminder that your service is scheduled for today at <strong>${data.scheduledTime}</strong>.</p>
          ${data.crewName ? `<p>Your assigned crew is: <strong>${data.crewName}</strong></p>` : ''}
          <p>We look forward to serving you!</p>
        </div>
        <div class="footer">
          <p>This is an automated notification from OpenLawn</p>
        </div>
      </div>
    </body>
    </html>
  `
}

