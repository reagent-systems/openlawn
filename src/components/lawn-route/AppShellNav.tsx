"use client"

import { ClipboardList, Calendar, PlusCircle, Map, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

export type AppShellTab = "run-sheet" | "schedule" | "new-stop" | "map" | "settings"

interface AppShellNavProps {
  active: AppShellTab
  onChange: (tab: AppShellTab) => void
  className?: string
}

const items: { id: AppShellTab; label: string; icon: typeof Map }[] = [
  { id: "run-sheet", label: "Run Sheet", icon: ClipboardList },
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "new-stop", label: "New Stop", icon: PlusCircle },
  { id: "map", label: "Map", icon: Map },
  { id: "settings", label: "Settings", icon: Settings },
]

export function AppShellNav({ active, onChange, className }: AppShellNavProps) {
  return (
    <nav
      className={cn(
        "flex items-stretch justify-around border-t bg-card px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] z-20",
        className
      )}
    >
      {items.map(({ id, label, icon: Icon }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold uppercase tracking-wide transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5", isActive && "stroke-[2.25px]")} />
            <span>{label}</span>
            <span
              className={cn(
                "mt-0.5 h-0.5 w-8 rounded-full",
                isActive ? "bg-primary" : "bg-transparent"
              )}
            />
          </button>
        )
      })}
    </nav>
  )
}
