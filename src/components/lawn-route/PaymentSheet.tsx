"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { CreditCard, DollarSign, Loader2 } from "lucide-react"
import type { Customer } from "@/lib/firebase-types"
import { useAuth } from "@/hooks/use-auth"
import { processPayment, formatCurrency } from "@/lib/payment-service"

interface PaymentSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer | null
  onPaymentComplete?: () => void
}

const formSchema = z.object({
  amount: z.number().min(0.01, { message: "Amount must be greater than 0" }),
  paymentMethod: z.enum(['card', 'cash', 'check', 'other']),
  notes: z.string().optional(),
})

export function PaymentSheet({
  open,
  onOpenChange,
  customer,
  onPaymentComplete
}: PaymentSheetProps) {
  const { toast } = useToast()
  const { userProfile } = useAuth()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isProcessingStripe, setIsProcessingStripe] = React.useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      amount: customer?.monthlyRate || 0,
      paymentMethod: 'card',
      notes: '',
    },
  })

  // Update amount when customer changes
  React.useEffect(() => {
    if (customer?.monthlyRate) {
      form.setValue('amount', customer.monthlyRate)
    }
  }, [customer, form])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!customer || !userProfile) {
      toast({
        title: "Error",
        description: "Customer or user information missing",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      if (values.paymentMethod === 'card') {
        // For card payments, we would integrate Stripe Elements here
        // For now, show a message that Stripe integration is needed
        setIsProcessingStripe(true)
        
        // TODO: Integrate Stripe Elements for card payment
        // This would involve:
        // 1. Creating a payment intent via API route
        // 2. Using Stripe Elements to collect card details
        // 3. Confirming the payment
        // 4. Recording the payment
        
        toast({
          title: "Stripe Integration Needed",
          description: "Card payment processing requires Stripe API setup. Please use cash or check for now.",
          variant: "destructive",
        })
        setIsProcessingStripe(false)
        return
      }

      // For non-card payments (cash, check, other), process directly
      await processPayment(
        values.amount,
        customer.id,
        userProfile.id,
        userProfile.name || userProfile.email,
        values.paymentMethod,
        undefined, // No Stripe payment intent ID for non-card payments
        values.notes
      )

      toast({
        title: "Payment Recorded",
        description: `Payment of ${formatCurrency(values.amount)} recorded successfully.`,
      })

      form.reset()
      onPaymentComplete?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Error processing payment:', error)
      toast({
        title: "Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      setIsProcessingStripe(false)
    }
  }

  if (!customer) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-lg max-h-[90svh] overflow-y-auto"
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <SheetHeader className="text-left">
              <SheetTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Take Payment
              </SheetTitle>
              <SheetDescription>
                Record payment for {customer.name}
              </SheetDescription>
            </SheetHeader>

            <div className="grid gap-4 py-6">
              {/* Customer Monthly Rate Display */}
              {customer.monthlyRate && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Monthly Rate:</span>
                    </div>
                    <span className="text-lg font-bold text-blue-800">
                      {formatCurrency(customer.monthlyRate)}
                    </span>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Amount ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value)
                          field.onChange(isNaN(value) ? 0 : value)
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the payment amount. Defaults to monthly rate if set.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="card">Credit/Debit Card</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional notes about this payment..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Stripe Card Form Placeholder */}
              {form.watch('paymentMethod') === 'card' && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Stripe card payment integration requires API setup.
                    Please use cash or check for now, or set up Stripe API routes.
                  </p>
                </div>
              )}
            </div>

            <SheetFooter>
              <SheetClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </SheetClose>
              <Button type="submit" disabled={isSubmitting || isProcessingStripe}>
                {isSubmitting || isProcessingStripe ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Record Payment
                  </>
                )}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}

