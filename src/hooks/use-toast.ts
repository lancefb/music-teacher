import * as React from "react"

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
  duration?: number
}

interface ToastState {
  toasts: Toast[]
}

let listeners: Array<(state: ToastState) => void> = []
let memoryState: ToastState = { toasts: [] }
let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

function dispatch(action: { type: "ADD_TOAST"; toast: Toast } | { type: "DISMISS_TOAST"; toastId: string }) {
  if (action.type === "ADD_TOAST") {
    memoryState = { toasts: [...memoryState.toasts, action.toast] }
  } else if (action.type === "DISMISS_TOAST") {
    memoryState = { toasts: memoryState.toasts.filter(t => t.id !== action.toastId) }
  }
  listeners.forEach(listener => listener(memoryState))
}

function toast(props: Omit<Toast, "id">) {
  const id = genId()
  dispatch({ type: "ADD_TOAST", toast: { ...props, id } })
  const duration = props.duration ?? 3000
  setTimeout(() => {
    dispatch({ type: "DISMISS_TOAST", toastId: id })
  }, duration)
  return id
}

function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      listeners = listeners.filter(l => l !== setState)
    }
  }, [])

  return {
    ...state,
    toast,
    dismiss: (toastId: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
