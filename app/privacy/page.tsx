'use client'

import Link from 'next/link'
import { useLanguage } from '@/app/contexts/LanguageContext'

const EFFECTIVE_DATE = '3 June 2026'
const EFFECTIVE_DATE_GR = '3 Ιουνίου 2026'
const CONTACT_EMAIL = 'privacy@kaparro.gr'

export default function PrivacyPolicyPage() {
  const { language } = useLanguage()
  const isEl = language === 'el'

  return (
    <div className="min-h-screen bg-[var(--canvas)] pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto">

        <div className="mb-10">
          <Link
            href="/"
            className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          >
            ← {isEl ? 'Αρχική' : 'Home'}
          </Link>
        </div>

        <h1 className="text-4xl font-bold text-[var(--text)] mb-2">
          {isEl ? 'Πολιτική Απορρήτου' : 'Privacy Policy'}
        </h1>
        <p className="text-sm text-[var(--text-muted)] mb-12">
          {isEl ? `Τελευταία ενημέρωση: ${EFFECTIVE_DATE_GR}` : `Last updated: ${EFFECTIVE_DATE}`}
        </p>

        <div className="space-y-10 text-[var(--text)]">

          {/* 1. Who we are */}
          <section>
            <h2 className="text-xl font-semibold mb-3">
              {isEl ? '1. Ποιοι είμαστε' : '1. Who we are'}
            </h2>
            <p className="text-[var(--text-muted)] leading-relaxed">
              {isEl
                ? 'Η Kaparro είναι μια ψηφιακή πλατφόρμα αγοράς και ενοικίασης ακινήτων που λειτουργεί στην Ελλάδα. Υπεύθυνος επεξεργασίας δεδομένων είναι η Kaparro (kaparro.gr). Για ερωτήσεις σχετικά με τα προσωπικά σας δεδομένα, επικοινωνήστε μαζί μας στο: '
                : 'Kaparro is a digital property rental and purchase platform operating in Greece. The data controller is Kaparro (kaparro.gr). For questions about your personal data, contact us at: '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--accent)] underline underline-offset-2">
                {CONTACT_EMAIL}
              </a>
            </p>
          </section>

          {/* 2. What data we collect */}
          <section>
            <h2 className="text-xl font-semibold mb-3">
              {isEl ? '2. Ποια δεδομένα συλλέγουμε' : '2. What data we collect'}
            </h2>

            <h3 className="font-medium mb-2 text-[var(--text)]">
              {isEl ? 'Κατά την εγγραφή και τη χρήση' : 'When you create an account'}
            </h3>
            <ul className="list-disc list-inside text-[var(--text-muted)] leading-relaxed space-y-1 mb-4">
              <li>{isEl ? 'Όνομα και διεύθυνση email' : 'Name and email address'}</li>
              <li>{isEl ? 'Ρόλος (ενοικιαστής, ιδιοκτήτης, ή και τα δύο)' : 'Role (renter, owner, or both)'}</li>
              <li>{isEl ? 'Προαιρετικά: ημερομηνία γέννησης, επάγγελμα, τίτλος' : 'Optionally: date of birth, occupation, title'}</li>
              <li>{isEl ? 'Ιστορικό αιτημάτων ενοικίασης και κρατήσεων' : 'Rental inquiry and booking history'}</li>
              <li>{isEl ? 'Αξιολογήσεις που λάβατε ή δώσατε' : 'Ratings you gave or received'}</li>
            </ul>

            <h3 className="font-medium mb-2 text-[var(--text)]">
              {isEl ? 'Κατά την περιήγηση σε αγγελίες (συνδεδεμένοι χρήστες)' : 'When you browse listings (logged-in users)'}
            </h3>
            <ul className="list-disc list-inside text-[var(--text-muted)] leading-relaxed space-y-1 mb-4">
              <li>{isEl ? 'Εσωτερικό αναγνωριστικό χρήστη' : 'Internal user ID'}</li>
              <li>{isEl ? 'Ποια αγγελία επισκεφθήκατε' : 'Which listing you viewed'}</li>
              <li>{isEl ? 'Πώς φτάσατε στην αγγελία (αναζήτηση, χάρτης, κ.λπ.)' : 'How you arrived at the listing (search, map, etc.)'}</li>
              <li>{isEl ? 'Κατά προσέγγιση χρόνος παραμονής στη σελίδα' : 'Approximate time spent on the listing page'}</li>
              <li>{isEl ? 'Χρονική σήμανση επίσκεψης' : 'Timestamp of the visit'}</li>
            </ul>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4 italic">
              {isEl
                ? 'Δεν αποθηκεύουμε διεύθυνση IP, αποτύπωμα συσκευής ή οποιοδήποτε αναγνωριστικό διαφήμισης.'
                : 'We do not store IP addresses, device fingerprints, or any advertising identifier.'}
            </p>

            <h3 className="font-medium mb-2 text-[var(--text)]">
              {isEl ? 'Κατά την περιήγηση χωρίς σύνδεση (ανώνυμοι επισκέπτες)' : 'When you browse without logging in (anonymous visitors)'}
            </h3>
            <p className="text-[var(--text-muted)] leading-relaxed">
              {isEl
                ? 'Δημιουργούμε ένα τυχαίο αναγνωριστικό συνεδρίας (UUID) αποθηκευμένο στο sessionStorage του προγράμματος περιήγησής σας. Αυτό διαγράφεται αυτόματα όταν κλείσετε την καρτέλα ή το παράθυρο. Δεν είναι cookie, δεν παραμένει μεταξύ συνεδριών και δεν μπορεί να συνδεθεί με εσάς ως φυσικό πρόσωπο. Στα πλαίσια του GDPR, αυτά τα δεδομένα δεν θεωρούνται προσωπικά δεδομένα.'
                : 'We create a random session identifier (UUID) stored in your browser\'s sessionStorage. This is deleted automatically when you close the tab or window. It is not a cookie, does not persist between sessions, and cannot be linked to you as an individual. Under GDPR, this data is not considered personal data.'}
            </p>
          </section>

          {/* 3. Why we collect it */}
          <section>
            <h2 className="text-xl font-semibold mb-3">
              {isEl ? '3. Γιατί συλλέγουμε αυτά τα δεδομένα' : '3. Why we collect this data'}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-[var(--text-muted)] border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    <th className="text-left py-2 pr-4 font-medium text-[var(--text)]">
                      {isEl ? 'Σκοπός' : 'Purpose'}
                    </th>
                    <th className="text-left py-2 pr-4 font-medium text-[var(--text)]">
                      {isEl ? 'Νομική βάση' : 'Legal basis'}
                    </th>
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  <tr className="border-b border-[var(--border-subtle)]/50">
                    <td className="py-3 pr-4 leading-relaxed">
                      {isEl ? 'Παροχή υπηρεσιών πλατφόρμας (εγγραφή, αγγελίες, αιτήματα, κρατήσεις)' : 'Providing platform services (registration, listings, inquiries, bookings)'}
                    </td>
                    <td className="py-3 leading-relaxed">
                      {isEl ? 'Εκτέλεση σύμβασης (Άρθρο 6(1)(β) GDPR)' : 'Contract performance (Art. 6(1)(b) GDPR)'}
                    </td>
                  </tr>
                  <tr className="border-b border-[var(--border-subtle)]/50">
                    <td className="py-3 pr-4 leading-relaxed">
                      {isEl ? 'Παροχή συγκεντρωτικών στατιστικών επισκεψιμότητας αγγελιών στους ιδιοκτήτες' : 'Providing aggregated listing engagement stats to owners'}
                    </td>
                    <td className="py-3 leading-relaxed">
                      {isEl ? 'Έννομο συμφέρον (Άρθρο 6(1)(στ) GDPR)' : 'Legitimate interest (Art. 6(1)(f) GDPR)'}
                    </td>
                  </tr>
                  <tr className="border-b border-[var(--border-subtle)]/50">
                    <td className="py-3 pr-4 leading-relaxed">
                      {isEl ? 'Αποστολή ειδοποιήσεων εντός εφαρμογής (νέο αίτημα, έγκριση, κ.λπ.)' : 'Sending in-app notifications (new inquiry, approval, etc.)'}
                    </td>
                    <td className="py-3 leading-relaxed">
                      {isEl ? 'Εκτέλεση σύμβασης (Άρθρο 6(1)(β) GDPR)' : 'Contract performance (Art. 6(1)(b) GDPR)'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 leading-relaxed">
                      {isEl ? 'Ασφάλεια και πρόληψη απάτης' : 'Security and fraud prevention'}
                    </td>
                    <td className="py-3 leading-relaxed">
                      {isEl ? 'Έννομο συμφέρον (Άρθρο 6(1)(στ) GDPR)' : 'Legitimate interest (Art. 6(1)(f) GDPR)'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 4. Who can see your data */}
          <section>
            <h2 className="text-xl font-semibold mb-3">
              {isEl ? '4. Ποιος βλέπει τα δεδομένα σας' : '4. Who sees your data'}
            </h2>
            <p className="text-[var(--text-muted)] leading-relaxed mb-3">
              {isEl
                ? 'Δεν πουλάμε ή μοιραζόμαστε τα προσωπικά σας δεδομένα με τρίτους για σκοπούς μάρκετινγκ.'
                : 'We do not sell or share your personal data with third parties for marketing purposes.'}
            </p>
            <ul className="list-disc list-inside text-[var(--text-muted)] leading-relaxed space-y-2">
              <li>
                <strong className="text-[var(--text)]">{isEl ? 'Ιδιοκτήτες ακινήτων:' : 'Listing owners:'}</strong>{' '}
                {isEl
                  ? 'Βλέπουν μόνο συγκεντρωτικά στατιστικά (π.χ. "42 επισκέψεις αυτή την εβδομάδα"). Δεν αποκαλύπτεται καμία ατομική ταυτότητα επισκέπτη.'
                  : 'See only aggregated statistics (e.g. "42 views this week"). No individual visitor identity is ever disclosed.'}
              </li>
              <li>
                <strong className="text-[var(--text)]">Clerk:</strong>{' '}
                {isEl
                  ? 'Ο πάροχος ταυτοποίησής μας. Επεξεργάζεται email και κωδικό πρόσβασης για λογαριασμό μας.'
                  : 'Our authentication provider. Processes your email and password on our behalf.'}
              </li>
              <li>
                <strong className="text-[var(--text)]">Cal.com:</strong>{' '}
                {isEl
                  ? 'Εάν επιλέξετε να συνδέσετε το Cal.com για κρατήσεις, μοιραζόμαστε μόνο τα δεδομένα που απαιτούνται για τον συγχρονισμό ραντεβού.'
                  : 'If you choose to connect Cal.com for bookings, we share only the data required for appointment sync.'}
              </li>
            </ul>
          </section>

          {/* 5. How long we keep it */}
          <section>
            <h2 className="text-xl font-semibold mb-3">
              {isEl ? '5. Πόσο καιρό διατηρούμε τα δεδομένα' : '5. How long we keep your data'}
            </h2>
            <ul className="list-disc list-inside text-[var(--text-muted)] leading-relaxed space-y-2">
              <li>
                <strong className="text-[var(--text)]">{isEl ? 'Λογαριασμός:' : 'Account data:'}</strong>{' '}
                {isEl ? 'Διατηρείται όσο ο λογαριασμός σας είναι ενεργός.' : 'Kept for as long as your account is active.'}
              </li>
              <li>
                <strong className="text-[var(--text)]">{isEl ? 'Δεδομένα επισκεψιμότητας αγγελιών:' : 'Listing view data:'}</strong>{' '}
                {isEl
                  ? 'Τα αρχικά δεδομένα διαγράφονται αυτόματα μετά από 90 ημέρες. Συγκεντρωτικά στατιστικά (χωρίς προσωπικά δεδομένα) διατηρούνται αόριστα.'
                  : 'Raw view records are automatically deleted after 90 days. Aggregated statistics (containing no personal data) are retained indefinitely.'}
              </li>
              <li>
                <strong className="text-[var(--text)]">{isEl ? 'Αξιολογήσεις και ιστορικό συναλλαγών:' : 'Ratings and transaction history:'}</strong>{' '}
                {isEl
                  ? 'Διατηρούνται για τη λειτουργία της πλατφόρμας (αξιοπιστία, ασφάλεια).'
                  : 'Retained for platform integrity and trust purposes.'}
              </li>
            </ul>
          </section>

          {/* 6. Your rights */}
          <section>
            <h2 className="text-xl font-semibold mb-3">
              {isEl ? '6. Τα δικαιώματά σας' : '6. Your rights'}
            </h2>
            <p className="text-[var(--text-muted)] leading-relaxed mb-3">
              {isEl
                ? 'Ως υποκείμενο δεδομένων στην ΕΕ, έχετε τα εξής δικαιώματα:'
                : 'As a data subject in the EU, you have the following rights:'}
            </p>
            <ul className="list-disc list-inside text-[var(--text-muted)] leading-relaxed space-y-2 mb-4">
              <li><strong className="text-[var(--text)]">{isEl ? 'Πρόσβαση:' : 'Access:'}</strong>{' '}{isEl ? 'Να λάβετε αντίγραφο των δεδομένων σας.' : 'Request a copy of your data.'}</li>
              <li><strong className="text-[var(--text)]">{isEl ? 'Διόρθωση:' : 'Rectification:'}</strong>{' '}{isEl ? 'Να διορθώσετε ανακριβή δεδομένα.' : 'Correct inaccurate data.'}</li>
              <li><strong className="text-[var(--text)]">{isEl ? 'Διαγραφή:' : 'Erasure:'}</strong>{' '}{isEl ? 'Να ζητήσετε τη διαγραφή των δεδομένων σας. Κατά τη διαγραφή λογαριασμού, το αναγνωριστικό χρήστη αφαιρείται από όλα τα αρχεία επισκεψιμότητας (τα εγγραφά γίνονται ανώνυμα).' : 'Request deletion of your data. Upon account deletion, your user ID is removed from all view records (records are anonymised, not deleted).'}</li>
              <li><strong className="text-[var(--text)]">{isEl ? 'Εναντίωση:' : 'Objection:'}</strong>{' '}{isEl ? 'Να εναντιωθείτε στην επεξεργασία βάσει εννόμου συμφέροντος.' : 'Object to processing based on legitimate interest.'}</li>
              <li><strong className="text-[var(--text)]">{isEl ? 'Φορητότητα:' : 'Portability:'}</strong>{' '}{isEl ? 'Να λάβετε τα δεδομένα σας σε δομημένο μορφότυπο.' : 'Receive your data in a structured format.'}</li>
            </ul>
            <p className="text-[var(--text-muted)] leading-relaxed">
              {isEl
                ? 'Για την άσκηση οποιουδήποτε δικαιώματος, επικοινωνήστε με το '
                : 'To exercise any right, contact '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--accent)] underline underline-offset-2">
                {CONTACT_EMAIL}
              </a>
              {isEl
                ? '. Έχετε επίσης δικαίωμα υποβολής καταγγελίας στην Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα (ΑΠΔΠΧ, www.dpa.gr).'
                : '. You also have the right to lodge a complaint with the Hellenic Data Protection Authority (HDPA, www.dpa.gr).'}
            </p>
          </section>

          {/* 7. Cookies and storage */}
          <section>
            <h2 className="text-xl font-semibold mb-3">
              {isEl ? '7. Cookies και αποθήκευση στον browser' : '7. Cookies and browser storage'}
            </h2>
            <ul className="list-disc list-inside text-[var(--text-muted)] leading-relaxed space-y-2">
              <li>
                <strong className="text-[var(--text)]">{isEl ? 'Απολύτως αναγκαία cookies (Clerk):' : 'Strictly necessary cookies (Clerk):'}</strong>{' '}
                {isEl
                  ? 'Χρησιμοποιούμε cookies συνεδρίας που ορίζει το Clerk για τη διαχείριση της ταυτοποίησης. Αυτά είναι απολύτως αναγκαία για τη λειτουργία της πλατφόρμας και δεν απαιτούν τη συγκατάθεσή σας.'
                  : 'We use session cookies set by Clerk to manage authentication. These are strictly necessary for the platform to function and do not require your consent.'}
              </li>
              <li>
                <strong className="text-[var(--text)]">sessionStorage:</strong>{' '}
                {isEl
                  ? 'Για ανώνυμους επισκέπτες, αποθηκεύουμε ένα τυχαίο αναγνωριστικό συνεδρίας στο sessionStorage (όχι cookie). Διαγράφεται αυτόματα όταν κλείσετε την καρτέλα. Δεν απαιτείται συγκατάθεση.'
                  : 'For anonymous visitors, we store a random session identifier in sessionStorage (not a cookie). It is deleted automatically when you close the tab. No consent is required.'}
              </li>
            </ul>
          </section>

          {/* 8. Changes */}
          <section>
            <h2 className="text-xl font-semibold mb-3">
              {isEl ? '8. Αλλαγές στην πολιτική' : '8. Changes to this policy'}
            </h2>
            <p className="text-[var(--text-muted)] leading-relaxed">
              {isEl
                ? 'Ενδέχεται να ενημερώνουμε αυτή την πολιτική κατά καιρούς. Η ημερομηνία τελευταίας ενημέρωσης εμφανίζεται στην κορυφή. Για σημαντικές αλλαγές, θα σας ειδοποιήσουμε μέσω email ή ειδοποίησης εντός εφαρμογής.'
                : 'We may update this policy from time to time. The last-updated date is shown at the top. For material changes, we will notify you by email or in-app notification.'}
            </p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-[var(--border-subtle)] text-sm text-[var(--text-muted)]">
          <Link href="/" className="hover:text-[var(--accent)] transition-colors">
            Kaparro
          </Link>
          {' · '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-[var(--accent)] transition-colors">
            {CONTACT_EMAIL}
          </a>
        </div>

      </div>
    </div>
  )
}
