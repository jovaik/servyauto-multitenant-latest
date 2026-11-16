// Rangos nuevos del Dashboard: días completos en la zona operativa del negocio.
export function dashboardExtraPeriod(period: string, desde: string | null, hasta: string | null, now = new Date()) {
  const valid = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s
  const shift = (day: string, days: number) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10) }
  const midnight = (day: string) => {
    const utc = new Date(`${day}T00:00:00Z`)
    const offset = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', timeZoneName: 'longOffset' }).formatToParts(utc).find(p => p.type === 'timeZoneName')!.value
    return new Date(`${day}T00:00:00${offset.replace('GMT', '') || '+00:00'}`)
  }
  if (period === 'semana_pasada') {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
    const weekday = new Date(`${today}T12:00:00Z`).getUTCDay()
    const monday = shift(today, -((weekday + 6) % 7))
    return { startDate: midnight(shift(monday, -7)), endDate: new Date(midnight(monday).getTime() - 1) }
  }
  if (period === 'personalizado') {
    if (!valid(desde) || !valid(hasta) || desde > hasta) throw new Error('Selecciona un rango de fechas válido: inicio y fin, en ese orden.')
    return { startDate: midnight(desde), endDate: new Date(midnight(shift(hasta, 1)).getTime() - 1) }
  }
  return null
}
