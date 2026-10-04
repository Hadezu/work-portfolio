/** Decorative sculpture timing only; never a business verification status. */
export function sculptureCycle(seconds: number) {
 const t = ((seconds % 24) + 24) % 24;
 const ease = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
 if (t < 3) return { coherence: 0, phase: 'fragmented' };
 if (t < 10) return { coherence: ease((t - 3) / 7), phase: 'aligning' };
 if (t < 14) return { coherence: 1, phase: 'ordered' };
 if (t < 22) return { coherence: 1 - ease((t - 14) / 8), phase: 'releasing' };
 return { coherence: 0, phase: 'fragmented' };
}
