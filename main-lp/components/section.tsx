import { cn } from "@/lib/utils"

export function Section({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn("py-20 lg:py-28", className)}>
      <div className="container-x">{children}</div>
    </section>
  )
}

export function SectionHeader({ eyebrow, title, description, center = false }: { eyebrow?: string; title: string; description?: string; center?: boolean }) {
  return (
    <div className={cn("max-w-3xl mb-12", center && "mx-auto text-center")}>
      {eyebrow && (
        <div className="inline-block text-[11px] tracking-[0.18em] uppercase text-blue-400 font-bold mb-3 px-3 py-1 rounded-full border border-blue-400/20 bg-blue-500/[0.05]">
          {eyebrow}
        </div>
      )}
      <h2 className="text-3xl lg:text-4xl font-bold text-white/95 leading-tight tracking-tight">{title}</h2>
      {description && <p className="mt-4 text-[15px] lg:text-base text-white/65 leading-relaxed">{description}</p>}
    </div>
  )
}
