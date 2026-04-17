import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function CurrencyInput({ value, onChange, placeholder = 'R$ 0,00', className, disabled }: CurrencyInputProps) {
  const [cents, setCents] = useState(() => Math.round(Math.abs(value) * 100))
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync external value changes (e.g. form reset)
  useEffect(() => {
    setCents(Math.round(Math.abs(value) * 100))
  }, [value])

  const formatted = (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault()
      const next = cents * 10 + parseInt(e.key)
      if (next <= 99_999_999_99) {
        setCents(next)
        onChange(next / 100)
      }
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      const next = Math.floor(cents / 10)
      setCents(next)
      onChange(next / 100)
    } else if (e.key === 'Delete') {
      e.preventDefault()
      setCents(0)
      onChange(0)
    }
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      readOnly
      value={cents === 0 ? '' : formatted}
      placeholder={placeholder}
      disabled={disabled}
      onKeyDown={handleKeyDown}
      onClick={() => inputRef.current?.focus()}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    />
  )
}
