import { keccak256, toBytes } from 'viem'
import type { Address } from '@/lib/web3/types'

export interface DemoCard {
  number: string
  expiryMonth: number
  expiryYear: number
  cvv: string
  holder: string
}

export function passesLuhn(digits: string): boolean {
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }
  return sum % 10 === 0
}

function luhnCheckDigit(fifteen: string): number {
  for (let d = 0; d < 10; d++) {
    if (passesLuhn(fifteen + String(d))) return d
  }
  return 0
}

export function generateDemoCard(address: Address, currentYear: number): DemoCard {
  const hash = keccak256(toBytes(address)).slice(2)
  const bytes = hash.match(/.{2}/g)!.map(h => parseInt(h, 16))

  let body = ''
  for (let i = 0; body.length < 15; i++) {
    body += (bytes[i % bytes.length] % 10).toString()
  }
  // Classic Mastercard BIN range (51–55) so the demo number matches the
  // Mastercard brand shown on the card UI. Picked deterministically per address.
  const prefix = '5' + String(1 + (bytes[0] % 5)) // '51'..'55'
  const fifteen = (prefix + body).slice(0, 15)
  const number16 = fifteen + String(luhnCheckDigit(fifteen))
  const grouped = number16.replace(/(.{4})/g, '$1 ').trim()

  const expiryMonth = (bytes[16] % 12) + 1
  const expiryYear = currentYear + 3 + (bytes[17] % 3)
  const cvv = String(((bytes[18] << 8) | bytes[19]) % 1000).padStart(3, '0')

  return { number: grouped, expiryMonth, expiryYear, cvv, holder: 'GENESIS MEMBER' }
}
