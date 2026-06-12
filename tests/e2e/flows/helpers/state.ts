import fs from 'fs'
import path from 'path'

const STATE_FILE = path.join(__dirname, '../../fixtures/state.json')

export interface FlowState {
  listingKey?: string
  listingTitle?: string
  inquiryId?: number
  bookingId?: number
}

export function readState(): FlowState {
  if (!fs.existsSync(STATE_FILE)) return {}
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
  } catch {
    return {}
  }
}

export function writeState(updates: Partial<FlowState>) {
  const next = { ...readState(), ...updates }
  fs.writeFileSync(STATE_FILE, JSON.stringify(next, null, 2))
  console.log('  [state]', JSON.stringify(next))
}

export function clearState() {
  fs.writeFileSync(STATE_FILE, '{}')
}
