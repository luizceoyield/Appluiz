const dataFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const horaFmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const kmFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

export const fmtData = (iso: string | Date) => dataFmt.format(new Date(iso));
export const fmtHora = (iso: string | Date) => horaFmt.format(new Date(iso));
export const fmtKm = (km: number | null | undefined) => `${kmFmt.format(Number(km ?? 0))} km`;

export function fmtPeriodo(inicio: string, fim: string) {
  const a = new Date(inicio);
  const b = new Date(fim);
  const mesmoDia = a.toDateString() === b.toDateString();
  return mesmoDia
    ? `${fmtData(a)} · ${fmtHora(a)} – ${fmtHora(b)}`
    : `${fmtData(a)} ${fmtHora(a)} – ${fmtData(b)} ${fmtHora(b)}`;
}

/** "AAAA-MM-DD" no fuso local. */
export function isoDiaLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "HH:MM" no fuso local. */
export function isoHoraLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Junta data (AAAA-MM-DD) e hora (HH:MM) no fuso local. */
export function juntarDataHora(data: string, hora: string) {
  const [y, m, d] = data.split('-').map(Number);
  const [h, min] = hora.split(':').map(Number);
  return new Date(y, m - 1, d, h, min);
}
