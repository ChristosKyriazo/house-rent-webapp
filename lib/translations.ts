export type Language = 'el' | 'en'

export const translations = {
  el: {
    // App
    appTitle: 'Καλώς ήρθατε',
    appDescription: 'Βρείτε το ιδανικό σπίτι για ενοικίαση ή αγορά',
    signUp: 'Εγγραφή',
    signIn: 'Σύνδεση',
    welcome: 'Καλώς ήρθατε',
    or: 'ή',
    login: 'Σύνδεση',
    
    // Navigation
    menu: 'Μενού',
    profile: 'Προφίλ',
    myListings: 'Οι Αγγελίες μου',
    manageListings: 'Διαχειριστείτε τις αγγελίες σας',
    noListings: 'Δεν έχετε δημοσιεύσει αγγελίες ακόμα',
    publishedOn: 'Δημοσιεύτηκε στις',
    publishProperty: 'Δημοσίευση Ακινήτου',
    searchProperties: 'Αναζήτηση Ακινήτων',
    inquiries: 'Αιτήματα ενδιαφέροντος',
    approvedInquiries: 'Εγκεκριμένα Αιτήματα',
    approvedInquiry: 'Εγκεκριμένο Αίτημα',
    noApprovedInquiries: 'Δεν υπάρχουν εγκεκριμένα αιτήματα',
    viewInquiries: 'Προβολή Αιτημάτων',
    logout: 'Αποσύνδεση',
    showMenu: 'Εμφάνιση Μενού',
    calendar: 'Ημερολόγιο',
    day: 'Ημέρα',
    week: 'Εβδομάδα',
    month: 'Μήνας',
    today: 'Σήμερα',
    upcomingAppointments: 'Προσεχείς Ραντεβού',
    noBookings: 'Δεν υπάρχουν προγραμματισμένα ραντεβού',
    
    // Search
    whatAreYouLookingFor: 'Τι ψάχνετε;',
    rent: 'Ενοικίαση',
    buy: 'Αγορά',
    howDoYouWantToSearch: 'Πώς θέλετε να αναζητήσετε;',
    manualFilter: 'Χειροκίνητο Φίλτρο',
    aiSearch: 'AI Αναζήτηση',
    filterByFeatures: 'Φιλτράρισμα κατά Χαρακτηριστικά',
    back: 'Πίσω',
    city: 'Πόλη',
    country: 'Χώρα',
    address: 'Διεύθυνση',
    anyCity: 'Οποιαδήποτε πόλη',
    anyCountry: 'Οποιαδήποτε χώρα',
    cityArea: 'Περιοχή',
    selectCityArea: 'Επιλέξτε περιοχή',
    distances: 'Αποστάσεις',
    closestMetro: 'Κοντινότερο Μετρό',
    closestBus: 'Κοντινότερη Στάση Λεωφορείου',
    closestSchool: 'Κοντινότερο Σχολείο',
    closestHospital: 'Κοντινότερο Νοσοκομείο',
    closestPark: 'Κοντινότερο Πάρκο',
    closestUniversity: 'Κοντινότερο Πανεπιστήμιο',
    energyClass: 'Ενεργειακή Κλάση',
    distanceToUniversity: 'Απόσταση από Πανεπιστήμιο',
    placeholderDistance: 'km',
    vibe: 'Ατμόσφαιρα',
    safety: 'Ασφάλεια',
    minPrice: 'Ελάχιστη Τιμή',
    maxPrice: 'Μέγιστη Τιμή',
    minSize: 'Ελάχιστο Μέγεθος',
    maxSize: 'Μέγιστο Μέγεθος',
    heatingCategory: 'Κατηγορία Θέρμανσης',
    heatingAgent: 'Μέσο Θέρμανσης',
    parking: 'Στάθμευση',
    yes: 'Ναι',
    no: 'Όχι',
    available: 'Διαθέσιμο',
    notAvailable: 'Μη Διαθέσιμο',
    more: 'περισσότερα',
    with: 'Με',
    minBedrooms: 'Ελάχιστα Υπνοδωμάτια',
    maxBedrooms: 'Μέγιστα Υπνοδωμάτια',
    yearBuilt: 'Έτος Κατασκευής',
    any: 'Οποιοδήποτε',
    applyFilters: 'Εφαρμογή Φίλτρων',
    showFilters: 'Εμφάνιση Φίλτρων',
    filters: 'Φίλτρα',
    order: 'Ταξινόμηση',
    excludeInquired: 'Εξαίρεση Αιτημάτων',
    excludeApproved: 'Εξαίρεση Εγκεκριμένων',
    priceAscending: 'Τιμή Αύξουσα',
    priceDescending: 'Τιμή Φθίνουσα',
    sizeAscending: 'Μέγεθος Αύξον',
    sizeDescending: 'Μέγεθος Φθίνον',
    dateAscending: 'Ημερομηνία Δημοσίευσης Αύξουσα',
    dateDescending: 'Ημερομηνία Δημοσίευσης Φθίνουσα',
    searching: 'Αναζήτηση...',
    tellUsWhatYouNeed: 'Πείτε μας τι χρειάζεστε',
    aiSearchDescription: 'Περιγράψτε με λέξεις τι ψάχνετε και το AI θα βρει τα κατάλληλα ακίνητα για εσάς.',
    searchingWithAi: 'Αναζήτηση με AI...',
    useAIForAnotherSearch: 'Χρήση AI για νέα αναζήτηση',
    availableProperties: 'Διαθέσιμα Ακίνητα',
    listing: 'αγγελία',
    listings: 'αγγελίες',
    found: 'βρέθηκαν',
    noPropertiesFound: 'Δεν βρέθηκαν ακίνητα',
    noPropertiesFoundAi: 'Δεν βρέθηκαν ακίνητα με βάση την περιγραφή σας',
    newListing: 'Νέα Αγγελία',
    publishedBy: 'Δημοσιεύτηκε από',
    
    // Property Details
    returnToSearch: 'Επιστροφή στην Αναζήτηση',
    returnToListings: 'Επιστροφή στις Καταχωρήσεις',
    returnToApproved: 'Επιστροφή στις Εγκεκριμένες Καταχωρήσεις',
    returnToInquiries: 'Επιστροφή στις Ερωτήσεις',
    edit: 'Επεξεργασία',
    noPhotos: 'Δεν υπάρχουν φωτογραφίες',
    owner: 'Ιδιοκτήτης',
    user: 'Χρήστης',
    broker: 'Μεσιτικό',
    description: 'Περιγραφή',
    price: 'Τιμή',
    pricePerMonth: 'Τιμή ανά μήνα',
    sizeSqMeters: 'Μέγεθος (m²)',
    floor: 'Όροφος',
    bedrooms: 'Υπνοδωμάτια',
    bedroomsShort: 'υπν.',
    bathrooms: 'Μπάνια',
    bathroomsShort: 'μπάν.',
    yearRenovated: 'Έτος Ανακαίνισης',
    availableFrom: 'Διαθέσιμο από',
    perMonth: '/ μήνα',
    totalPrice: 'Συνολική Τιμή',
    close: 'Κλείσιμο',
    
    // Listing features
    aiDescription: 'AI Περιγραφή',
    fileUpload: 'Ανέβασμα Αρχείου',
    basicSearch: 'Βασική Αναζήτηση',
    select: 'Επιλογή',
    useAIDescription: 'Χρήση AI για δημιουργία περιγραφής',
    useAIDescriptionForAll: 'Χρήση AI για δημιουργία περιγραφών για όλα τα ακίνητα',
    aiDescriptionWillGenerate: 'Η AI θα δημιουργήσει την περιγραφή',
    cannotBeChanged: 'Δεν μπορεί να αλλάξει',
    ownerProfile: 'Προφίλ Ιδιοκτήτη',
    notProvided: 'Δεν δόθηκε',
    asOwner: 'Ως Ιδιοκτήτης',
    asUser: 'Ως Χρήστης',
    rating: 'αξιολόγηση',
    ratings: 'αξιολογήσεις',
    
    // Inquiries
    inquiryMade: 'Έχετε δηλώσει ενδιαφέρον',
    inquiryMadeBanner: 'ΕΧΕΤΕ ΔΗΛΩΣΕΙ ΕΝΔΙΑΦΕΡΟΝ', // Uppercase for banners (no accents)
    inquire: 'Δήλωση Ενδιαφέροντος',
    removeInquiry: 'Αφαίρεση Ενδιαφέροντος',
    approved: 'Εγκεκριμένο',
    approvedBanner: 'ΕΓΚΕΚΡΙΜΕΝΟ', // Uppercase for banners (no accents)
    finalized: 'Οριστικοποιημένο',
    waitingForFinalization: 'Αναμονή Οριστικοποίησης',
    dismissed: 'Απορριφθέν',
    dismissedBanner: 'ΑΠΟΡΡΙΦΘΕΝ', // Uppercase for banners (no accents)
    inquiryDate: 'Ημερομηνία Αίτησης',
    approvedOn: 'Εγκρίθηκε στις',
    contactInformation: 'Στοιχεία Επικοινωνίας',
    sendContactInfo: 'Αποστολή Στοιχείων Επικοινωνίας',
    calComUsername: 'Cal.com Όνομα Χρήστη',
    calComUsernameHint: 'Το όνομα χρήστη σας στο Cal.com (π.χ., "john-doe" για cal.com/john-doe)',
    bookAppointment: 'Κράτηση Ραντεβού',
    bookThroughCalCom: 'Κάντε κράτηση μέσω του Cal.com widget παραπάνω',
    createBookingManually: 'Δημιουργία Κράτησης Χειροκίνητα',
    createBooking: 'Δημιουργία Κράτησης',
    startTime: 'Ώρα Έναρξης',
    endTime: 'Ώρα Λήξης',
    date: 'Ημερομηνία',
    location: 'Τοποθεσία',
    status: 'Κατάσταση',
    bookingCreated: 'Η κράτηση δημιουργήθηκε επιτυχώς!',
    calComConnection: 'Σύνδεση Cal.com',
    connected: 'Συνδεδεμένο',
    notConnected: 'Μη συνδεδεμένο',
    afterApprovalSetAvailability: 'Μετά την έγκριση, θα μεταφερθείτε για να ορίσετε τη διαθεσιμότητά σας για αυτό το ακίνητο.',
    setAvailability: 'Ορισμός Διαθεσιμότητας',
    setAvailabilityDescription: 'Προσθέστε χρονικά διαστήματα όταν είστε διαθέσιμος για επισκέψεις ακινήτων. Οι χρήστες θα μπορούν να κλείσουν ραντεβού από αυτά τα διαστήματα.',
    addAvailabilitySlot: 'Προσθήκη Διαστήματος Διαθεσιμότητας',
    availabilitySlots: 'Διαστήματα Διαθεσιμότητας',
    saveAvailability: 'Αποθήκευση Διαθεσιμότητας',
    bookViewing: 'Κράτηση Επισκεπτήματος',
    selectAvailableSlot: 'Επιλέξτε ένα διαθέσιμο χρονικό διάστημα για να κλείσετε την επίσκεψή σας στο ακίνητο.',
    viewAvailableSlots: 'Προβολή Διαθέσιμων Διαστήματων',
    manageAvailability: 'Διαχείριση Διαθεσιμότητας',
    setAvailabilityForUsers: 'Ορίστε τη διαθεσιμότητά σας ώστε οι χρήστες να μπορούν να κλείσουν ραντεβού για επισκέψεις.',
    noAvailabilitySlots: 'Δεν υπάρχουν διαθέσιμα διαστήματα',
    waitingForOwnerToSetAvailability: 'Ο ιδιοκτήτης δεν έχει ορίσει ακόμα διαθεσιμότητα. Παρακαλώ ελέγξτε αργότερα.',
    booked: 'Κλεισμένο',
    startTimeMustBeBeforeEndTime: 'Η ώρα έναρξης πρέπει να είναι πριν την ώρα λήξης',
    fillAllFields: 'Παρακαλώ συμπληρώστε όλα τα πεδία',
    addAtLeastOneSlot: 'Παρακαλώ προσθέστε τουλάχιστον ένα διάστημα διαθεσιμότητας',
    availabilitySaved: 'Η διαθεσιμότητα αποθηκεύτηκε επιτυχώς!',
    approveAndAvailabilitySaved: 'Η αίτηση εγκρίθηκε και η διαθεσιμότητα αποθηκεύτηκε.',
    setAppointment: 'Ορισμός ραντεβού',
    appointmentScheduled: 'Ραντεβού προγραμματισμένο',
    bookingConfirmed: 'Η κράτηση επιβεβαιώθηκε! Μπορείτε να τη δείτε στο ημερολόγιό σας.',
    onlyUsersCanBook: 'Μόνο οι χρήστες μπορούν να κλείσουν ραντεβού επίσκεψης. Οι ιδιοκτήτες πρέπει να χρησιμοποιήσουν τη σελίδα ορισμού διαθεσιμότητας.',
    selectDateAndTime: 'Παρακαλώ επιλέξτε ημερομηνία και ώρα',
    selectTime: 'Επιλογή Ώρας',
    selectTimeSlot: 'Επιλέξτε χρονικό διάστημα',
    bookedSlots: 'Κλεισμένα διαστήματα',
    selectedDate: 'Επιλεγμένη Ημερομηνία',
    selectedTime: 'Επιλεγμένη Ώρα',
    booking: 'Κράτηση...',
    confirmBooking: 'Επιβεβαίωση Κράτησης',
    success: 'Επιτυχία',
    error: 'Σφάλμα',
    information: 'Πληροφορία',
    bookingDetails: 'Λεπτομέρειες Κράτησης',
    userInformation: 'Πληροφορίες Χρήστη',
    ownerInformation: 'Πληροφορίες Ιδιοκτήτη',
    time: 'Ώρα',
    reschedule: 'Επαναπρογραμματισμός',
    rescheduleBooking: 'Επαναπρογραμματισμός Κράτησης',
    currentBooking: 'Τρέχουσα Κράτηση',
    newBookingTime: 'Νέα Ώρα Κράτησης',
    rescheduling: 'Επαναπρογραμματισμός...',
    confirmReschedule: 'Επιβεβαίωση Επαναπρογραμματισμού',
    bookingRescheduled: 'Η κράτηση επαναπρογραμματίστηκε επιτυχώς!',
    cannotRescheduleLessThan24Hours: 'Οι κρατήσεις μπορούν να επαναπρογραμματιστούν μόνο πάνω από 24 ώρες πριν',
    alreadyHaveAppointment: 'Έχετε ήδη ένα ραντεβού σε αυτή την ώρα',
    ownerHasAppointment: 'Ο ιδιοκτήτης/μεσίτης έχει ήδη ένα ραντεβού σε αυτή την ώρα',
    cancelBooking: 'Ακύρωση Κράτησης',
    confirmCancelBooking: 'Είστε σίγουροι ότι θέλετε να ακυρώσετε αυτή την κράτηση; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.',
    cancelling: 'Ακύρωση...',
    noAvailableSlotsForThisDay: 'Δεν υπάρχουν διαθέσιμα διαστήματα για αυτή την ημέρα',
    scheduledBookings: 'Προγραμματισμένες Κρατήσεις',
    noScheduledBookings: 'Δεν υπάρχουν προγραμματισμένες κρατήσεις',
    scheduled: 'Προγραμματισμένο',
    sendAndApprove: 'Αποστολή και Έγκριση',
    hireContactPerson: 'Πρόσληψη Επικοινωνίας',
    hireContactPersonDescription: 'Προσλάβετε έναν επαγγελματία για να χειρίζεται τις επικοινωνίες',
    approve: 'Έγκριση',
    inquiry: 'Αίτημα',
    totalInquiries: '{count} αιτήματα',
    noInquiries: 'Δεν υπάρχουν αιτήματα',
    noInquiriesForListings: 'Δεν υπάρχουν αιτήματα για τις αγγελίες σας',
    noInquiriesForThisHome: 'Δεν υπάρχουν αιτήματα για αυτό το ακίνητο',
    viewMyListings: 'Προβολή Αγγελιών μου',
    allInquiriesProcessed: 'Όλα τα αιτήματα έχουν επεξεργαστεί',
    pendingApproval: 'Σε αναμονή έγκρισης',
    finalize: 'Οριστικοποίηση',
    finalizeRequestSent: 'Αίτημα οριστικοποίησης στάλθηκε',
    finalizeFailed: 'Αποτυχία οριστικοποίησης',
    awaitingFinalizeApproval: 'Σε αναμονή έγκρισης οριστικοποίησης',
    reject: 'Απόρριψη',
    confirmReject: 'Είστε σίγουροι ότι θέλετε να απορρίψετε αυτή την προσφορά; Το ακίνητο θα γίνει αόρατο για τον χρήστη.',
    confirmFinalize: 'Είστε σίγουροι ότι θέλετε να οριστικοποιήσετε αυτή τη συμφωνία; Θα σταλεί ειδοποίηση στον χρήστη για έγκριση.',
    rejectSent: 'Η απόρριψη στάλθηκε και ο χρήστης ειδοποιήθηκε',
    dealFinalized: 'Η συμφωνία οριστικοποιήθηκε',
    finalizeDeal: 'Οριστικοποίηση Συμφωνίας',
    finalizeDealDescription: 'Είστε σίγουροι ότι θέλετε να οριστικοποιήσετε αυτή τη συμφωνία;',
    approveFinalization: 'Επιβεβαίωση Οριστικοποίησης',
    finalizationRequestReceived: 'Λήφθηκε Αίτημα Οριστικοποίησης',
    confirmRejectFinalization: 'Είστε σίγουροι ότι θέλετε να απορρίψετε αυτή την οριστικοποίηση; Το ακίνητο θα αφαιρεθεί από τα αποτελέσματα αναζήτησής σας.',
    filterByStatus: 'Φίλτρο κατά Κατάσταση',
    statusApproved: 'Εγκεκριμένο',
    statusWaitingForSchedule: 'Αναμονή Προγραμματισμού',
    statusScheduled: 'Προγραμματισμένο',
    statusPreFinalization: 'Προ-Οριστικοποίηση',
    statusAwaitingFinalization: 'Αναμονή Οριστικοποίησης',
    houseOwnerRating: 'Αξιολόγηση Ιδιοκτήτη Ακινήτου',
    houseOwner: 'Ιδιοκτήτης Ακινήτου',
    ownerRating: 'Αξιολόγηση Ιδιοκτήτη',
    brokerOccupationLocked: 'Η Επάγγελμα ορίζεται αυτόματα για τους μεσίτες',
    dismissFinalization: 'Απόρριψη Οριστικοποίησης',
    dealDone: 'ΣΥΜΦΩΝΙΑ ΟΛΟΚΛΗΡΩΘΗΚΕ',
    propertyInformation: 'Πληροφορίες Ακινήτου',
    senderInformation: 'Πληροφορίες Αποστολέα',
    rateOwner: 'Αξιολόγηση Ιδιοκτήτη',
    rateUser: 'Αξιολόγηση Χρήστη',
    rateOwnerDescription: 'Αξιολογήστε τους ιδιοκτήτες με τους οποίους ολοκληρώσατε συμφωνίες',
    rateUserDescription: 'Αξιολογήστε τους χρήστες με τους οποίους ολοκληρώσατε συμφωνίες',
    rate: 'Αξιολόγηση',
    completed: 'Ολοκληρώθηκε',
    noFinalizedInquiries: 'Δεν υπάρχουν ολοκληρωμένες συμφωνίες προς αξιολόγηση',
    rated: 'Αξιολογήθηκε',
    rateNow: 'Αξιολόγηση Τώρα',
    rateAgain: 'Αξιολόγηση Ξανά',
    comment: 'Σχόλιο',
    commentPlaceholder: 'Γράψτε ένα σχόλιο (προαιρετικό)',
    submitRating: 'Υποβολή Αξιολόγησης',
    submitting: 'Υποβολή...',
    ratingFailed: 'Αποτυχία υποβολής αξιολόγησης',
    ratingSubmitted: 'Η αξιολόγηση υποβλήθηκε επιτυχώς',
    property: 'Ακίνητο',
    notRatedYet: 'Δεν έχει αξιολογηθεί ακόμα',
    appeal: 'Έφεση',
    save: 'Αποθήκευση',
    saving: 'Αποθήκευση...',
    cancel: 'Ακύρωση',
    updated: 'Ενημερώθηκε',
    houseRatings: 'Αξιολογήσεις Ακινήτου',
    noRatingsForThisHouse: 'Δεν υπάρχουν αξιολογήσεις για αυτό το ακίνητο',
    viewHouseRatings: 'Προβολή Αξιολογήσεων Ακινήτου',
    timeToRateAgain: 'Ώρα για Νέα Αξιολόγηση',
    rateAgainDescription: 'Μπορείτε τώρα να αξιολογήσετε ξανά για αυτό το ακίνητο',
    appealFeatureComingSoon: 'Η λειτουργία έφεσης θα είναι διαθέσιμη σύντομα',
    
    // Notifications
    notifications: 'Ειδοποιήσεις',
    noNotifications: 'Δεν υπάρχουν ειδοποιήσεις',
    notificationInquiry: '{userName} έχει κάνει αίτημα για {propertyTitle}',
    notificationInquiryGeneric: 'Νέο αίτημα για {propertyTitle}',
    notificationApproved: 'Το αίτημά σας για {propertyTitle} έχει εγκριθεί',
    notificationDismissed: 'Το αίτημά σας για {propertyTitle} έχει απορριφθεί',
    notificationRejected: 'Ο ιδιοκτήτης απέρριψε την προσφορά σας για {propertyTitle}. Το ακίνητο δεν είναι πλέον διαθέσιμο.',
    notificationFinalize: '{senderName} θέλει να οριστικοποιήσει τη συμφωνία για {propertyTitle}',
    notificationFinalizeGeneric: 'Κάποιος θέλει να οριστικοποιήσει τη συμφωνία για {propertyTitle}',
    notificationFinalizeRequest: 'Αίτημα οριστικοποίησης για {propertyTitle}',
    notificationRate: 'Παρακαλούμε αξιολογήστε τον {userName} για {propertyTitle}',
    notificationRateOwner: 'Παρακαλούμε αξιολογήστε τον ιδιοκτήτη για {propertyTitle}',
    notificationRateUser: 'Παρακαλούμε αξιολογήστε τον χρήστη για {propertyTitle}',
    notificationBookingReminder: 'Η κράτησή σας "{title}" είναι προγραμματισμένη για αύριο στις {time}',
    notificationOwnerBookingReminder: 'Έχετε {count} ραντεβού{plural} προγραμματισμένα για αύριο',
    notificationAvailabilitySet: 'Ο ιδιοκτήτης έχει ορίσει διαθεσιμότητα για {propertyTitle}. Κάντε κλικ για να επιλέξετε ώρα επισκεπτήματος.',
    notificationBookingCreated: 'Ο χρήστης {userName} έχει κλείσει ραντεβού για το {propertyTitle}',
    notificationBookingCreatedGeneric: 'Ένας χρήστης έχει κλείσει ραντεβού για το {propertyTitle}',
    yourProperty: 'το ακίνητό σας',
    theProperty: 'το ακίνητο',
    aUser: 'Ένας χρήστης',
    someone: 'Κάποιος',
    
    // Profile
    name: 'Όνομα',
    email: 'Email',
    phone: 'Τηλέφωνο',
    timeSchedule: 'Πρόγραμμα Διαθεσιμότητας',
    enterPhone: 'Εισάγετε τηλέφωνο',
    enterTimeSchedule: 'Εισάγετε πρόγραμμα διαθεσιμότητας',
    role: 'Ρόλος',
    ownerAndUser: 'Ιδιοκτήτης & Χρήστης',
    memberSince: 'Μέλος από',
    editProfile: 'Επεξεργασία Προφίλ',
    editProfileTitle: 'Επεξεργασία Προφίλ',
    userNameOrName: 'Όνομα ή Όνομα Χρήστη',
    userName: 'Όνομα Χρήστη',
    age: 'Ηλικία',
    dateOfBirth: 'Ημερομηνία Γέννησης',
    yourDateOfBirth: 'Η ημερομηνία γέννησής σας',
    occupation: 'Επάγγελμα',
    optional: 'Προαιρετικό',
    selectOccupation: 'Επιλέξτε Επάγγελμα',
    completeYourProfile: 'Ολοκληρώστε το Προφίλ σας',
    profileIncomplete: 'Το προφίλ σας δεν είναι πλήρες. Συμπληρώστε τις πληροφορίες σας για καλύτερη εμπειρία.',
    missingInformation: 'Λείπουν',
    notSet: 'Δεν έχει οριστεί',
    userSearchProperties: 'Χρήστης - Αναζήτηση Ακινήτων',
    ownerPublishProperties: 'Ιδιοκτήτης - Δημοσίευση Ακινήτων',
    ownerAndUserFull: 'Ιδιοκτήτης & Χρήστης - Πλήρης Πρόσβαση',
    saveChanges: 'Αποθήκευση Αλλαγών',
    profileUpdateFailed: 'Αποτυχία ενημέρωσης προφίλ',
    
    // Create/Edit Listing
    createListing: 'Δημοσίευση Αγγελίας',
    createListingFailed: 'Αποτυχία δημιουργίας αγγελίας',
    editListing: 'Επεξεργασία Αγγελίας',
    listingDetails: 'Συμπληρώστε τις λεπτομέρειες της αγγελίας σας',
    listingType: 'Τύπος Αγγελίας',
    title: 'Τίτλος',
    uploadPhotos: 'Ανέβασμα Φωτογραφιών',
    upload: 'Ανέβασμα',
    sell: 'Πώληση',
    street: 'Οδός',
    updatingListing: 'Ενημέρωση...',
    updateListing: 'Ενημέρωση Αγγελίας',
    delete: 'Διαγραφή',
    confirmDelete: 'Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την αγγελία;',
    deleteFailed: 'Αποτυχία διαγραφής αγγελίας',
    updateListingFailed: 'Αποτυχία ενημέρωσης αγγελίας',
    
    // Common
    loading: 'Φόρτωση...',
    refresh: 'Ανανέωση',
    somethingWentWrong: 'Κάτι πήγε στραβά',
    viewAll: 'Προβολή όλων',
    add: 'Προσθήκη',
    remove: 'Αφαίρεση',
    dismiss: 'Απόρριψη',
    confirm: 'Επιβεβαίωση',
    goBack: 'Πίσω',
    allRatings: 'Όλες οι Αξιολογήσεις',
    noRatingsYet: 'Δεν υπάρχουν αξιολογήσεις ακόμα',
    invalidParameters: 'Μη έγκυρες παράμετροι',
    dangerZone: 'Ζώνη Κινδύνου',
    deleteAccount: 'Διαγραφή Λογαριασμού',
    deleteAccountDescription: 'Η διαγραφή του λογαριασμού σας είναι μόνιμη και δεν μπορεί να αναιρεθεί. Όλα τα δεδομένα σας θα διαγραφούν.',
    deleteAccountConfirm: 'Είστε σίγουροι ότι θέλετε να διαγράψετε τον λογαριασμό σας; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.',
    confirmDeleteAccount: 'Επιβεβαίωση Διαγραφής',
    deleting: 'Διαγραφή...',
    accountDeletionFailed: 'Αποτυχία διαγραφής λογαριασμού',
    
    // Occupations
    Employed: 'Εργαζόμενος',
    Student: 'Φοιτητής',
    Retired: 'Συνταξιούχος',
    Unemployed: 'Άνεργος',
    Other: 'Άλλο',
    
    // Placeholders
    placeholderName: 'Το όνομά σας ή όνομα χρήστη',
    placeholderTitle: 'Ζεστό διαμέρισμα 2 υπνοδωματίων',
    placeholderDescription: 'Περιγράψτε το ακίνητο, τη γειτονιά, τις ανέσεις, κ.λπ.',
    placeholderStreet: 'π.χ., Οδός Πατησίων 123',
    placeholderCity: 'Αθήνα',
    placeholderCountry: 'Ελλάδα',
    placeholderSize: 'π.χ., 85',
    placeholderBedrooms: 'π.χ., 3',
    placeholderYearBuilt: 'π.χ., 2010',
    placeholderYearRenovated: 'π.χ., 2020',
    
    // Areas (common Greek areas)
    'Nea Smirni': 'Νέα Σμύρνη',
    'Kallithea': 'Καλλιθέα',
    'Palaio Faliro': 'Παλαιό Φάληρο',
    'Alimos': 'Άλιμος',
    'Glyfada': 'Γλυφάδα',
    'Voula': 'Βούλα',
    'Vouliagmeni': 'Βουλιαγμένη',
    
    // Heating
    central: 'Κεντρική',
    autonomous: 'Αυτόνομη',
    oil: 'Πετρέλαιο',
    'natural gas': 'Φυσικό Αέριο',
    electricity: 'Ηλεκτρική',
    other: 'Άλλο',
    
    // Vibe values
    'family-friendly': 'Οικογενειακό',
    'Family-friendly': 'Οικογενειακό',
    'vibrant': 'Ζωντανό',
    'Vibrant': 'Ζωντανό',
    'quiet': 'Ήσυχο',
    'Quiet': 'Ήσυχο',
    'upscale': 'Αριστοκρατικό',
    'Upscale': 'Αριστοκρατικό',
    'touristic': 'Τουριστικό',
    'Touristic': 'Τουριστικό',
    'historic': 'Ιστορικό',
    'Historic': 'Ιστορικό',
    'urban': 'Αστικό',
    'Urban': 'Αστικό',
    'student': 'Φοιτητικό',
    'Upscale, vibrant': 'Αριστοκρατικό, Ζωντανό',
    'Touristic, historic': 'Τουριστικό, Ιστορικό',
  },
  en: {
    // App
    appTitle: 'Welcome',
    appDescription: 'Find your ideal home for rent or purchase',
    signUp: 'Sign Up',
    signIn: 'Sign In',
    welcome: 'Welcome',
    or: 'or',
    login: 'Login',
    
    // Navigation
    menu: 'Menu',
    profile: 'Profile',
    myListings: 'My Listings',
    manageListings: 'Manage your listings',
    noListings: 'You have not published any listings yet',
    publishedOn: 'Published on',
    publishProperty: 'Publish Property',
    searchProperties: 'Search Properties',
    inquiries: 'Inquiries',
    approvedInquiries: 'Approved Inquiries',
    approvedInquiry: 'Approved Inquiry',
    noApprovedInquiries: 'No approved inquiries',
    viewInquiries: 'View Inquiries',
    logout: 'Logout',
    showMenu: 'Show Menu',
    calendar: 'Calendar',
    day: 'Day',
    week: 'Week',
    month: 'Month',
    today: 'Today',
    upcomingAppointments: 'Upcoming Appointments',
    noBookings: 'No scheduled appointments',
    
    // Search
    whatAreYouLookingFor: 'What are you looking for?',
    rent: 'Rent',
    buy: 'Buy',
    howDoYouWantToSearch: 'How do you want to search?',
    manualFilter: 'Manual Filter',
    aiSearch: 'AI Search',
    filterByFeatures: 'Filter by Features',
    back: 'Back',
    city: 'City',
    country: 'Country',
    address: 'Address',
    street: 'Street',
    anyCity: 'Any city',
    anyCountry: 'Any country',
    cityArea: 'Area',
    selectCityArea: 'Select area',
    distances: 'Distances',
    closestMetro: 'Closest Metro',
    closestBus: 'Closest Bus Stop',
    closestSchool: 'Closest School',
    closestHospital: 'Closest Hospital',
    closestPark: 'Closest Park',
    closestUniversity: 'Closest University',
    energyClass: 'Energy Class',
    distanceToUniversity: 'Distance to University',
    placeholderDistance: 'km',
    vibe: 'Vibe',
    safety: 'Safety',
    minPrice: 'Min Price',
    maxPrice: 'Max Price',
    minSize: 'Min Size',
    maxSize: 'Max Size',
    heatingCategory: 'Heating Category',
    heatingAgent: 'Heating Agent',
    parking: 'Parking',
    yes: 'Yes',
    no: 'No',
    available: 'Available',
    notAvailable: 'Not Available',
    more: 'more',
    with: 'With',
    minBedrooms: 'Min Bedrooms',
    maxBedrooms: 'Max Bedrooms',
    yearBuilt: 'Year Built',
    any: 'Any',
    applyFilters: 'Apply Filters',
    showFilters: 'Show Filters',
    filters: 'Filters',
    order: 'Order',
    excludeInquired: 'Exclude Inquired Listings',
    excludeApproved: 'Exclude Approved Listings',
    priceAscending: 'Price Ascending',
    priceDescending: 'Price Descending',
    sizeAscending: 'Size Ascending',
    sizeDescending: 'Size Descending',
    dateAscending: 'Date of Publish Ascending',
    dateDescending: 'Date of Publish Descending',
    searching: 'Searching...',
    tellUsWhatYouNeed: 'Tell us what you need',
    aiSearchDescription: 'Describe in words what you are looking for and AI will find the right properties for you.',
    searchingWithAi: 'Searching with AI...',
    useAIForAnotherSearch: 'Use AI for another search',
    availableProperties: 'Available Properties',
    listing: 'listing',
    listings: 'listings',
    found: 'found',
    noPropertiesFound: 'No properties found',
    noPropertiesFoundAi: 'No properties found based on your description',
    newListing: 'New Listing',
    publishedBy: 'Published by',
    
    // Property Details
    returnToSearch: 'Return to Search',
    returnToListings: 'Return to Listings',
    returnToApproved: 'Return to Approved Listings',
    returnToInquiries: 'Return to Inquiries',
    edit: 'Edit',
    noPhotos: 'No photos',
    owner: 'Owner',
    user: 'User',
    broker: 'Broker',
    description: 'Description',
    price: 'Price',
    pricePerMonth: 'Price per month',
    sizeSqMeters: 'Size (m²)',
    floor: 'Floor',
    bedrooms: 'Bedrooms',
    bedroomsShort: 'bed',
    bathrooms: 'Bathrooms',
    bathroomsShort: 'bath',
    yearRenovated: 'Year Renovated',
    availableFrom: 'Available From',
    perMonth: '/ month',
    totalPrice: 'Total Price',
    close: 'Close',
    
    // Listing features
    aiDescription: 'AI Description',
    fileUpload: 'File Upload',
    basicSearch: 'Basic Search',
    select: 'Select',
    useAIDescription: 'Use AI to generate description',
    useAIDescriptionForAll: 'Use AI to generate descriptions for all homes',
    aiDescriptionWillGenerate: 'AI will generate description',
    notSet: 'Not set',
    cannotBeChanged: 'Cannot be changed',
    
    ownerProfile: 'Owner Profile',
    notProvided: 'Not provided',
    asOwner: 'As Owner',
    asUser: 'As User',
    rating: 'rating',
    ratings: 'ratings',
    houseRatings: 'House Ratings',
    
    // Inquiries
    inquiryMade: 'You have inquired',
    inquiryMadeBanner: 'YOU HAVE INQUIRED', // Uppercase for banners
    finalized: 'Finalized',
    waitingForFinalization: 'Waiting for Finalization',
    inquire: 'Inquire',
    removeInquiry: 'Remove Inquiry',
    approved: 'Approved',
    approvedBanner: 'APPROVED', // Uppercase for banners
    dismissed: 'Dismissed',
    dismissedBanner: 'DISMISSED', // Uppercase for banners
    inquiryDate: 'Inquiry Date',
    approvedOn: 'Approved on',
    contactInformation: 'Contact Information',
    sendContactInfo: 'Send Contact Information',
    calComUsername: 'Cal.com Username',
    calComUsernameHint: 'Your Cal.com username (e.g., "john-doe" for cal.com/john-doe)',
    bookAppointment: 'Book Appointment',
    bookThroughCalCom: 'Book through Cal.com widget above',
    createBookingManually: 'Create Booking Manually',
    createBooking: 'Create Booking',
    startTime: 'Start Time',
    endTime: 'End Time',
    date: 'Date',
    location: 'Location',
    status: 'Status',
    bookingCreated: 'Booking created successfully!',
    calComConnection: 'Cal.com Connection',
    connected: 'Connected',
    notConnected: 'Not connected',
    afterApprovalSetAvailability: 'After approval, you will be redirected to set your availability for this property.',
    setAvailability: 'Set Availability',
    setAvailabilityDescription: 'Add time slots when you are available for property viewings. Users will be able to book from these slots.',
    addAvailabilitySlot: 'Add Availability Slot',
    availabilitySlots: 'Availability Slots',
    saveAvailability: 'Save Availability',
    bookViewing: 'Book Viewing',
    selectAvailableSlot: 'Select an available time slot to book your property viewing.',
    viewAvailableSlots: 'View Available Slots',
    manageAvailability: 'Manage Availability',
    setAvailabilityForUsers: 'Set your availability so users can book viewing appointments.',
    noAvailabilitySlots: 'No availability slots available',
    waitingForOwnerToSetAvailability: 'The owner hasn\'t set availability yet. Please check back later.',
    booked: 'Booked',
    startTimeMustBeBeforeEndTime: 'Start time must be before end time',
    fillAllFields: 'Please fill all fields',
    addAtLeastOneSlot: 'Please add at least one availability slot',
    availabilitySaved: 'Availability saved successfully!',
    approveAndAvailabilitySaved: 'Inquiry approved and availability saved.',
    setAppointment: 'Set appointment',
    appointmentScheduled: 'Appointment scheduled',
    bookingConfirmed: 'Booking confirmed! You can view it in your calendar.',
    onlyUsersCanBook: 'Only users can book viewing appointments. Owners should use the set availability page.',
    selectDateAndTime: 'Please select both date and time',
    selectTime: 'Select Time',
    selectTimeSlot: 'Select a time slot',
    bookedSlots: 'Booked slots',
    selectedDate: 'Selected Date',
    selectedTime: 'Selected Time',
    booking: 'Booking...',
    confirmBooking: 'Confirm Booking',
    success: 'Success',
    error: 'Error',
    information: 'Information',
    bookingDetails: 'Booking Details',
    userInformation: 'User Information',
    ownerInformation: 'Owner Information',
    time: 'Time',
    reschedule: 'Reschedule',
    rescheduleBooking: 'Reschedule Booking',
    currentBooking: 'Current Booking',
    newBookingTime: 'New Booking Time',
    rescheduling: 'Rescheduling...',
    confirmReschedule: 'Confirm Reschedule',
    bookingRescheduled: 'Booking rescheduled successfully!',
    cannotRescheduleLessThan24Hours: 'Bookings can only be rescheduled more than 24 hours in advance',
    alreadyHaveAppointment: 'You already have an appointment at this time',
    ownerHasAppointment: 'The owner/broker already has an appointment at this time',
    cancelBooking: 'Cancel Booking',
    noAvailableSlotsForThisDay: 'No available slots for this day',
    scheduledBookings: 'Scheduled Bookings',
    noScheduledBookings: 'No scheduled bookings',
    scheduled: 'Scheduled',
    confirmCancelBooking: 'Are you sure you want to cancel this booking? This action cannot be undone.',
    cancelling: 'Cancelling...',
    sendAndApprove: 'Send and Approve',
    hireContactPerson: 'Hire Contact Person',
    hireContactPersonDescription: 'Hire a professional to handle communications',
    approve: 'Approve',
    inquiry: 'Inquiry',
    totalInquiries: '{count} inquiries',
    noInquiries: 'No inquiries',
    noInquiriesForListings: 'No inquiries for your listings',
    noInquiriesForThisHome: 'No inquiries for this property',
    viewMyListings: 'View My Listings',
    allInquiriesProcessed: 'All inquiries have been processed',
    pendingApproval: 'Pending approval',
    finalize: 'Finalize',
    finalizeRequestSent: 'Finalization request sent',
    finalizeFailed: 'Finalization failed',
    awaitingFinalizeApproval: 'Awaiting Finalize Approval',
    dealFinalized: 'Deal Finalized',
    finalizeDeal: 'Finalize Deal',
    finalizeDealDescription: 'Are you sure you want to finalize this deal?',
    approveFinalization: 'Approve Finalization',
    finalizationRequestReceived: 'Finalization Request Received',
    confirmRejectFinalization: 'Are you sure you want to reject this finalization? The property will be removed from your search results.',
    dismissFinalization: 'Dismiss Finalization',
    dealDone: 'DEAL DONE',
    propertyInformation: 'Property Information',
    senderInformation: 'Sender Information',
    rateOwner: 'Rate Owner',
    rateUser: 'Rate User',
    rateOwnerDescription: 'Rate owners you have finalized deals with',
    rateUserDescription: 'Rate users you have finalized deals with',
    noFinalizedInquiries: 'No finalized deals to rate',
    rated: 'Rated',
    rateNow: 'Rate Now',
    comment: 'Comment',
    commentPlaceholder: 'Write a comment (optional)',
    submitRating: 'Submit Rating',
    submitting: 'Submitting...',
    ratingFailed: 'Failed to submit rating',
    ratingSubmitted: 'Rating submitted successfully',
    property: 'Property',
    notRatedYet: 'Not rated yet',
    
    // Notifications
    notifications: 'Notifications',
    noNotifications: 'No notifications',
    notificationInquiry: '{userName} has inquired for {propertyTitle}',
    notificationInquiryGeneric: 'New inquiry for {propertyTitle}',
    notificationApproved: 'Your inquiry for {propertyTitle} has been approved',
    notificationDismissed: 'Your inquiry for {propertyTitle} has been dismissed',
    notificationRejected: 'The owner rejected your offer for {propertyTitle}. The property is no longer available.',
    notificationFinalize: '{senderName} wants to finalize the deal for {propertyTitle}',
    notificationFinalizeGeneric: 'Someone wants to finalize the deal for {propertyTitle}',
    notificationFinalizeRequest: 'Finalization request for {propertyTitle}',
    notificationRate: 'Please rate {userName} for {propertyTitle}',
    notificationRateOwner: 'Please rate the owner for {propertyTitle}',
    notificationRateUser: 'Please rate the user for {propertyTitle}',
    notificationBookingReminder: 'Your booking "{title}" is scheduled for tomorrow at {time}',
    notificationOwnerBookingReminder: 'You have {count} meeting{plural} scheduled for tomorrow',
    notificationAvailabilitySet: 'The owner has set availability for {propertyTitle}. Click to select a viewing time.',
    notificationBookingCreated: 'User {userName} has booked an appointment for {propertyTitle}',
    notificationBookingCreatedGeneric: 'A user has booked an appointment for {propertyTitle}',
    yourProperty: 'your property',
    theProperty: 'the property',
    aUser: 'A user',
    someone: 'Someone',
    
    // Profile
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    timeSchedule: 'Time Schedule',
    enterPhone: 'Enter phone',
    enterTimeSchedule: 'Enter time schedule',
    role: 'Role',
    ownerAndUser: 'Owner & User',
    memberSince: 'Member since',
    editProfile: 'Edit Profile',
    editProfileTitle: 'Edit Profile',
    cancel: 'Cancel',
    userNameOrName: 'Name or Username',
    userName: 'Username',
    age: 'Age',
    dateOfBirth: 'Date of Birth',
    yourDateOfBirth: 'Your date of birth',
    occupation: 'Occupation',
    optional: 'Optional',
    selectOccupation: 'Select Occupation',
    completeYourProfile: 'Complete Your Profile',
    profileIncomplete: 'Your profile is incomplete. Fill in your information for a better experience.',
    missingInformation: 'Missing',
    userSearchProperties: 'User - Search Properties',
    ownerPublishProperties: 'Owner - Publish Properties',
    ownerAndUserFull: 'Owner & User - Full Access',
    saving: 'Saving...',
    saveChanges: 'Save Changes',
    profileUpdateFailed: 'Failed to update profile',
    
    // Create/Edit Listing
    createListing: 'Publish Listing',
    createListingFailed: 'Failed to create listing',
    editListing: 'Edit Listing',
    listingDetails: 'Fill in your listing details',
    listingType: 'Listing Type',
    title: 'Title',
    uploadPhotos: 'Upload Photos',
    upload: 'Upload',
    sell: 'Sell',
    updatingListing: 'Updating...',
    updateListing: 'Update Listing',
    delete: 'Delete',
    confirmDelete: 'Are you sure you want to delete this listing?',
    deleteFailed: 'Failed to delete listing',
    updateListingFailed: 'Failed to update listing',
    
    // Common
    loading: 'Loading...',
    refresh: 'Refresh',
    somethingWentWrong: 'Something went wrong',
    viewAll: 'View all',
    add: 'Add',
    remove: 'Remove',
    dismiss: 'Dismiss',
    confirm: 'Confirm',
    goBack: 'Go Back',
    allRatings: 'All Ratings',
    noRatingsYet: 'No ratings yet',
    invalidParameters: 'Invalid parameters',
    dangerZone: 'Danger Zone',
    deleteAccount: 'Delete Account',
    deleteAccountDescription: 'Deleting your account is permanent and cannot be undone. All your data will be deleted.',
    deleteAccountConfirm: 'Are you sure you want to delete your account? This action cannot be undone.',
    confirmDeleteAccount: 'Confirm Delete',
    deleting: 'Deleting...',
    accountDeletionFailed: 'Account deletion failed',
    
    // Occupations
    Employed: 'Employed',
    Student: 'Student',
    Retired: 'Retired',
    Unemployed: 'Unemployed',
    Other: 'Other',
    
    // Placeholders
    placeholderName: 'Your name or username',
    placeholderTitle: 'Cozy 2-bedroom apartment',
    placeholderDescription: 'Describe the property, neighborhood, amenities, etc.',
    placeholderStreet: 'e.g., Main Street 123',
    placeholderCity: 'Athens',
    placeholderCountry: 'Greece',
    placeholderSize: 'e.g., 85',
    placeholderBedrooms: 'e.g., 3',
    placeholderYearBuilt: 'e.g., 2010',
    placeholderYearRenovated: 'e.g., 2020',
    
    // Areas (keep same for English)
    'Nea Smirni': 'Nea Smirni',
    'Kallithea': 'Kallithea',
    'Palaio Faliro': 'Palaio Faliro',
    'Alimos': 'Alimos',
    'Glyfada': 'Glyfada',
    'Voula': 'Voula',
    'Vouliagmeni': 'Vouliagmeni',
    
    // Heating
    central: 'Central',
    autonomous: 'Autonomous',
    oil: 'Oil',
    'natural gas': 'Natural Gas',
    electricity: 'Electricity',
    other: 'Other',
    
    // Vibe values
    'family-friendly': 'Family-friendly',
    'Family-friendly': 'Family-friendly',
    'vibrant': 'Vibrant',
    'Vibrant': 'Vibrant',
    'quiet': 'Quiet',
    'Quiet': 'Quiet',
    'upscale': 'Upscale',
    'Upscale': 'Upscale',
    'touristic': 'Touristic',
    'Touristic': 'Touristic',
    'historic': 'Historic',
    'Historic': 'Historic',
    'urban': 'Urban',
    'Urban': 'Urban',
    'student': 'Student',
    'Upscale, vibrant': 'Upscale, vibrant',
    'Touristic, historic': 'Touristic, historic',
  },
} as const

