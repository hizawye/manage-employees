/**
 * Application Configuration
 * Centralized configuration for the entire application
 */

export const APP_CONFIG = {
  // Attendance configuration
  attendance: {
    defaultHoursPerDay: 8,
    maxHoursPerDay: 24,
    minHoursPerDay: 0,
  },

  // Wage configuration
  wages: {
    currency: 'DZD',
    currencySymbol: 'د.ج',
    minWageRate: 0,
  },

  // Cache configuration
  cache: {
    ttlMinutes: 5,
    ttlMilliseconds: 5 * 60 * 1000,
  },

  // Database configuration
  database: {
    name: 'employees.db',
    version: 1,
  },

  // UI configuration
  ui: {
    listPerformance: {
      removeClippedSubviews: true,
      maxToRenderPerBatch: 10,
      windowSize: 10,
      initialNumToRender: 15,
    },
  },

  // Validation rules
  validation: {
    employee: {
      minNameLength: 1,
      minPhoneLength: 1,
      minRoleLength: 1,
    },
  },
} as const;

// Type-safe config access
export type AppConfig = typeof APP_CONFIG;
