/*
  A single, very soft chime synthesized on the fly (no audio asset, so nothing
  to 404). Used only on the "Generate Proposal" action — the rarity is what
  makes it feel premium (brief 5.7). Respects prefers-reduced-motion and a
  localStorage mute flag.
*/
export function playChime(): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    if (localStorage.getItem('hub.mute') === '1') return;
  } catch {}
  try {
    const Ctx: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    const t0 = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.05, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.2);
    osc.onended = () => ctx.close().catch(() => {});
  } catch {}
}
