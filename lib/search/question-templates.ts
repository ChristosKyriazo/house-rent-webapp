/**
 * The literal text of each question the assistant asks.
 *
 * These are templates rather than model output for one reason: the question and the
 * `pendingNumeric` binding it creates must agree. If the model chooses the wording, it can
 * ask about the budget while the policy has recorded a bedrooms bound, and the user's next
 * bare number lands on the wrong filter. Generating the question from the same object that
 * produces the binding makes that impossible rather than unlikely.
 *
 * Every numeric question names its bound explicitly — "the most", "the fewest" — because a
 * bare number is only meaningful against a stated direction.
 */

import type { Slot } from './dialogue-policy'

interface QuestionText {
  en: string
  el: string
}

const QUESTIONS: Record<string, QuestionText> = {
  location: {
    en: 'Which city or neighbourhood are you looking in?',
    el: 'Σε ποια πόλη ή περιοχή ψάχνετε;',
  },
  price: {
    en: "What's the most you'd want to pay?",
    el: 'Ποιο είναι το ανώτατο ποσό που θα θέλατε να δώσετε;',
  },
  bedrooms: {
    en: "What's the fewest bedrooms you'd accept?",
    el: 'Ποιος είναι ο ελάχιστος αριθμός υπνοδωματίων που θα δεχόσασταν;',
  },
  transit: {
    en: 'How important is it to be near a metro or bus — or do you mostly drive?',
    el: 'Πόσο σημαντικό είναι να είστε κοντά σε μετρό ή λεωφορείο — ή μετακινείστε κυρίως με αυτοκίνητο;',
  },
  vibe: {
    en: 'What kind of neighbourhood suits you — lively and central, quiet and residential, or close to the sea?',
    el: 'Τι είδους γειτονιά σας ταιριάζει — ζωντανή και κεντρική, ήσυχη και οικιστική, ή κοντά στη θάλασσα;',
  },
  safety: {
    en: 'How much does it matter that the area feels safe?',
    el: 'Πόσο σημαντικό είναι να νιώθετε ασφάλεια στην περιοχή;',
  },
  household: {
    en: 'Who is moving in with you — children, or a pet?',
    el: 'Ποιοι θα μετακομίσουν μαζί σας — παιδιά ή κάποιο κατοικίδιο;',
  },
  parking: {
    en: 'Do you need a parking space?',
    el: 'Χρειάζεστε θέση στάθμευσης;',
  },
  size: {
    en: "What's the smallest size that would work for you, in square meters?",
    el: 'Ποιο είναι το μικρότερο εμβαδόν που σας βολεύει, σε τετραγωνικά;',
  },
  bathrooms: {
    en: "What's the fewest bathrooms you need?",
    el: 'Πόσα μπάνια χρειάζεστε τουλάχιστον;',
  },
  amenities: {
    en: 'Does being near a hospital or a university matter to you?',
    el: 'Σας ενδιαφέρει να είστε κοντά σε νοσοκομείο ή πανεπιστήμιο;',
  },
  heating: {
    en: 'Do you care what kind of heating the place has?',
    el: 'Σας ενδιαφέρει το είδος της θέρμανσης;',
  },
  building: {
    en: 'Would you prefer a newer or recently renovated building, or a particular floor?',
    el: 'Θα προτιμούσατε νεότερο ή πρόσφατα ανακαινισμένο κτίριο, ή κάποιον συγκεκριμένο όροφο;',
  },
}

/** Joins two questions into one sentence rather than firing them as a list. */
function join(parts: string[], isEl: boolean): string {
  if (parts.length <= 1) return parts[0] ?? ''
  // Lower-case the follow-on question and chain it, so two slots read as one ask.
  const [first, ...rest] = parts
  const tail = rest
    .map(q => q.charAt(0).toLowerCase() + q.slice(1).replace(/;$/, '').replace(/\?$/, ''))
    .join(isEl ? ', και ' : ', and ')
  return `${first.replace(/[?;]$/, '')}${isEl ? ', και ' : ', and '}${tail}${isEl ? ';' : '?'}`
}

export function buildQuestion(slots: readonly Slot[], isEl: boolean): string {
  const texts = slots
    .map(slot => QUESTIONS[slot.id])
    .filter(Boolean)
    .map(q => (isEl ? q.el : q.en))
  return join(texts, isEl)
}

/**
 * Shown once nothing worth asking is left, instead of falling silent — the user should know
 * the assistant has what it needs rather than wondering if it stopped listening.
 */
export function closingLine(isEl: boolean): string {
  return isEl
    ? 'Έχω αρκετά για να σας δείξω ακριβή αποτελέσματα. Πείτε μου αν θέλετε να αλλάξω κάτι.'
    : "That's enough for me to rank these accurately. Tell me if you'd like to change anything."
}
