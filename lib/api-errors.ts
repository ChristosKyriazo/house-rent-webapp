/**
 * Greek for the error messages the API returns.
 *
 * Routes answer `{ error: '<English message>' }`. The visitor's language only lives in the
 * browser, so translation happens where the error is shown: `apiErrorText(data, language)`
 * looks the message up here. A message that isn't listed falls back to the given fallback
 * (or the English text), so a new route can never show a blank error — but add its Greek
 * here when you add the message. tests/lib/api-errors.test.ts checks every message the API
 * can return has an entry.
 */

type Lang = 'el' | 'en'

export const API_ERRORS_EL: Record<string, string> = {
  // Generic
  'Internal server error': 'Παρουσιάστηκε σφάλμα. Δοκιμάστε ξανά.',
  'Unauthorized': 'Πρέπει να συνδεθείτε.',
  'Forbidden': 'Δεν έχετε πρόσβαση σε αυτή την ενέργεια.',
  'Not found': 'Δεν βρέθηκε.',
  'not_found': 'Δεν βρέθηκε.',
  'Error': 'Σφάλμα',
  'Σφάλμα': 'Σφάλμα',
  'Please try again': 'Δοκιμάστε ξανά.',
  'Invalid request': 'Μη έγκυρο αίτημα.',
  'Invalid request body': 'Μη έγκυρο αίτημα.',
  'Invalid JSON': 'Μη έγκυρο αίτημα.',
  'Validation failed': 'Ελέγξτε τα στοιχεία που συμπληρώσατε.',
  'Missing required fields': 'Συμπληρώστε όλα τα υποχρεωτικά πεδία.',
  'Too many requests': 'Πάρα πολλά αιτήματα. Περιμένετε λίγο και δοκιμάστε ξανά.',
  'Too many requests. Please wait a moment.': 'Πάρα πολλά αιτήματα. Περιμένετε λίγο.',
  'rate_limited': 'Πάρα πολλά αιτήματα. Περιμένετε λίγο και δοκιμάστε ξανά.',
  'not_permitted': 'Δεν επιτρέπεται.',
  'not_implemented': 'Δεν είναι ακόμη διαθέσιμο.',
  'unknown_tool': 'Παρουσιάστηκε σφάλμα. Δοκιμάστε ξανά.',
  'User not found': 'Ο χρήστης δεν βρέθηκε.',
  'User not found in Clerk': 'Ο χρήστης δεν βρέθηκε.',
  'Invalid user ID': 'Μη έγκυρος χρήστης.',
  'Failed to fetch user information': 'Δεν ήταν δυνατή η φόρτωση των στοιχείων χρήστη.',
  'Name is required': 'Το όνομα είναι υποχρεωτικό.',
  'A valid email is required': 'Απαιτείται έγκυρο email.',
  'Invalid role. Must be "owner" or "user': 'Μη έγκυρος ρόλος.',

  // Features switched off
  'AI search is currently disabled': 'Η αναζήτηση με AI δεν είναι διαθέσιμη αυτή τη στιγμή.',
  'Bookings are currently disabled': 'Οι κρατήσεις δεν είναι διαθέσιμες αυτή τη στιγμή.',
  'The usage assistant is currently disabled': 'Ο βοηθός χρήσης δεν είναι διαθέσιμος αυτή τη στιγμή.',
  'OpenAI API key not configured': 'Η υπηρεσία AI δεν είναι διαθέσιμη αυτή τη στιγμή.',
  'OpenAI not configured': 'Η υπηρεσία AI δεν είναι διαθέσιμη αυτή τη στιγμή.',
  'Notes are not available': 'Οι σημειώσεις δεν είναι διαθέσιμες αυτή τη στιγμή.',
  'stripe_not_configured': 'Οι πληρωμές δεν είναι διαθέσιμες αυτή τη στιγμή.',

  // Rate limits
  'Too many AI description requests. Please wait before trying again.': 'Πάρα πολλά αιτήματα περιγραφής AI. Περιμένετε λίγο πριν δοκιμάσετε ξανά.',
  'Too many AI search requests. Please wait before searching again.': 'Πάρα πολλές αναζητήσεις AI. Περιμένετε λίγο πριν αναζητήσετε ξανά.',
  'Too many bulk uploads. Please wait before starting another job.': 'Πάρα πολλές μαζικές μεταφορτώσεις. Περιμένετε πριν ξεκινήσετε νέα.',
  'Too many requests. Please wait before creating another listing.': 'Πάρα πολλά αιτήματα. Περιμένετε πριν δημιουργήσετε νέα αγγελία.',

  // Listings
  'Home not found': 'Η αγγελία δεν βρέθηκε.',
  'Home listing not found': 'Η αγγελία δεν βρέθηκε.',
  'Home ID is required': 'Λείπει η αγγελία.',
  'This listing is temporarily unavailable': 'Η αγγελία είναι προσωρινά μη διαθέσιμη.',
  'This property is no longer available': 'Το ακίνητο δεν είναι πλέον διαθέσιμο.',
  'You do not own this home': 'Δεν είστε ο ιδιοκτήτης αυτής της αγγελίας.',
  'You do not own this listing': 'Δεν είστε ο ιδιοκτήτης αυτής της αγγελίας.',
  'You can only delete your own listings': 'Μπορείτε να διαγράψετε μόνο τις δικές σας αγγελίες.',
  'You can only update your own listings': 'Μπορείτε να επεξεργαστείτε μόνο τις δικές σας αγγελίες.',
  'Only owners can create listings': 'Μόνο ιδιοκτήτες μπορούν να δημιουργήσουν αγγελίες.',
  'Only owners can create areas': 'Μόνο ιδιοκτήτες μπορούν να προσθέσουν περιοχές.',
  'Only owners and brokers can delete listings': 'Μόνο ιδιοκτήτες και μεσίτες μπορούν να διαγράψουν αγγελίες.',
  'Only owners and brokers can promote listings': 'Μόνο ιδιοκτήτες και μεσίτες μπορούν να προωθήσουν αγγελίες.',
  'Only owners and brokers can update listings': 'Μόνο ιδιοκτήτες και μεσίτες μπορούν να επεξεργαστούν αγγελίες.',
  'Only owners and brokers can upload listings': 'Μόνο ιδιοκτήτες και μεσίτες μπορούν να ανεβάσουν αγγελίες.',
  'Only owners and brokers can use bulk upload': 'Μόνο ιδιοκτήτες και μεσίτες μπορούν να κάνουν μαζική μεταφόρτωση.',
  'Only owners and brokers can view their listings': 'Μόνο ιδιοκτήτες και μεσίτες έχουν αγγελίες.',
  'Invalid date format for availableFrom': 'Μη έγκυρη ημερομηνία διαθεσιμότητας.',
  'No keys provided': 'Δεν επιλέχθηκαν αγγελίες.',
  'homeKey is required': 'Λείπει η αγγελία.',
  'homeKey and mode ("slot" | "boost") are required': 'Λείπει η αγγελία ή ο τύπος προώθησης.',
  'limit_reached': 'Φτάσατε το όριο αγγελιών του πακέτου σας.',
  'no_slots_available': 'Δεν υπάρχουν διαθέσιμες θέσεις προώθησης στο πακέτο σας.',
  'payment_required': 'Απαιτείται πληρωμή.',
  'subscription_required': 'Χρειάζεται αναβάθμιση συνδρομής.',
  'already_boosted': 'Η αγγελία προωθείται ήδη.',
  'boost_requires_team_approval': 'Η προώθηση χρειάζεται έγκριση από τον κύριο μεσίτη της ομάδας.',
  'invalid_pack': 'Μη έγκυρο πακέτο.',
  'Cannot upgrade to free tier': 'Δεν γίνεται αναβάθμιση στο δωρεάν πακέτο.',

  // Uploads
  'No file provided': 'Δεν επιλέχθηκε αρχείο.',
  'File too large. Maximum size is 5MB.': 'Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος 5MB.',
  'Invalid file type. Only JPEG, PNG, and WebP are allowed.': 'Μη αποδεκτός τύπος αρχείου. Επιτρέπονται μόνο JPEG, PNG και WebP.',
  'Excel file is required': 'Απαιτείται αρχείο Excel.',
  'Excel file is empty': 'Το αρχείο Excel είναι κενό.',
  'Apple Numbers files cannot be uploaded directly. In Numbers, choose File → Export To → Excel (.xlsx), then upload the exported file.':
    'Τα αρχεία Apple Numbers δεν ανεβαίνουν απευθείας. Στο Numbers επιλέξτε Αρχείο → Εξαγωγή σε → Excel (.xlsx) και ανεβάστε το αρχείο που προκύπτει.',
  'Failed to generate template': 'Δεν ήταν δυνατή η δημιουργία του προτύπου.',
  'Failed to start bulk upload': 'Δεν ήταν δυνατή η έναρξη της μαζικής μεταφόρτωσης.',
  'Job not found': 'Η εργασία δεν βρέθηκε.',

  // Search
  'Search query is required': 'Γράψτε τι αναζητάτε.',
  'query is required': 'Γράψτε τι αναζητάτε.',
  'message is required': 'Γράψτε ένα μήνυμα.',
  'Conversation not found': 'Η συνομιλία δεν βρέθηκε.',
  'conversationKey is required': 'Η συνομιλία δεν βρέθηκε.',
  'conversationKey required for ai type': 'Η συνομιλία δεν βρέθηκε.',
  'filters must be an object': 'Μη έγκυρα φίλτρα.',
  'filterParams required for filter type': 'Λείπουν τα φίλτρα.',
  'type must be "filter" or "ai': 'Μη έγκυρος τύπος αναζήτησης.',
  'type must be "rent" or "buy"': 'Επιλέξτε ενοικίαση ή αγορά.',
  'minMatchPercent must be 1–100': 'Το ποσοστό ταιριάσματος πρέπει να είναι από 1 έως 100.',
  'Not your saved search': 'Δεν είναι δική σας αποθηκευμένη αναζήτηση.',
  'key is required': 'Λείπει το αναγνωριστικό.',

  // Inquiries & finalization
  'Inquiry already exists': 'Έχετε ήδη στείλει αίτημα για αυτό το ακίνητο.',
  'Inquiry not found': 'Το αίτημα δεν βρέθηκε.',
  'Invalid inquiry ID': 'Μη έγκυρο αίτημα.',
  'Owners cannot create inquiries on their own properties': 'Δεν μπορείτε να στείλετε αίτημα για δικό σας ακίνητο.',
  'Not authorized to view inquiries for this home': 'Δεν έχετε πρόσβαση στα αιτήματα αυτής της αγγελίας.',
  'Not authorized to view this inquiry': 'Δεν έχετε πρόσβαση σε αυτό το αίτημα.',
  'Only owners and brokers can view inquiries': 'Μόνο ιδιοκτήτες και μεσίτες βλέπουν αιτήματα.',
  'Invalid action. Must be "approve" or "dismiss': 'Μη έγκυρη ενέργεια.',
  'moveInDate is required and must be a valid date': 'Επιλέξτε έγκυρη ημερομηνία μετακόμισης.',
  'No confirmed finalization found': 'Δεν βρέθηκε επιβεβαιωμένη οριστικοποίηση.',
  'Home does not match finalization': 'Η αγγελία δεν αντιστοιχεί στην οριστικοποίηση.',

  // Bookings & availability
  'Booking not found': 'Το ραντεβού δεν βρέθηκε.',
  'Invalid booking ID': 'Μη έγκυρο ραντεβού.',
  'You must have an approved inquiry to book a viewing': 'Χρειάζεστε εγκεκριμένο αίτημα για να κλείσετε επίσκεψη.',
  'You already have an appointment at this time': 'Έχετε ήδη ραντεβού αυτή την ώρα.',
  'The owner/broker already has an appointment at this time': 'Ο ιδιοκτήτης/μεσίτης έχει ήδη ραντεβού αυτή την ώρα.',
  'This time was just booked by someone else. Please pick another slot.': 'Η ώρα αυτή μόλις κλείστηκε από κάποιον άλλον. Επιλέξτε άλλη ώρα.',
  'Booking must reference a valid availability or inquiry': 'Το ραντεβού πρέπει να αντιστοιχεί σε διαθέσιμη ώρα ή αίτημα.',
  'Invalid appointment time range': 'Μη έγκυρο χρονικό διάστημα ραντεβού.',
  'Missing or invalid required fields: availabilityId, startTime, endTime': 'Επιλέξτε ημερομηνία και ώρα.',
  'The selected time slot is not within the availability date': 'Η ώρα που επιλέξατε δεν είναι μέσα στη διαθέσιμη ημερομηνία.',
  'The selected time slot is not within the availability time range': 'Η ώρα που επιλέξατε δεν είναι μέσα στο διαθέσιμο ωράριο.',
  'Bookings can only be rescheduled more than 24 hours in advance': 'Ένα ραντεβού αλλάζει μόνο έως 24 ώρες πριν.',
  'Cannot reschedule to a different property': 'Δεν γίνεται μεταφορά ραντεβού σε άλλο ακίνητο.',
  'Cannot cancel a meeting that has already started': 'Δεν γίνεται ακύρωση ραντεβού που έχει ήδη ξεκινήσει.',
  'Only scheduled bookings can be cancelled': 'Μόνο προγραμματισμένα ραντεβού ακυρώνονται.',
  'Only scheduled bookings can be rescheduled': 'Μόνο προγραμματισμένα ραντεβού αλλάζουν ώρα.',
  'Only the user or owner can cancel this booking': 'Μόνο οι συμμετέχοντες μπορούν να ακυρώσουν το ραντεβού.',
  'Only the user or owner can reschedule this booking': 'Μόνο οι συμμετέχοντες μπορούν να αλλάξουν την ώρα.',
  'Only the owner can view bookings for this home': 'Μόνο ο ιδιοκτήτης βλέπει τα ραντεβού της αγγελίας.',
  'Owner ID is required': 'Λείπει ο ιδιοκτήτης.',
  'At least one availability slot is required': 'Προσθέστε τουλάχιστον μία διαθέσιμη ώρα.',
  'Availability ID is required': 'Επιλέξτε διαθέσιμη ώρα.',
  'Availability does not belong to this home': 'Η διαθέσιμη ώρα δεν αφορά αυτή την αγγελία.',
  'Availability slot not found': 'Η διαθέσιμη ώρα δεν βρέθηκε.',
  'Only the owner can set availability': 'Μόνο ο ιδιοκτήτης ορίζει διαθεσιμότητα.',
  'Only the owner can update availability': 'Μόνο ο ιδιοκτήτης αλλάζει τη διαθεσιμότητα.',

  // Ratings
  'Rating not found': 'Η αξιολόγηση δεν βρέθηκε.',
  'Invalid rating ID': 'Μη έγκυρη αξιολόγηση.',
  'Unknown rating type': 'Άγνωστος τύπος αξιολόγησης.',
  'No valid booking found': 'Δεν βρέθηκε ολοκληρωμένη επίσκεψη για αξιολόγηση.',
  'No valid booking found for this tenant': 'Δεν βρέθηκε ολοκληρωμένη επίσκεψη με αυτόν τον ενοικιαστή.',
  'Listing is not managed by a broker': 'Η αγγελία δεν διαχειρίζεται από μεσίτη.',
  'You can only rate the broker on this booking': 'Μπορείτε να αξιολογήσετε μόνο τον μεσίτη αυτού του ραντεβού.',
  'You have already rated this broker for this booking': 'Έχετε ήδη αξιολογήσει τον μεσίτη για αυτό το ραντεβού.',
  'You have already rated this tenant for this booking': 'Έχετε ήδη αξιολογήσει τον ενοικιαστή για αυτό το ραντεβού.',
  'You have already rated this tenant for this finalization': 'Έχετε ήδη αξιολογήσει τον ενοικιαστή.',
  'You have already submitted a move-in rating for this finalization': 'Έχετε ήδη υποβάλει αξιολόγηση μετακόμισης.',
  'You have already submitted a move-out rating for this finalization': 'Έχετε ήδη υποβάλει αξιολόγηση αποχώρησης.',
  'Only the rated party can flag a rating': 'Μόνο όποιος αξιολογήθηκε μπορεί να αναφέρει την αξιολόγηση.',
  'You cannot flag your own rating': 'Δεν μπορείτε να αναφέρετε δική σας αξιολόγηση.',

  // Notifications & notes
  'Notification ID required': 'Λείπει η ειδοποίηση.',
  'Note not found': 'Η σημείωση δεν βρέθηκε.',
  'Visitor not found': 'Ο επισκέπτης δεν βρέθηκε.',
  'bookingKey is required': 'Λείπει το ραντεβού.',
  'homeKey or bookingKey is required': 'Λείπει η αγγελία ή το ραντεβού.',

  // Teams
  'Upgrade to Pro to build a team': 'Αναβαθμίστε σε Pro για να φτιάξετε ομάδα.',
  'Only brokers can build a team': 'Μόνο μεσίτες μπορούν να φτιάξουν ομάδα.',
  'A broker who is part of a team cannot invite others': 'Μέλος ομάδας δεν μπορεί να προσκαλέσει άλλους.',
  'You cannot invite yourself': 'Δεν μπορείτε να προσκαλέσετε τον εαυτό σας.',
  'You are already part of a team': 'Είστε ήδη μέλος ομάδας.',
  'You are not part of a team': 'Δεν είστε μέλος ομάδας.',
  'You do not lead a team': 'Δεν είστε επικεφαλής ομάδας.',
  'You manage your own team; leave it before joining another': 'Διαχειρίζεστε δική σας ομάδα· αποχωρήστε πρώτα για να μπείτε σε άλλη.',
  'You cannot accept your own invitation': 'Δεν μπορείτε να αποδεχτείτε δική σας πρόσκληση.',
  'Invitation not found': 'Η πρόσκληση δεν βρέθηκε.',
  'This invitation has expired': 'Η πρόσκληση έχει λήξει.',
  'This invitation is no longer valid': 'Η πρόσκληση δεν ισχύει πλέον.',
  'This invitation was sent to a different email address': 'Η πρόσκληση στάλθηκε σε άλλο email.',
  'Not your invitation': 'Η πρόσκληση δεν είναι για εσάς.',
  'Not your team': 'Δεν είναι η ομάδα σας.',
  'Not your team member': 'Δεν είναι μέλος της ομάδας σας.',
  'Team member not found': 'Το μέλος της ομάδας δεν βρέθηκε.',
  'Invalid member id': 'Μη έγκυρο μέλος.',
  'This broker is not on your team': 'Ο μεσίτης δεν είναι στην ομάδα σας.',
  'This listing is not on your team': 'Η αγγελία δεν ανήκει στην ομάδα σας.',
  'Only Main brokers can boost team listings': 'Μόνο ο κύριος μεσίτης προωθεί αγγελίες της ομάδας.',
  'Only brokers who are part of a team can request boosts': 'Μόνο μέλη ομάδας μπορούν να ζητήσουν προώθηση.',
  'Boost request not found': 'Το αίτημα προώθησης δεν βρέθηκε.',
  'This request has already been decided': 'Το αίτημα έχει ήδη απαντηθεί.',
  'This request is not addressed to you': 'Το αίτημα δεν απευθύνεται σε εσάς.',
  'already_in_team': 'Ο μεσίτης είναι ήδη σε ομάδα.',
  'already_invited': 'Έχει ήδη σταλεί πρόσκληση.',
  'already_requested': 'Έχετε ήδη ζητήσει προώθηση.',
  'is_team_lead': 'Ο μεσίτης είναι επικεφαλής άλλης ομάδας.',
  'team_full': 'Η ομάδα είναι πλήρης.',
  'team_members_present': 'Η ομάδα έχει ακόμη μέλη.',

  // Infrastructure-only messages (shown generically if they ever reach a user)
  'Missing stripe signature or webhook secret': 'Παρουσιάστηκε σφάλμα πληρωμής.',
}

