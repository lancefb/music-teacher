import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[360px]">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={cn(
            "rounded-lg border p-4 shadow-lg transition-all",
            toast.variant === "destructive"
              ? "border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]"
              : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))]"
          )}
        >
          <div className="flex justify-between items-start gap-2">
            <div>
              {toast.title && <div className="font-semibold text-sm">{toast.title}</div>}
              {toast.description && <div className="text-sm opacity-90 mt-1">{toast.description}</div>}
            </div>
            <button onClick={() => dismiss(toast.id)} className="opacity-50 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
