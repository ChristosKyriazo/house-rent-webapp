'use client'

/**
 * Ambient layer — warm dusk. Uses CSS radial dots (not SVG patterns) for Safari/Chrome parity.
 */
export default function AtmosphereBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[var(--canvas)]" />
      <div className="atmosphere-mesh absolute inset-0 opacity-95" />
      {/* Softer blur = less banding / “grain” in WebKit compositor */}
      <div className="absolute -left-[18%] top-[-12%] h-[58vmin] w-[58vmin] rounded-full bg-[#e3a75f]/[0.09] blur-[64px] motion-safe:animate-float-a" />
      <div className="absolute -right-[12%] top-[18%] h-[46vmin] w-[46vmin] rounded-full bg-[#6d8f82]/[0.14] blur-[56px] motion-safe:animate-float-b" />
      <div className="absolute bottom-[-22%] left-[25%] h-[52vmin] w-[52vmin] rounded-full bg-[#c9a67a]/[0.07] blur-[64px] motion-safe:animate-float-c" />
      <div className="atmosphere-dots absolute inset-0" />
    </div>
  )
}
