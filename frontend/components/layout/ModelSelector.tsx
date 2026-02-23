"use client"

import * as React from "react"
import { Settings2, Check } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

const MODELS = [
  {
    id: "briefing",
    label: "Briefing",
    description: "Quick, concise answers for fast lookups",
  },
  {
    id: "evidence-based",
    label: "Evidence Based",
    description: "Responses grounded in cited sources",
  },
  {
    id: "heavy-duty",
    label: "Heavy Duty",
    description: "Deep, comprehensive multi-step analysis",
  },
] as const

type ModelId = (typeof MODELS)[number]["id"]

export default function ModelSelector() {
  const [open, setOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<ModelId>("briefing")

  const current = MODELS.find((m) => m.id === selected)!

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Model settings"
          className={cn(
            "flex items-center gap-1.5 bg-transparent text-nblm-text px-2 sm:px-3 py-2 rounded-full",
            "text-[13px] sm:text-[15px] font-medium hover:bg-nblm-panel transition-colors",
            open && "bg-nblm-panel"
          )}
        >
          <Settings2 className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          <span className="hidden sm:inline">Settings</span>
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="p-0 w-64">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-nblm-border">
          <p className="text-xs font-semibold uppercase tracking-wider text-nblm-text-muted">
            Response Mode
          </p>
          <p className="text-[13px] text-nblm-text mt-0.5">
            {current.label}
          </p>
        </div>

        {/* Options */}
        <RadioGroup
          value={selected}
          onValueChange={(v) => {
            setSelected(v as ModelId)
            setOpen(false)
          }}
          className="gap-0"
        >
          {MODELS.map((model) => {
            const isSelected = selected === model.id
            return (
            <label
              key={model.id}
              htmlFor={model.id}
              className={cn(
                "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors",
                "last:rounded-b-xl",
                isSelected
                  ? "bg-zinc-200 hover:bg-zinc-200"
                  : "hover:bg-[#2b2520]"
              )}
            >
              <RadioGroupItem
                value={model.id}
                id={model.id}
                className={cn(
                  "mt-0.5 shrink-0",
                  isSelected && "border-zinc-600 data-[state=checked]:bg-zinc-700 data-[state=checked]:border-zinc-700"
                )}
              />
              <div className="flex flex-col gap-0.5">
                <span className={cn(
                  "text-[14px] font-medium",
                  isSelected ? "text-zinc-800" : "text-zinc-200"
                )}>
                  {model.label}
                </span>
                <span className={cn(
                  "text-[12px] leading-snug",
                  isSelected ? "text-zinc-600" : "text-nblm-text-muted"
                )}>
                  {model.description}
                </span>
              </div>
              {isSelected && (
                <Check className="ml-auto w-4 h-4 text-zinc-700 shrink-0 mt-0.5" />
              )}
            </label>
            )
          })}

        </RadioGroup>
      </PopoverContent>
    </Popover>
  )
}
