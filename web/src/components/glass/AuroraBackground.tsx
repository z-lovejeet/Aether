/**
 * AuroraBackground — full-screen drifting aurora mesh (docs/06 §2).
 * Three blurred blobs + grain overlay. Fixed, behind everything.
 */
export function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="aurora-blob h-[55vmax] w-[55vmax] -top-[15vmax] -left-[10vmax]"
        style={{ background: "var(--aurora-1)", animationDelay: "-4s" }}
      />
      <div
        className="aurora-blob h-[45vmax] w-[45vmax] top-[30vh] right-[-12vmax]"
        style={{ background: "var(--aurora-2)", animationDelay: "-13s" }}
      />
      <div
        className="aurora-blob h-[38vmax] w-[38vmax] bottom-[-14vmax] left-[25vw]"
        style={{ background: "var(--aurora-3)", animationDelay: "-21s", opacity: 0.3 }}
      />
      <div className="noise-overlay" />
    </div>
  );
}