export type TranslationKey = keyof typeof translations.el

export function getTranslation(language: Language, key: TranslationKey): string {
  const dict = translations[language] as Record<string, string>
  const fallback = translations.el as Record<string, string>
  return dict[key as string] ?? fallback[key as string] ?? String(key)
}

function translateSingleValue(language: Language, value: string): string {
  if (!value) return ''
  
  // Try exact match first
  const dict = translations[language] as Record<string, string>
  const fallback = translations.el as Record<string, string>

  let key = value.trim() as string
  if (dict[key]) return dict[key]
  if (fallback[key]) return fallback[key]
  
  // Try case-insensitive match for vibe values (common values that might have different casing)
  const trimmed = value.trim()
  const lowerValue = trimmed.toLowerCase()
  const capitalizedValue = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
  
  // Try lowercase version
  key = lowerValue
  if (dict[key]) return dict[key]
  if (fallback[key]) return fallback[key]
  
  // Try capitalized version
  key = capitalizedValue
  if (dict[key]) return dict[key]
  if (fallback[key]) return fallback[key]
  
  return trimmed
}

export function translateValue(language: Language, value: string | null | undefined): string {
  if (!value) return ''
  
  // Handle comma-separated values (e.g., "Urban,Student" or "Urban, Student")
  if (value.includes(',')) {
    return value
      .split(',')
      .map(part => translateSingleValue(language, part))
      .join(', ')
  }
  
  // Single value
  return translateSingleValue(language, value)
}

