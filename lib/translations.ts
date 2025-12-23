export type Language = 'el' | 'en'

export const translations = {
  el: {
    // Common
    loading: 'Φόρτωση...',
    back: 'Πίσω',
    edit: 'Επεξεργασία',
    save: 'Αποθήκευση',
    cancel: 'Ακύρωση',
    delete: 'Διαγραφή',
    upload: 'Ανέβασμα',
    photos: 'Φωτογραφίες',
    noPhotos: 'Δεν υπάρχουν φωτογραφίες',
    
    // Home Page
    appTitle: 'House Rent',
    appDescription: 'Βρείτε το ιδανικό σας ενοίκιο ή δημοσιεύστε την ιδιοκτησία σας',
    signUp: 'Εγγραφή',
    signIn: 'Σύνδεση',
    
    // Navigation
    returnToSearch: 'Επιστροφή στην Αναζήτηση',
    
    // Listing Form
    createListing: 'Δημιουργία Αγγελίας Ακινήτου',
    editListing: 'Επεξεργασία Αγγελίας Ακινήτου',
    listingDetails: 'Συμπληρώστε τις λεπτομέρειες του ακινήτου που θέλετε να δημοσιεύσετε.',
    updateListing: 'Ενημέρωση Αγγελίας',
    updatingListing: 'Ενημέρωση...',
    updateListingFailed: 'Η ενημέρωση της αγγελίας απέτυχε',
    title: 'Τίτλος',
    description: 'Περιγραφή',
    listingType: 'Τύπος Αγγελίας',
    rent: 'Ενοικίαση',
    sell: 'Πώληση',
    buy: 'Αγορά',
    street: 'Οδός',
    city: 'Πόλη',
    country: 'Χώρα',
    pricePerMonth: 'Τιμή ανά μήνα (€)',
    bedrooms: 'Υπνοδωμάτια',
    bathrooms: 'Μπάνια',
    floor: 'Όροφος',
    heating: 'Τύπος Θέρμανσης',
    sizeSqMeters: 'Μέγεθος (m²)',
    yearBuilt: 'Έτος Κατασκευής',
    yearRenovated: 'Έτος Ανακαίνισης',
    availableFrom: 'Διαθέσιμο από',
    uploadPhotos: 'Ανέβασμα Φωτογραφιών',
    optional: 'προαιρετικό',
    
    // Detail Page
    price: 'Τιμή',
    perMonth: 'ανά μήνα',
    totalPrice: 'συνολική τιμή',
    ownerProfile: 'Προφίλ Ιδιοκτήτη',
    name: 'Όνομα',
    email: 'Email',
    memberSince: 'Μέλος από',
    notProvided: 'Δεν δόθηκε',
    
    // My Listings
    myListings: 'Οι Αγγελίες μου',
    manageListings: 'Διαχειριστείτε όλες τις αγγελίες ακινήτων σας',
    newListing: 'Νέα Αγγελία',
    noListings: 'Δεν έχετε δημοσιεύσει ακόμα καμία αγγελία.',
    publishedOn: 'Δημοσιεύτηκε στις',
    
    // Errors
    somethingWentWrong: 'Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά.',
    createListingFailed: 'Η δημιουργία της αγγελίας απέτυχε',
    
    // Search Page
    whatAreYouLookingFor: 'Τι αναζητάτε;',
    howDoYouWantToSearch: 'Πώς θέλετε να αναζητήσετε;',
    back: 'Πίσω',
    manualFilter: 'Χειροκίνητο Φίλτρο',
    aiSearch: 'AI Αναζήτηση',
    filterByFeatures: 'Φίλτρο ανά Χαρακτηριστικά',
    availableProperties: 'Διαθέσιμα Ακίνητα',
    foundListings: 'Βρέθηκαν {count} {count === 1 ? "αγγελία" : "αγγελίες"}',
    newListing: 'Νέα Αγγελία',
    noPropertiesFound: 'Δεν βρέθηκαν ακίνητα που να ταιριάζουν με τα φίλτρα σας. Δοκιμάστε να προσαρμόσετε τα κριτήρια αναζήτησης.',
    noPropertiesFoundAi: 'Δεν βρέθηκαν ακίνητα. Δοκιμάστε μια διαφορετική αναζήτηση.',
    tellUsWhatYouNeed: 'Πείτε μας τι χρειάζεστε',
    aiSearchDescription: 'Περιγράψτε τι αναζητάτε και γιατί. Η AI μας θα βρει τα καλύτερα ακίνητα για εσάς.',
    applyFilters: 'Εφαρμογή Φίλτρων',
    searching: 'Αναζήτηση...',
    searchingWithAi: 'Αναζήτηση με AI...',
    anyCity: 'Οποιαδήποτε πόλη',
    anyCountry: 'Οποιαδήποτε χώρα',
    minBedrooms: 'Ελάχιστα Υπνοδωμάτια',
    maxBedrooms: 'Μέγιστα Υπνοδωμάτια',
    minPrice: 'Ελάχιστη Τιμή (€)',
    maxPrice: 'Μέγιστη Τιμή (€)',
    any: 'Οποιοδήποτε',
    publishedBy: 'Δημοσιεύτηκε από',
    perMonth: 'ανά μήνα',
    totalPrice: 'συνολική τιμή',
    
    // Profile Page
    asOwner: 'Ως Ιδιοκτήτης',
    asUser: 'Ως Χρήστης',
    noRatingsYet: 'Δεν υπάρχουν αξιολογήσεις ακόμα',
    rating: 'αξιολόγηση',
    ratings: 'αξιολογήσεις',
    userName: 'Όνομα Χρήστη',
    age: 'Ηλικία',
    dateOfBirth: 'Ημερομηνία Γέννησης',
    notSet: 'Δεν έχει οριστεί',
    occupation: 'Επάγγελμα',
    role: 'Ρόλος',
    memberSince: 'Μέλος από',
    editProfile: 'Επεξεργασία Προφίλ',
    owner: 'Ιδιοκτήτης',
    user: 'Χρήστης',
    ownerAndUser: 'Ιδιοκτήτης & Χρήστης',
    completeYourProfile: 'Ολοκληρώστε το Προφίλ σας',
    profileIncomplete: 'Το προφίλ σας είναι ατελές. Συμπληρώστε τις πληροφορίες σας για ένα πιο πλήρες προφίλ.',
    missingInformation: 'Λείπουν πληροφορίες',
    
    // Hamburger Menu
    menu: 'Μενού',
    profile: 'Προφίλ',
    myListings: 'Οι Αγγελίες μου',
    publishProperty: 'Δημοσίευση Ακινήτου',
    searchProperties: 'Αναζήτηση Ακινήτων',
    logout: 'Αποσύνδεση',
    showMenu: 'Εμφάνιση μενού',
    
    // Edit Profile Page
    editProfileTitle: 'Επεξεργασία Προφίλ',
    userNameOrName: 'Όνομα Χρήστη / Όνομα',
    selectOccupation: 'Επιλέξτε επάγγελμα',
    none: 'Κανένα',
    saving: 'Αποθήκευση...',
    saveChanges: 'Αποθήκευση Αλλαγών',
    profileUpdateFailed: 'Η ενημέρωση του προφίλ απέτυχε',
    userSearchProperties: 'Χρήστης (Αναζήτηση Ακινήτων)',
    ownerPublishProperties: 'Ιδιοκτήτης (Δημοσίευση Ακινήτων)',
    ownerAndUserFull: 'Ιδιοκτήτης & Χρήστης',
    
    // Login Page
    welcome: 'Καλώς ήρθατε',
    or: 'Ή',
    createNewAccount: 'δημιουργήστε νέο λογαριασμό',
    emailAddress: 'Διεύθυνση Email',
    password: 'Κωδικός',
    login: 'Σύνδεση',
    loggingIn: 'Σύνδεση...',
    loginFailed: 'Η σύνδεση απέτυχε',
    
    // Signup Page
    createAccount: 'Δημιουργία λογαριασμού',
    signInToExisting: 'συνδεθείτε στον υπάρχοντα λογαριασμό σας',
    signup: 'Εγγραφή',
    creatingAccount: 'Δημιουργία λογαριασμού...',
    signupFailed: 'Η εγγραφή απέτυχε',
    required: 'απαιτείται',
    yourName: 'Το όνομά σας',
    yourAge: 'Η ηλικία σας',
    yourDateOfBirth: 'Η ημερομηνία γέννησής σας',
    both: 'Και τα δύο',
  },
  en: {
    // Common
    loading: 'Loading...',
    back: 'Back',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    upload: 'Upload',
    photos: 'Photos',
    noPhotos: 'No photos available',
    
    // Home Page
    appTitle: 'House Rent',
    appDescription: 'Find your perfect rental or list your property',
    signUp: 'Sign Up',
    signIn: 'Sign In',
    
    // Navigation
    returnToSearch: 'Return to Search',
    
    // Listing Form
    createListing: 'Create Property Listing',
    editListing: 'Edit Property Listing',
    listingDetails: 'Fill in the details of the property you want to publish.',
    updateListing: 'Update Listing',
    updatingListing: 'Updating...',
    updateListingFailed: 'Failed to update listing',
    title: 'Title',
    description: 'Description',
    listingType: 'Listing Type',
    rent: 'Rent',
    sell: 'Sell',
    buy: 'Buy',
    street: 'Street',
    city: 'City',
    country: 'Country',
    pricePerMonth: 'Price per month (€)',
    bedrooms: 'Bedrooms',
    bathrooms: 'Bathrooms',
    floor: 'Floor',
    heating: 'Heating Type',
    sizeSqMeters: 'Size (m²)',
    yearBuilt: 'Year Built',
    yearRenovated: 'Year Renovated',
    availableFrom: 'Available From',
    uploadPhotos: 'Upload Photos',
    optional: 'optional',
    
    // Detail Page
    price: 'Price',
    perMonth: 'per month',
    totalPrice: 'total price',
    ownerProfile: 'Owner Profile',
    name: 'Name',
    email: 'Email',
    memberSince: 'Member Since',
    notProvided: 'Not provided',
    
    // My Listings
    myListings: 'My Listings',
    manageListings: 'Manage all your property listings',
    newListing: 'New Listing',
    noListings: "You haven't published any listings yet.",
    publishedOn: 'Published on',
    
    // Errors
    somethingWentWrong: 'Something went wrong. Please try again.',
    createListingFailed: 'Failed to create listing',
    
    // Search Page
    whatAreYouLookingFor: 'What are you looking for?',
    howDoYouWantToSearch: 'How do you want to search?',
    back: 'Back',
    manualFilter: 'Manual Filter',
    aiSearch: 'AI Search',
    filterByFeatures: 'Filter by Features',
    availableProperties: 'Available Properties',
    foundListings: 'Found {count} {count === 1 ? "listing" : "listings"}',
    newListing: 'New Listing',
    noPropertiesFound: 'No properties found matching your filters. Try adjusting your search criteria.',
    noPropertiesFoundAi: 'No properties found. Try a different search.',
    tellUsWhatYouNeed: 'Tell us what you need',
    aiSearchDescription: 'Describe what you\'re looking for and why. Our AI will find the best properties for you.',
    applyFilters: 'Apply Filters',
    searching: 'Searching...',
    searchingWithAi: 'Searching with AI...',
    anyCity: 'Any city',
    anyCountry: 'Any country',
    minBedrooms: 'Min Bedrooms',
    maxBedrooms: 'Max Bedrooms',
    minPrice: 'Min Price (€)',
    maxPrice: 'Max Price (€)',
    any: 'Any',
    publishedBy: 'Published by',
    perMonth: 'per month',
    totalPrice: 'total price',
    
    // Profile Page
    asOwner: 'As Owner',
    asUser: 'As User',
    noRatingsYet: 'No ratings yet',
    rating: 'rating',
    ratings: 'ratings',
    userName: 'User Name',
    age: 'Age',
    dateOfBirth: 'Date of Birth',
    notSet: 'Not set',
    occupation: 'Occupation',
    role: 'Role',
    memberSince: 'Member Since',
    editProfile: 'Edit Profile',
    owner: 'Owner',
    user: 'User',
    ownerAndUser: 'Owner & User',
    completeYourProfile: 'Complete Your Profile',
    profileIncomplete: 'Your profile is incomplete. Fill in your information for a more complete profile.',
    missingInformation: 'Missing information',
    
    // Hamburger Menu
    menu: 'Menu',
    profile: 'Profile',
    myListings: 'My Listings',
    publishProperty: 'Publish Property',
    searchProperties: 'Search Properties',
    logout: 'Logout',
    showMenu: 'Show menu',
    
    // Edit Profile Page
    editProfileTitle: 'Edit Profile',
    userNameOrName: 'User Name / Name',
    selectOccupation: 'Select occupation',
    none: 'None',
    saving: 'Saving...',
    saveChanges: 'Save Changes',
    profileUpdateFailed: 'Profile update failed',
    userSearchProperties: 'User (Search Properties)',
    ownerPublishProperties: 'Owner (Publish Properties)',
    ownerAndUserFull: 'Owner & User',
    
    // Login Page
    welcome: 'Welcome',
    or: 'Or',
    createNewAccount: 'create a new account',
    emailAddress: 'Email Address',
    password: 'Password',
    login: 'Sign In',
    loggingIn: 'Signing in...',
    loginFailed: 'Login failed',
    
    // Signup Page
    createAccount: 'Create Account',
    signInToExisting: 'sign in to your existing account',
    signup: 'Sign Up',
    creatingAccount: 'Creating account...',
    signupFailed: 'Sign up failed',
    required: 'required',
    yourName: 'Your name',
    yourAge: 'Your age',
    yourDateOfBirth: 'Your date of birth',
    both: 'Both',
  },
}

