/**
 * Cash N Carry Unified Design Tokens
 * Synchronized directly with Android app/src/main/java/com/example/ui/theme/Color.kt
 */
export const CNC_TOKENS = {
  colors: {
    brandEmerald: '#0E6B38',
    brandEmeraldDark: '#084B26',
    brandEmeraldSoft: '#EAF7EF',
    brandOrange: '#FF6B00',
    brandOrangeBright: '#FF8F1F',
    brandOrangeSoft: '#FFF4EB',
    brandNavy: '#093B22',
    brandSlate: '#0F172A',
    brandMuted: '#64748B',
    brandBorder: '#E5E7EB',
    surfaceWhite: '#FFFFFF',
    surfaceSoft: '#F8FAFC',
    liveCrimson: '#E11D48',
    liveCrimsonSoft: '#FFF1F2',
    goldCoin: '#F59E0B',
    promoViolet: '#6D28D9',
  },
  glass: {
    darkOverlay: 'bg-slate-950/60 backdrop-blur-md border border-white/15 text-white',
    lightPill: 'bg-white/90 backdrop-blur-md border border-slate-200/80 text-slate-900',
  },
} as const;

export const NIGERIAN_STATES: readonly string[] = [
  'Lagos',
  'Abuja (FCT)',
  'Rivers',
  'Oyo',
  'Kano',
  'Ogun',
  'Enugu',
  'Anambra',
  'Delta',
  'Edo',
  'Kaduna',
  'Abia',
  'Akwa Ibom',
  'Cross River',
  'Ondo',
  'Osun',
  'Kwara',
  'Plateau',
  'Imo',
  'Ekiti',
  'Benue',
  'Borno',
  'Bauchi',
  'Adamawa',
  'Katsina',
  'Sokoto',
  'Niger',
  'Nasarawa',
  'Kogi',
  'Bayelsa',
  'Ebonyi',
  'Gombe',
  'Jigawa',
  'Kebbi',
  'Taraba',
  'Yobe',
  'Zamfara',
];

export function formatNaira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}

export function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return '00:00:00';
  const totalSec = Math.floor(remainingMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
