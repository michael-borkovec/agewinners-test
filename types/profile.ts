// types/profile.ts
// Popis: Typy uživatelského profilu a konfigurovatelná schema profilových polí.

export type ProfileSectionId =
  | 'basic'      // B. Základní volitelné údaje
  | 'personal'   // C. Další osobní údaje + AgeWinners lifestyle
  | 'social'     // D. Sociální a kontaktní údaje
  | 'stats'      // E. Obsahové statistiky (jen pro čtení)
  | 'privacy'    // F. Nastavení soukromí a personalizace
  | 'security'   // G. Bezpečnostní sekce
  | 'photos';    // sekce pro "Moje fotky & věkové tipy" (to, co už máš)

export type ProfileFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'number'
  | 'checkbox';

export type ProfileFieldOption = {
  value: string;
  label: string;
};

export type ProfileField = {
  id: keyof UserProfile;        // klíč v UserProfile, aby se to pěkně typovalo
  section: ProfileSectionId;    // do jaké sekce pole patří
  label: string;                // nadpis ve formuláři
  type: ProfileFieldType;       // typ inputu
  required?: boolean;           // povinné / nepovinné
  options?: ProfileFieldOption[]; // pro select/multiselect
  helperText?: string;          // krátký popis pod polem
};

// Hlavní datový typ pro profil – všechna pole volitelná, ať máme flexibilitu.
// Povinnost řešíme přes konfiguraci (ProfileField.required).
export type UserProfile = {
  // B. Základní volitelné údaje po přihlášení
  displayName?: string;
  username?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  websiteUrl?: string;
  phone?: string;

  // C. Další osobní údaje + AgeWinners specifika
  occupation?: string;
  education?: string;
  languages?: string;
  relationshipStatus?: string;
  pronouns?: string;
  interests?: string[];
  favoriteActivities?: string[];
  dietStyle?: string;
  focusAreas?: string[];  // sport, strava, krása, mindset, spánek...
  goals?: string[];       // cíle (cítit se mladší, víc energie atd.)

  // D. Sociální a kontaktní údaje
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  linkedin?: string;
  twitter?: string;
  publicEmail?: string;

  // E. Obsahové statistiky (jen pro čtení, generuje systém)
  postsCount?: number;
  photosCount?: number;
  receivedAgeGuessesCount?: number;
  givenAgeGuessesCount?: number;
  averageGuessedAge?: number;
  guessAccuracyScore?: number; // přesnost tipů
  ageWinnersScore?: number;    // AgeWinners skóre

  // F. Nastavení soukromí a personalizace
  profileVisibility?: 'public' | 'registered' | 'friends' | 'private';
  showAge?: 'exact' | 'range' | 'hidden';
  showLocation?: 'city' | 'country' | 'hidden';
  showStats?: 'all' | 'limited' | 'hidden';
  uiLanguage?: 'cs' | 'en';
  theme?: 'light' | 'dark' | 'system';
  preferredContentFocus?: string[];
  notificationsEmail?: boolean;
  notificationsPush?: boolean;

  // G. Bezpečnost – spíš jen indikátory (nastavení se řeší jinde)
  hasTwoFactorAuthEnabled?: boolean;
};
