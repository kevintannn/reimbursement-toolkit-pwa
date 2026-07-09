interface PageHeaderProps {
  title: string
  subtitle?: string
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="bg-blue-700 text-white px-4 pt-10 pb-5">
      <h1 className="text-xl font-bold leading-tight">{title}</h1>
      {subtitle && <p className="text-blue-200 text-sm mt-0.5">{subtitle}</p>}
    </div>
  )
}
