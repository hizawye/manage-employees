# Architecture

## Overview
A React Native mobile app for managing employees and calculating daily wages. Local-first architecture with SQLite for data persistence.

## Data Flow
```
UI Components (Screens)
       ↓
  Custom Hooks (useEmployees, useAttendance)
       ↓
  Repositories (EmployeeRepository, AttendanceRepository)
       ↓
  SQLite Database (employees.db)
```

## Key Components

### Database Layer
- **Schema**: Defines Employee and Attendance tables
- **Repositories**: CRUD operations with type-safe queries
- **expo-sqlite**: Native SQLite for React Native

### Business Logic
- **WageCalculationService**: Handles wage calculations
  - Daily rate: present=100%, half-day=50%, absent=0%
  - Hourly rate: hours × rate

### UI Layer
- **Expo Router**: File-based navigation
- **react-native-paper**: Material Design 3 components
- **react-hook-form + zod**: Form handling and validation

## Navigation Structure
```
app/
├── index.tsx            # Entry point (redirects to employees)
├── _layout.tsx          # Root layout with providers
└── (tabs)/
    ├── _layout.tsx      # Tab navigation (RTL-aware order)
    ├── employees/
    │   ├── index.tsx        # Employee list
    │   ├── add.tsx          # Add employee form
    │   ├── [id].tsx         # Employee detail
    │   └── edit/[id].tsx    # Edit employee form
    ├── attendance/
    │   ├── index.tsx        # Daily attendance marking
    │   └── history.tsx      # Attendance history
    ├── wages/
    │   ├── index.tsx        # Wage summary
    │   └── [employeeId].tsx # Employee wage detail
    └── profile/
        └── index.tsx        # Statistics dashboard
```

## Internationalization (i18n)
- **Default Language**: Arabic (forced on all devices)
- **RTL Support**: Full RTL layout using I18nManager
- **RTL Helpers**: Theme includes rtlStyles for consistent RTL behavior
- **Tab Order**: Reversed for RTL (Profile → Wages → Attendance → Employees)