export function getTranslation(lang: Language, key: keyof typeof translations.el): string {
  return translations[lang][key] || key
}

// Translation map for user-entered values (heating types, occupations, titles, etc.)
const valueTranslations: Record<string, { el: string; en: string }> = {
  // Heating Types
  'Central': { el: 'Κεντρική Θέρμανση', en: 'Central Heating' },
  'Electric': { el: 'Ηλεκτρική', en: 'Electric' },
  'Gas': { el: 'Φυσικό Αέριο', en: 'Natural Gas' },
  'Oil': { el: 'Πετρέλαιο', en: 'Oil' },
  'Heat Pump': { el: 'Αντλία Θερμότητας', en: 'Heat Pump' },
  'Wood/Pellet': { el: 'Ξύλο/Πελλέτ', en: 'Wood/Pellet' },
  'Other': { el: 'Άλλο', en: 'Other' },
  
  // Titles
  'Mr': { el: 'Κος', en: 'Mr' },
  'Mrs': { el: 'Κυρία', en: 'Mrs' },
  
  // Occupations
  'Worker': { el: 'Εργαζόμενος', en: 'Worker' },
  'Student': { el: 'Φοιτητής', en: 'Student' },
  'Professional': { el: 'Επαγγελματίας', en: 'Professional' },
  'Entrepreneur': { el: 'Επιχειρηματίας', en: 'Entrepreneur' },
  'Retired': { el: 'Συνταξιούχος', en: 'Retired' },
  // Note: 'Other' for occupations is already covered in heating types above
}

/**
 * Translates user-entered values (like heating types) based on current language
 * Returns the original value if no translation is found
 */
export function translateValue(lang: Language, value: string | null | undefined): string {
  if (!value) return ''
  
  const trimmedValue = value.trim()
  const translation = valueTranslations[trimmedValue]
  
  if (translation) {
    return translation[lang]
  }
  
  // Return original value if no translation found
  return trimmedValue
}

