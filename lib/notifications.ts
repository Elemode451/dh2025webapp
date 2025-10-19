// lib/notifications.ts
import { Vonage } from '@vonage/server-sdk'

import { generatePlantAlertMessage } from '@/lib/gemini'
import { resolvePlantMood } from '@/lib/plant-mood'

type SendWaterAlertParams = {
  plantId: string
  to: string
  plantName: string
  moisturePercent: number | null
}

type VonageSmsMessage = {
  status: string
  ['error-text']?: string
}

type VonageSmsResponse = {
  messages?: VonageSmsMessage[]
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

function fallbackAlertMessage(plantName: string, moisturePercent: number | null) {
  const parts = [`Hey! ${plantName} is feeling thirsty.`]

  if (typeof moisturePercent === 'number' && !Number.isNaN(moisturePercent)) {
    parts.push(`Current moisture is around ${moisturePercent}%.`)
  }

  parts.push('Could you give them a drink?')
  return parts.join(' ')
}

export async function sendWaterAlert({ to, plantId, plantName, moisturePercent }: SendWaterAlertParams) {
  const config = getVonageConfig()
  if (!config) return

  const normalizedTo = to.startsWith('+') ? to : normalizeNumber(to)

  if (!isE164(normalizedTo)) {
    console.error(`Invalid "to" number after normalization: ${normalizedTo}`)
    return
  }

  const moistureValue =
    typeof moisturePercent === 'number' && !Number.isNaN(moisturePercent)
      ? Math.round(moisturePercent)
      : null

  let text: string

  try {
    const mood = await resolvePlantMood(plantId)
    text = await generatePlantAlertMessage({
      plantName,
      moisturePercent: moistureValue,
      mood,
    })
  } catch (error) {
    console.error('Falling back to default water alert message', error)
    text = fallbackAlertMessage(plantName, moistureValue)
  }

  const vonage = new Vonage({
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
  })

  try {
    const resp = (await vonage.sms.send({
      to: normalizedTo,
      from: config.from,
      text,
    })) as VonageSmsResponse

    console.dir(resp, { depth: null })

    const messages = resp.messages ?? []
    const failed = messages.filter((message) => message.status !== '0')

    if (failed.length) {
      const failureText = failed
        .map((message) => message['error-text'])
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .join('; ')

      console.error('Failed parts:', failed)
      throw new Error(failureText || 'Some SMS messages failed to send')
    }

    console.log(`Message sent successfully to ${normalizedTo}`)
    return resp
  } catch (err) {
    const error = err as {
      cause?: { response?: { data?: unknown } }
      response?: { data?: unknown }
    }

    const apiData = error?.cause?.response?.data ?? error?.response?.data
    console.error('SMS send error:')
    console.dir(apiData ?? error, { depth: null })
    throw err
  }
}
