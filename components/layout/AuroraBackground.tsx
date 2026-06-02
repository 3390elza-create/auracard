export function AuroraBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
    >
      <div className="absolute -top-24 -left-24 h-[600px] w-[600px] rounded-full bg-aurora-violet/20 blur-[120px]" />
      <div className="absolute -bottom-24 -right-24 h-[500px] w-[500px] rounded-full bg-aurora-teal/15 blur-[100px]" />
    </div>
  )
}
