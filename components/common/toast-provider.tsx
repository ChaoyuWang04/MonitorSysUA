'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { Snackbar, Alert, AlertColor } from '@mui/material'

interface Toast {
  message: string
  severity: AlertColor
  duration?: number
}

interface ToastContextType {
  showToast: (message: string, severity?: AlertColor, duration?: number) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = useCallback(
    (message: string, severity: AlertColor = 'info', duration: number = 6000) => {
      setToast({ message, severity, duration })
    },
    []
  )

  const success = useCallback(
    (message: string, duration?: number) => showToast(message, 'success', duration),
    [showToast]
  )

  const error = useCallback(
    (message: string, duration?: number) => showToast(message, 'error', duration),
    [showToast]
  )

  const warning = useCallback(
    (message: string, duration?: number) => showToast(message, 'warning', duration),
    [showToast]
  )

  const info = useCallback(
    (message: string, duration?: number) => showToast(message, 'info', duration),
    [showToast]
  )

  const handleClose = useCallback(() => {
    setToast(null)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      {toast && (
        <Snackbar
          open={!!toast}
          autoHideDuration={toast.duration}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={handleClose} severity={toast.severity} sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        </Snackbar>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
