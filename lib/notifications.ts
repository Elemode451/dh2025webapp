// lib/notifications.ts
import { Vonage } from '@vonage/server-sdk'

type SendWaterAlertParams = {
  to: string
  plantName: string
  moisturePercent: number | null
}

function getVonageConfig() {
  const apiKey = process.env.VONAGE_API_KEY
  const apiSecret = process.env.VONAGE_API_SECRET
  const from = process.env.VONAGE_FROM

  if (!apiKey || !apiSecret || !from) {
    console.warn('Vonage credentials are not fully configured. SMS alerts are disabled.')
    return null
  }
  return { apiKey, apiSecret, from }
}

// very light E.164 check
const isE164 = (n: string) => /^\+\d{8,15}$/.test(n)

// auto-normalize local numbers to US (+1)
function normalizeNumber(num: string): string {
  let clean = num.replace(/\D/g, '') // strip all non-digits
  if (!clean.startsWith('1')) clean = '1' + clean // assume US if no leading 1
  return '+' + clean
}

export async function sendWaterAlert({ to, plantName, moisturePercent }: SendWaterAlertParams) {
  const config = getVonageConfig()
  if (!config) return

  // normalize before validation
  const normalizedTo = to.startsWith('+') ? to : normalizeNumber(to)

  if (!isE164(normalizedTo)) {
    console.error(`Invalid "to" number after normalization: ${normalizedTo}`)
    return
  }


  const parts = [`Hey! ${plantName} is feeling thirsty.`]
  if (typeof moisturePercent === 'number' && !Number.isNaN(moisturePercent)) {
    parts.push(`Current moisture is around ${Math.round(moisturePercent)}%.`)
  }
  parts.push('Could you give them a drink?')
  const text = parts.join(' ')

  const vonage = new Vonage({
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
  })

  try {
    const resp = await vonage.sms.send({
      to: normalizedTo,
      from: config.from,
      text,
    })

    console.dir(resp, { depth: null })

    const failed = resp.messages.filter((m: any) => m.status !== '0')
    if (failed.length) {
      const msg = failed.map((m: any) => m['error-text']).join('; ')
      console.error('Failed parts:', failed)
      throw new Error(msg || 'Some SMS messages failed to send')
    }

    console.log(`Message sent successfully to ${normalizedTo}`)
    return resp
  } catch (err: any) {
    const apiData = err?.cause?.response?.data ?? err?.response?.data
    console.error('SMS send error:')
    console.dir(apiData ?? err, { depth: null })
    throw err
  }
}
