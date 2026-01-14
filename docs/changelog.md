# Changelog

## [1.0.1] - 2026-01-14

### Added
- Profile tab with comprehensive statistics dashboard
  - Employee stats (total, active, inactive counts)
  - Wage stats (weekly and monthly totals)
  - Attendance stats (weekly and monthly rates)
  - App info section
- App entry point (index.tsx) with redirect to employees tab
- EAS Build configuration for Android APK generation
- .npmrc for legacy peer dependencies compatibility

### Changed
- Arabic set as default language (forced regardless of device locale)
- Complete RTL optimization for Arabic UI
  - Reversed tab order (Profile → Wages → Attendance → Employees)
  - Centered header titles across all layouts
  - RTL-aware FAB positioning
  - RTL text alignment in all input fields
  - RTL-aware styling helpers in theme
- Updated color palette to blue theme (primary: #1976d2)
- Improved UI polish with better spacing and typography
- Replaced `uuid` package with `expo-crypto` for React Native compatibility
- Added useFocusEffect to auto-refresh employee and attendance lists

### Fixed
- Database UUID generation (now uses expo-crypto instead of uuid)
- Employee list not refreshing after adding new employee
- Attendance list not refreshing after marking attendance
- Unmatched route error on app launch
- EAS build dependency installation issues

## [1.0.0] - 2026-01-13

### Added
- Initial project setup with Expo + TypeScript
- SQLite database with Employee and Attendance tables
- Employee management (CRUD)
  - Add new employees with name, phone, role, wage type/rate
  - Edit employee details
  - Delete employees (with cascade to attendance)
  - Search and filter employees
- Attendance tracking
  - Mark daily attendance (present/absent/half-day)
  - Hours input for hourly employees
  - View attendance history by week
- Wage calculation
  - Daily rate calculation (present=100%, half=50%, absent=0%)
  - Hourly rate calculation (hours × rate)
  - Weekly and monthly wage summaries
  - Individual employee wage breakdown
- Tab-based navigation (Employees, Attendance, Wages)
- Material Design 3 UI with react-native-paper
