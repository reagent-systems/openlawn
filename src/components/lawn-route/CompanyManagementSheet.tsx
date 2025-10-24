"use client"

import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, CreditCard, Users, Calendar } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

interface CompanyManagementSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CompanyManagementSheet({ open, onOpenChange }: CompanyManagementSheetProps) {
  const { userProfile } = useAuth()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Placeholder data - would come from Firebase in production
  const [companyData, setCompanyData] = React.useState({
    name: userProfile?.companyName || "OpenLawn Company",
    employeeCount: 0,
    subscriptionPlan: "Professional",
    subscriptionStatus: "Active",
    billingCycle: "Monthly",
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
  })

  const [paymentInfo, setPaymentInfo] = React.useState({
    cardLast4: "4242",
    cardBrand: "Visa",
    expiryDate: "12/25",
  })

  const handleUpdatePayment = async () => {
    setIsSubmitting(true)
    try {
      // Placeholder for payment update logic
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast({
        title: "Payment Method Updated",
        description: "Your payment method has been updated successfully.",
      })
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: "Error",
        description: "Failed to update payment method. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-lg max-h-[90svh] overflow-y-auto"
      >
        <SheetHeader className="text-left">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            <SheetTitle>Company Management</SheetTitle>
          </div>
          <SheetDescription>
            Manage your company settings, subscription, and billing
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Company Information
              </CardTitle>
              <CardDescription>
                Basic information about your company
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyData.name}
                  onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Employee Count</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{companyData.employeeCount} employees</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Company ID</Label>
                  <div className="text-sm text-muted-foreground">
                    {userProfile?.companyId || "N/A"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Subscription & Billing
              </CardTitle>
              <CardDescription>
                Manage your subscription plan and billing details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="font-semibold text-green-800">{companyData.subscriptionPlan} Plan</p>
                  <p className="text-sm text-green-600">{companyData.billingCycle} Billing</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {companyData.subscriptionStatus}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Next Billing Date</Label>
                  <p className="text-sm font-medium">{companyData.nextBillingDate}</p>
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <p className="text-sm font-medium">$49.99</p>
                </div>
              </div>

              <Button variant="outline" className="w-full">
                Change Plan
              </Button>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payment Method
              </CardTitle>
              <CardDescription>
                Update your payment information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-8 bg-gradient-to-br from-blue-600 to-blue-400 rounded flex items-center justify-center text-white font-bold text-xs">
                    {paymentInfo.cardBrand}
                  </div>
                  <div>
                    <p className="font-medium">•••• •••• •••• {paymentInfo.cardLast4}</p>
                    <p className="text-sm text-muted-foreground">Expires {paymentInfo.expiryDate}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUpdatePayment}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Updating..." : "Update"}
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  disabled
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input
                    id="expiry"
                    placeholder="MM/YY"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    placeholder="123"
                    disabled
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Payment information is securely stored and encrypted. We use Stripe for payment processing.
              </p>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-lg text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions for your company account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50">
                Cancel Subscription
              </Button>
              <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50">
                Delete Company
              </Button>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  )
}
