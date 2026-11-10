// Integer cents only. DB remains authority; this is input/preview validation.
export function cents(value: string): bigint | null {
  if (!/^[0-9]{1,10}(\.[0-9]{1,2})?$/.test(value)) return null
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
}
export function decimal(value: bigint): string {
  return `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`
}
export function pen(value: string | number | bigint): string {
  const amount = typeof value === 'bigint' ? value : cents(String(value))
  return amount === null ? 'No disponible' : `S/ ${decimal(amount)}`
}
