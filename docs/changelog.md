# Changelog

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
