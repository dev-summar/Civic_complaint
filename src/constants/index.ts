export * from './roles';
export * from './status';
export * from './categories';
export * from './brand';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@rabta/access_token',
  REFRESH_TOKEN: '@rabta/refresh_token',
  USER: '@rabta/user',
  ONBOARDING_DONE: '@rabta/onboarding_done',
  THEME: '@rabta/theme',
  LANGUAGE: '@rabta/language',
  SAVED_LOCATIONS: '@rabta/saved_locations',
  DRAFT_COMPLAINT: '@rabta/draft_complaint',
  PUSH_ENABLED: '@rabta/push_enabled',
  LOCATION_ENABLED: '@rabta/location_enabled',
} as const;

export const JK_REGION = {
  latitude: 33.7782,
  longitude: 76.5762,
  latitudeDelta: 2.5,
  longitudeDelta: 2.5,
} as const;

// Street map for the picker before GPS. The region centroid above is hillside
// with no roads, so the map looks empty until the citizen taps "Use my location".
export const MAP_CITY = {
  latitude: 32.7266,
  longitude: 74.857,
} as const;
