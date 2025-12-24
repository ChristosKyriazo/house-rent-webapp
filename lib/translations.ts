export type Language = 'el' | 'en'

export const translations = {
  el: {
    // Common
    loading: 'Φόρτωση...',
    back: 'Πίσω',
    edit: 'Επεξεργασία',
    save: 'Αποθήκευση',
    cancel: 'Ακύρωση',
    close: 'Κλείσιμο',
    confirm: 'Επιβεβαίωση',
    delete: 'Διαγραφή',
    confirmDelete: 'Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την αγγελία;',
    deleteFailed: 'Η διαγραφή της αγγελίας απέτυχε',
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
    cityArea: 'Περιοχή',
    selectCityArea: 'Επιλέξτε περιοχή',
    country: 'Χώρα',
    pricePerMonth: 'Τιμή ανά μήνα (€)',
    bedrooms: 'Υπνοδωμάτια',
    bathrooms: 'Μπάνια',
    floor: 'Όροφος',
            heatingCategory: 'Κατηγορία Θέρμανσης',
            heatingAgent: 'Υλικό Θέρμανσης',
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
            homeowner: 'Ιδιοκτήτης',
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
    listing: 'αγγελία',
    listings: 'αγγελίες',
    found: 'βρέθηκαν',
    bedroomsShort: 'υπνοδ.',
    bathroomsShort: 'μπάνια',
    noPropertiesFound: 'Δεν βρέθηκαν ακίνητα που να ταιριάζουν με τα φίλτρα σας. Δοκιμάστε να προσαρμόσετε τα κριτήρια αναζήτησης.',
    noPropertiesFoundAi: 'Δεν βρέθηκαν ακίνητα. Δοκιμάστε μια διαφορετική αναζήτηση.',
    inquire: 'Ενδιαφέρομαι',
    removeInquiry: 'Δεν ενδιαφέρομαι',
    inquiryMade: 'Ενδιαφέρον εκδηλώθηκε',
    tellUsWhatYouNeed: 'Πείτε μας τι χρειάζεστε',
    aiSearchDescription: 'Περιγράψτε τι αναζητάτε και γιατί. Η AI μας θα βρει τα καλύτερα ακίνητα για εσάς.',
    applyFilters: 'Εφαρμογή Φίλτρων',
    searching: 'Αναζήτηση...',
    searchingWithAi: 'Αναζήτηση με AI...',
    anyCity: 'Οποιαδήποτε πόλη',
    anyCountry: 'Οποιαδήποτε χώρα',
    minBedrooms: 'Ελάχιστα Υπνοδωμάτια',
    maxBedrooms: 'Μέγιστα Υπνοδωμάτια',
    minSize: 'Ελάχιστο Μέγεθος (m²)',
    maxSize: 'Μέγιστο Μέγεθος (m²)',
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
    close: 'Close',
    confirm: 'Confirm',
    delete: 'Delete',
    confirmDelete: 'Are you sure you want to delete this listing?',
    deleteFailed: 'Failed to delete listing',
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
    cityArea: 'City Area',
    selectCityArea: 'Select area',
    country: 'Country',
    pricePerMonth: 'Price per month (€)',
    bedrooms: 'Bedrooms',
    bathrooms: 'Bathrooms',
    floor: 'Floor',
            heatingCategory: 'Heating Category',
            heatingAgent: 'Heating Agent',
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
            homeowner: 'Homeowner',
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
    listing: 'listing',
    listings: 'listings',
    found: 'found',
    bedroomsShort: 'bedr.',
    bathroomsShort: 'bathr.',
    noPropertiesFound: 'No properties found matching your filters. Try adjusting your search criteria.',
    noPropertiesFoundAi: 'No properties found. Try a different search.',
    inquire: 'Inquire',
    removeInquiry: 'Remove inquiry',
    inquiryMade: 'Inquiry made',
    tellUsWhatYouNeed: 'Tell us what you need',
    aiSearchDescription: 'Describe what you\'re looking for and why. Our AI will find the best properties for you.',
    applyFilters: 'Apply Filters',
    searching: 'Searching...',
    searchingWithAi: 'Searching with AI...',
    anyCity: 'Any city',
    anyCountry: 'Any country',
    minBedrooms: 'Min Bedrooms',
    maxBedrooms: 'Max Bedrooms',
    minSize: 'Min Size (m²)',
    maxSize: 'Max Size (m²)',
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
  // Heating Category
  'central': { el: 'Κεντρική', en: 'Central' },
  'autonomous': { el: 'Αυτόνομη', en: 'Autonomous' },
  
  // Heating Agent
  'oil': { el: 'Πετρέλαιο', en: 'Oil' },
  'natural gas': { el: 'Φυσικό Αέριο', en: 'Natural Gas' },
  'electricity': { el: 'Ρεύμα', en: 'Electricity' },
  'other': { el: 'Άλλο', en: 'Other' },
  
  // Titles
  'Mr': { el: 'Κος', en: 'Mr' },
  'Mrs': { el: 'Κυρία', en: 'Mrs' },
  
  // Occupations
  'Employed': { el: 'Εργαζόμενος', en: 'Employed' },
  'Worker': { el: 'Εργαζόμενος', en: 'Employed' }, // Backward compatibility
  'Student': { el: 'Φοιτητής', en: 'Student' },
  'Retired': { el: 'Συνταξιούχος', en: 'Retired' },
  'Unemployed': { el: 'Άνεργος', en: 'Unemployed' },
  // Note: 'Other' for occupations is already covered in heating types above
  
  // City Areas
  'Nea Smirni': { el: 'Νέα Σμύρνη', en: 'Nea Smirni' },
  'Νέα Σμύρνη': { el: 'Νέα Σμύρνη', en: 'Nea Smirni' },
}

/**
 * Translates user-entered values (like heating types, city areas) based on current language
 * Returns the original value if no translation is found
 * Handles both directions: can translate from English to Greek or Greek to English
 * Case-insensitive matching for better reliability
 */
export function translateValue(lang: Language, value: string | null | undefined): string {
  if (!value) return ''
  
  const trimmedValue = value.trim()
  if (!trimmedValue) return ''
  
  const lowerValue = trimmedValue.toLowerCase()
  
  // Special case: "Worker" should map to "Employed" for backward compatibility
  if (trimmedValue === 'Worker' || lowerValue === 'worker') {
    return valueTranslations['Employed']?.[lang] || 'Employed'
  }
  
  // First, try direct lookup (case-sensitive)
  let translation = valueTranslations[trimmedValue]
  if (translation) {
    return translation[lang]
  }
  
  // Try case-insensitive lookup by key
  for (const [key, trans] of Object.entries(valueTranslations)) {
    if (key.toLowerCase() === lowerValue) {
      // Special case: if we find "Worker" key, use "Employed" translation
      if (key === 'Worker') {
        return valueTranslations['Employed']?.[lang] || 'Employed'
      }
      return trans[lang]
    }
  }
  
  // If not found, try reverse lookup (find the key that has this value in the other language)
  // This handles cases where the value might already be in the target language
  for (const [key, trans] of Object.entries(valueTranslations)) {
    // Check if the value matches the English translation
    if (trans.en.toLowerCase() === lowerValue) {
      // Special case: if this is "Worker", return "Employed" translation
      if (key === 'Worker') {
        return valueTranslations['Employed']?.[lang] || 'Employed'
      }
      return lang === 'el' ? trans.el : trans.en
    }
    // Check if the value matches the Greek translation
    if (trans.el.toLowerCase() === lowerValue) {
      // Special case: if this is "Worker", return "Employed" translation
      if (key === 'Worker') {
        return valueTranslations['Employed']?.[lang] || 'Employed'
      }
      return lang === 'el' ? trans.el : trans.en
    }
  }
  
  // Return original value if no translation found
  return trimmedValue
}

/**
 * Translates a value from the current display language back to its canonical (English) key.
 * Useful for sending translated UI values back to the API in a consistent format.
 */
export function reverseTranslateValue(value: string | null | undefined): string {
  if (!value) return ''

  const trimmedValue = value.trim()
  if (!trimmedValue) return ''

  const lowerValue = trimmedValue.toLowerCase()

  // Special case: "Worker" should map to "Employed" for backward compatibility
  if (trimmedValue === 'Worker' || lowerValue === 'worker') {
    return 'Employed'
  }

  // Check if the value is already an English key
  if (valueTranslations[trimmedValue] && valueTranslations[trimmedValue].en === trimmedValue) {
    return trimmedValue
  }

  // Check if the value is a Greek translation - find the English key
  for (const [key, trans] of Object.entries(valueTranslations)) {
    if (trans.el.toLowerCase() === lowerValue || trans.el === trimmedValue) {
      // Special case: if we find "Worker" key, return "Employed" instead
      if (key === 'Worker') {
        return 'Employed'
      }
      return key // Return the English key
    }
    // Also check case-insensitive
    if (trans.en.toLowerCase() === lowerValue && trans.en !== trimmedValue) {
      if (key === 'Worker') {
        return 'Employed'
      }
      return key
    }
  }

  // Return original if no reverse translation found
  return trimmedValue
}

