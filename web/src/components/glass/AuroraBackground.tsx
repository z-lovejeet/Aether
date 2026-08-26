"use client";

export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#fafbfc]">
      {/* 1. Top Soft Ambient Spotlight Glow */}
      <div
        className="pointer-events-none absolute -top-[20%] left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full opacity-60 filter blur-[100px]"
        style={{
          background: "radial-gradient(ellipse at center, rgba(224, 231, 255, 0.7) 0%, rgba(243, 232, 255, 0.4) 45%, transparent 75%)",
        }}
      />

      {/* 2. Soft Mint / Ice Blue Ambient Glow (Right) */}
      <div
        className="pointer-events-none absolute top-[15%] -right-[10%] h-[500px] w-[600px] rounded-full opacity-35 filter blur-[110px]"
        style={{
          background: "radial-gradient(circle, rgba(224, 242, 254, 0.8) 0%, rgba(240, 253, 250, 0.4) 55%, transparent 75%)",
        }}
      />

      {/* 3. Warm Pearl Amber Highlight (Bottom Left) */}
      <div
        className="pointer-events-none absolute top-[40%] -left-[8%] h-[520px] w-[550px] rounded-full opacity-30 filter blur-[120px]"
        style={{
          background: "radial-gradient(circle, rgba(254, 243, 199, 0.6) 0%, rgba(253, 244, 255, 0.3) 55%, transparent 75%)",
        }}
      />

      {/* 4. Ultra-Fine Architectural Grid with Smooth Radial Falloff */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(148, 163, 184, 0.12) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148, 163, 184, 0.12) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 75% 65% at 50% 28%, #000 35%, transparent 90%)",
          WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 50% 28%, #000 35%, transparent 90%)",
        }}
      />
    </div>
  );
}
