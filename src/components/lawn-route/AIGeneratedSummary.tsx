"use client"

import * as React from "react"
import type { Customer } from "@/lib/firebase-types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, Loader2 } from "lucide-react"
import { generateSummaryForCustomer } from "@/app/actions"

interface AIGeneratedSummaryProps {
  customer: Customer
}

export function AIGeneratedSummary({ customer }: AIGeneratedSummaryProps) {
  const [summary, setSummary] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)

  const primaryService = customer.services?.[0];

  const handleGenerateSummary = async () => {
    setIsLoading(true)
    setSummary("")
    const result = await generateSummaryForCustomer({
      customerName: customer.name,
      interactionNotes: customer.notes,
      propertyDetails: `Customer is located at ${customer.address}.`,
      serviceRequested: primaryService?.type || 'No service specified',
    })
    setSummary(result.summary)
    setIsLoading(false)
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-accent" />
        AI-Powered Summary
      </h3>
      
      {!summary && !isLoading && (
        <div className="text-center p-4 border-2 border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground mb-4">Get a quick summary of this customer&apos;s needs.</p>
          <Button onClick={handleGenerateSummary} disabled={isLoading}>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Summary
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center p-8 rounded-lg bg-secondary/50">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="ml-4 font-medium">Generating summary...</p>
        </div>
      )}

      {summary && !isLoading && (
        <Card className="bg-primary/10">
          <CardContent className="p-4">
            <p className="text-primary-foreground/90">{summary}</p>
            <Button variant="link" onClick={handleGenerateSummary} className="p-0 h-auto mt-2 text-accent">
              Regenerate
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
