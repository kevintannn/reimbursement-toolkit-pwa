interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }

export function Spinner({ size = 'md', label }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`${sizes[size]} border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin`}
      />
      {label && <p className="text-sm text-slate-500">{label}</p>}
    </div>
  )
}
