export function LoadingState() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-fill)] mx-auto mb-4"></div>
          <p className="text-ink-secondary">Cargando reparaciones...</p>
        </div>
      </div>
    </div>
  )
}