export function reverseTranslateValue(translatedValue: string | null | undefined): string {
  if (!translatedValue) return ''
  
  // Search through both language translations to find the key
  for (const lang of ['el', 'en'] as Language[]) {
    const langTranslations = translations[lang]
    for (const [key, value] of Object.entries(langTranslations)) {
      if (value === translatedValue) {
        return key
      }
    }
  }
  
  // If not found, return the original value (might already be a key)
  return translatedValue
}

/**
 * Convert a value to English (reverse translate from Greek to English key)
 * This ensures values are stored in English in the database
 */
export function toEnglishValue(value: string | null | undefined): string | null {
  if (!value || value.trim() === '') return null
  
  const trimmed = value.trim()
  
  // First check if it's already an English key (exists in English translations)
  if (translations.en[trimmed as keyof typeof translations.en]) {
    return trimmed
  }
  
  // Check if it's a Greek translation - find the English key
  for (const [key, greekValue] of Object.entries(translations.el)) {
    // Case-insensitive comparison
    if (greekValue.toLowerCase() === trimmed.toLowerCase() || 
        greekValue === trimmed) {
      // Return the key (which is the English value)
      return key
    }
  }
  
  // Try case-insensitive match for common values
  const lowerValue = trimmed.toLowerCase()
  const capitalizedValue = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
  
  // Check lowercase version
  for (const [key, greekValue] of Object.entries(translations.el)) {
    if (greekValue.toLowerCase() === lowerValue) {
      return key
    }
  }
  
  // Check capitalized version
  for (const [key, greekValue] of Object.entries(translations.el)) {
    if (greekValue.toLowerCase() === capitalizedValue.toLowerCase()) {
      return key
    }
  }
  
  // If not found in translations, return as-is (might be a new value or already in English)
  return trimmed
}

/**
 * Translate a role name to the selected language
 */
export function translateRole(language: Language, role: string): string {
  const normalizedRole = role.toLowerCase()
  
  // Map role values to translation keys
  const roleMap: Record<string, keyof typeof translations.en> = {
    'owner': 'owner',
    'user': 'user',
    'broker': 'broker',
    'both': 'ownerAndUser',
  }
  
  const translationKey = roleMap[normalizedRole]
  if (translationKey) {
    return getTranslation(language, translationKey)
  }
  
  // If role not found, return as-is
  return role
}
