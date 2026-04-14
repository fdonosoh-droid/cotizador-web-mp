'use client'

import * as React from 'react'
import { cn } from '@/lib/utils/cn'

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value:    number | ''
  onChange: (v: number | '') => void
}

/** Formatea número como $1.500.000 (locale es-CL, sin decimales) */
function format(n: number | ''): string {
  if (n === '' || n === 0) return ''
  return '$' + Number(n).toLocaleString('es-CL', { maximumFractionDigits: 0 })
}

/** Parsea string con formato a número */
function parse(raw: string): number | '' {
  const cleaned = raw.replace(/[^0-9]/g, '')
  if (!cleaned) return ''
  const n = parseInt(cleaned, 10)
  return isNaN(n) ? '' : n
}

const CurrencyInput = React.forwardRef<HTMLInputElement, Props>(
  ({ className, value, onChange, placeholder, ...props }, ref) => {
    const [display, setDisplay] = React.useState(format(value))
    const [focused, setFocused] = React.useState(false)

    // Sync display when value changes externally (e.g. form reset)
    React.useEffect(() => {
      if (!focused) setDisplay(format(value))
    }, [value, focused])

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value
      const parsed = parse(raw)
      setDisplay(raw)          // muestra lo que escribe el usuario
      onChange(parsed)
    }

    function handleBlur() {
      setFocused(false)
      setDisplay(format(value))  // formatea al salir del campo
    }

    function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
      setFocused(true)
      // Al entrar, muestra solo el número sin formato para facilitar edición
      setDisplay(value === '' ? '' : String(value))
      e.target.select()
    }

    const formattedPlaceholder = placeholder
      ? '$' + placeholder.replace(/\./g, '').replace(/[^0-9]/g, '')
          .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      : undefined

    return (
      <input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        value={display}
        placeholder={formattedPlaceholder ?? placeholder}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(
          'flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
      />
    )
  }
)
CurrencyInput.displayName = 'CurrencyInput'

export { CurrencyInput }