/** Messages with a variable part. */
const PATTERNS_EL: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^Bulk uploads are limited to (\d+) listings per file\. Your file has (\d+) rows/, m => `Η μαζική μεταφόρτωση επιτρέπει έως ${m[1]} αγγελίες ανά αρχείο. Το αρχείο σας έχει ${m[2]} γραμμές — χωρίστε το σε μικρότερα.`],
  [/^Photo (.+) for house (\d+) exceeds 5MB limit/, m => `Η φωτογραφία ${m[1]} του σπιτιού ${m[2]} ξεπερνά τα 5MB.`],
  [/^Photo (.+) for house (\d+) is not a valid JPEG, PNG, or WebP image/, m => `Η φωτογραφία ${m[1]} του σπιτιού ${m[2]} δεν είναι έγκυρη εικόνα JPEG, PNG ή WebP.`],
  [/^Webhook signature invalid/, () => 'Παρουσιάστηκε σφάλμα πληρωμής.'],
]

export function translateApiError(message: string, language: Lang): string {
  if (language !== 'el') return message
  const exact = API_ERRORS_EL[message] ?? API_ERRORS_EL[message.trim()]
  if (exact) return exact
  for (const [re, fn] of PATTERNS_EL) {
    const m = message.match(re)
    if (m) return fn(m)
  }
  return message
}

/**
 * The text to show for an API error response, in the visitor's language.
 * `data` is the parsed JSON body (or anything); `fallback` is used when it has no message.
 */
export function apiErrorText(data: unknown, language: Lang, fallback?: string): string {
  const msg = typeof data === 'string' ? data : (data as { error?: unknown } | null)?.error
  if (typeof msg === 'string' && msg.trim()) return translateApiError(msg, language)
  return fallback ?? (language === 'el' ? 'Παρουσιάστηκε σφάλμα. Δοκιμάστε ξανά.' : 'Something went wrong. Please try again.')
}
