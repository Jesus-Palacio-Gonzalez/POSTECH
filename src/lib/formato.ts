export const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

const fh = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
export const fechaHora = (iso: string) => fh.format(new Date(iso))

/** Cantidad sin ceros sobrantes: 2.000 -> "2", 1.5 -> "1,5" */
export function cantidad(n: number | string): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 }).format(Number(n))
}
