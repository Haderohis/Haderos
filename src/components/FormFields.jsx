import { useRef } from 'react'

export function FieldLabel({ children, required }) {
  return (
    <label className="text-[12px] font-medium text-muted">
      {children}{required && <span className="text-primary ml-0.5">*</span>}
    </label>
  )
}

export function TextField({ label, required, error, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      <input
        className={`bg-soft rounded-[10px] h-12 px-4 text-[14px] text-dark outline-none placeholder:text-accent ${error ? 'ring-2 ring-red-400' : ''}`}
        {...props}
      />
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  )
}

export function DateField({ label, value, onChange }) {
  const ref = useRef(null)
  return (
    <div className="flex flex-col gap-1">
      {label && <FieldLabel>{label}</FieldLabel>}
      <div className="relative bg-soft rounded-[10px] h-12 flex items-center px-4">
        <input
          ref={ref}
          type="date"
          value={value}
          onChange={onChange}
          className="flex-1 bg-transparent text-[14px] text-dark outline-none cursor-pointer [color-scheme:light]"
        />
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          className="shrink-0 cursor-pointer"
          onPointerDown={e => { e.preventDefault(); ref.current?.showPicker() }}
        >
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="rgb(var(--color-muted))" strokeWidth="2" />
          <path d="M16 2v4M8 2v4M3 10h18" stroke="rgb(var(--color-muted))" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}

export function SelectField({ label, required, value, onChange, children }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      <div className="relative bg-soft rounded-[10px] h-12 flex items-center px-4">
        <select
          value={value}
          onChange={onChange}
          className="flex-1 bg-transparent text-[14px] text-dark outline-none appearance-none cursor-pointer"
        >
          {children}
        </select>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 pointer-events-none">
          <path d="M6 9l6 6 6-6" stroke="rgb(var(--color-muted))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )
}

export function SegmentedControl({ label, options, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <FieldLabel>{label}</FieldLabel>}
      <div className="flex bg-soft rounded-[10px] h-12 p-1 gap-1">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 rounded-[8px] text-[13px] font-semibold transition-colors ${
              value === opt.value ? 'bg-primary text-white' : 'text-muted'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function SubmitButton({ children, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="bg-primary rounded-[12px] h-12 text-[14px] font-semibold text-white disabled:opacity-40 transition-opacity"
    >
      {children}
    </button>
  )
}
