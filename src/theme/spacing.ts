/** 8pt grid + shared chrome with admin */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  /** Cards */
  sm: 10,
  /** Buttons, chips */
  md: 8,
  lg: 10,
  /** Larger cards / sheets */
  xl: 10,
  xxl: 16,
  /** Avatars only */
  full: 9999,
} as const;

/** Flat elevation — prefer 1px borders over soft teal drops */
export const shadows = {
  sm: {
    shadowColor: '#111827',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#111827',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  lg: {
    shadowColor: '#111827',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  card: {
    shadowColor: '#111827',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  primary: {
    shadowColor: '#0F3D3A',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
} as const;
