import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  allowNegative?: boolean
}

export function CurrencyInput({ value, onChange, placeholder = 'R$ 0,00', className, disabled, allowNegative }: CurrencyInputProps) {
  const [cents, setCents] = useState(() => Math.round(Math.abs(value) * 100))
  const [negative, setNegative] = useState(() => value < 0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync external value changes (e.g. form reset)
  useEffect(() => {
    setCents(Math.round(Math.abs(value) * 100))
    setNegative(value < 0)
  }, [value])

  const signedCents = negative ? -cents : cents
  const formatted = (signedCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  function toggleSign() {
    if (disabled || !allowNegative) return
    const next = !negative
    setNegative(next)
    onChange((next ? -cents : cents) / 100)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return
    if (e.key === '-' && allowNegative) {
      e.preventDefault()
      toggleSign()
      return
    }
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault()
      const next = cents * 10 + parseInt(e.key)
      if (next <= 99_999_999_99) {
        setCents(next)
        onChange((negative ? -next : next) / 100)
      }
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      const next = Math.floor(cents / 10)
      setCents(next)
      onChange((negative ? -next : next) / 100)
    } else if (e.key === 'Delete') {
      e.preventDefault()
      setCents(0)
      onChange(0)
    }
  }

  return (
    <div className="flex">
      {allowNegative && (
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={toggleSign}
          className={cn(
            'flex items-center justify-center h-9 w-9 shrink-0 rounded-l-md border border-r-0 border-input bg-transparent text-sm font-medium transition-colors select-none',
            'hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50',
            negative ? 'text-expense' : 'text-muted-foreground',
          )}
        >
          {negative ? '−' : '+'}
        </button>
      )}
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
          'flex h-9 w-full bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
          'border border-input',
          allowNegative ? 'rounded-r-md rounded-l-none' : 'rounded-md',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          negative && 'text-expense',
          className,
        )}
      />
    </div>
  )
}
