"use client"

import { Check, ChevronRight, Clock, ListOrdered } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DailyRoute, Customer } from "@/lib/firebase-types"
import type { Route } from "@/lib/types"

export type RunSheetStop = {
  id: string
  order: number
  name: string
  address: string
  services: string[]
  status: "done" | "next" | "up-next" | "pending"
}

function formatServices(services: string[]): string {
  if (!services.length) return "SERVICE"
  return services
    .map((s) => s.replace(/-/g, " ").toUpperCase())
    .join(", ")
}

function statusFromIndex(index: number, nextIndex: number, completed: boolean): RunSheetStop["status"] {
  if (completed) return "done"
  if (index === nextIndex) return "next"
  if (index === nextIndex + 1) return "up-next"
  return "pending"
}

export function stopsFromDailyRoute(route: DailyRoute | null | undefined): RunSheetStop[] {
  if (!route?.customers?.length) return []
  return route.customers.map((customer: Customer, index) => {
    const completed = customer.services?.every((s) => s.status === "completed") ?? false
    const nextIndex = route.customers.findIndex(
      (c) => !(c.services?.every((s) => s.status === "completed") ?? false)
    )
    return {
      id: customer.id,
      order: index + 1,
      name: customer.name,
      address: customer.address,
      services: (customer.services || []).map((s) => s.type),
      status: statusFromIndex(index, nextIndex === -1 ? route.customers.length : nextIndex, completed),
    }
  })
}

export function stopsFromTimingRoute(route: Route | null | undefined): RunSheetStop[] {
  if (!route?.stops?.length) return []
  const nextIndex = route.stops.findIndex((s) => s.status === "pending" || s.status === "in_progress")
  return route.stops.map((stop, index) => {
    const completed = stop.status === "completed" || stop.status === "skipped"
    return {
      id: stop.customerId,
      order: stop.order || index + 1,
      name: stop.customerName,
      address: stop.address,
      services: [],
      status: statusFromIndex(
        index,
        nextIndex === -1 ? route.stops.length : nextIndex,
        completed
      ),
    }
  })
}

interface RunSheetSummaryProps {
  routeLabel: string
  completed: number
  total: number
  estimatedMinutesRemaining?: number
  mapSlot?: React.ReactNode
}

export function RunSheetSummary({
  routeLabel,
  completed,
  total,
  estimatedMinutesRemaining,
  mapSlot,
}: RunSheetSummaryProps) {
  const hours = estimatedMinutesRemaining != null ? Math.floor(estimatedMinutesRemaining / 60) : null
  const mins = estimatedMinutesRemaining != null ? Math.round(estimatedMinutesRemaining % 60) : null

  return (
    <div className="rounded-2xl border bg-card p-3 shadow-sm">
      <div className={mapSlot ? "grid grid-cols-1 gap-3 md:grid-cols-1 sm:max-md:grid-cols-2" : "grid grid-cols-1"}>
        <div className="flex flex-col justify-center gap-2 px-1 py-2">
          <p className="font-brand text-lg text-primary tracking-[0.18em]">{routeLabel}</p>
          <p className="text-2xl font-bold text-ink leading-tight">
            {completed} / {total}{" "}
            <span className="text-base font-semibold text-muted-foreground">stops complete</span>
          </p>
          {hours != null && mins != null && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 text-primary" />
              {hours}h {mins}m est. remaining
            </p>
          )}
        </div>
        {mapSlot && (
          <div className="min-h-[140px] overflow-hidden rounded-xl border bg-secondary/40 md:hidden">
            {mapSlot}
          </div>
        )}
      </div>
    </div>
  )
}

interface RunSheetStopsListProps {
  stops: RunSheetStop[]
  onSelectStop?: (stopId: string) => void
  onReorder?: () => void
}

export function RunSheetStopsList({ stops, onSelectStop, onReorder }: RunSheetStopsListProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-bold uppercase tracking-wider text-ink">Stops</h2>
        {onReorder && (
          <button
            type="button"
            onClick={onReorder}
            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-primary"
          >
            <ListOrdered className="h-3.5 w-3.5" />
            Reorder
          </button>
        )}
      </div>
      <ul className="divide-y rounded-2xl border bg-card">
        {stops.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            No stops routed for today
          </li>
        )}
        {stops.map((stop) => (
          <li key={stop.id}>
            <button
              type="button"
              onClick={() => onSelectStop?.(stop.id)}
              className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-secondary/50 transition-colors"
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 border-primary",
                  stop.status === "done" && "bg-primary text-primary-foreground"
                )}
              >
                {stop.status === "done" && <Check className="h-3.5 w-3.5" />}
              </span>
              <span className="w-8 shrink-0 font-brand text-2xl text-primary leading-none">
                {stop.order}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink">{stop.address || stop.name}</span>
                <span className="block truncate text-xs uppercase tracking-wide text-muted-foreground">
                  {stop.name}
                  {stop.services.length > 0 ? ` · ${formatServices(stop.services)}` : ""}
                </span>
              </span>
              <StatusChip status={stop.status} />
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function StatusChip({ status }: { status: RunSheetStop["status"] }) {
  const label =
    status === "done" ? "Done" :
    status === "next" ? "Next" :
    status === "up-next" ? "Up next" : "Queued"

  return (
    <span
      className={cn(
        "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        status === "next" && "bg-ink text-primary-foreground",
        status === "done" && "bg-secondary text-primary",
        status === "up-next" && "bg-muted text-muted-foreground",
        status === "pending" && "bg-muted/60 text-muted-foreground"
      )}
    >
      {label}
    </span>
  )
}
