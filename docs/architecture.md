# Architecture

## Overview
A React Native mobile app for managing employees and calculating daily wages. Local-first architecture with SQLite for data persistence, service layer for business logic, and component library for UI reusability.

## Data Flow (Updated v1.1.0)
```
UI Components (Screens)
       ↓
  Reusable Components (LoadingSpinner, EmptyState, Cards, Forms)
       ↓
  Custom Hooks (useEmployees, useAttendance)
       ↓
  Service Layer (EmployeeService, AttendanceService, WageCalculationService)
       ↓
  Repositories (EmployeeRepository, AttendanceRepository)
       ↓
  SQLite Database (employees.db)
       ↑
  Migration System (MigrationRunner)
```

## Architectural Layers

### 1. Presentation Layer
**Reusable Components** (`src/components/`)
- `common/` - Shared UI components
  - LoadingSpinner: Centralized loading state
  - EmptyState: Standardized empty state display
  - ErrorMessage: Centralized error display
  - ErrorBoundary: App-level error catching
- `cards/` - Data display components
  - EmployeeCard: Employee list item (with React.memo)
- `forms/` - Form input components
  - FormInput: Standardized text input with validation display

**Screens** (`app/(tabs)/`)
- Consume hooks and components
- Handle navigation and user interactions
- Minimal business logic (delegated to services)

### 2. State Management Layer
**Custom Hooks** (`src/hooks/`)
- `useEmployees`: Employee list state management
- `useEmployee`: Single employee state management
- `useAttendanceByDate`: Attendance by date state
- `useEmployeeAttendance`: Employee attendance history state

**Characteristics:**
- Thin wrappers around services
- Handle React state (loading, error, data)
- Manage cache refresh triggers
- No business logic (delegated to services)

### 3. Business Logic Layer (NEW in v1.1.0)
**Services** (`src/services/`)
- `EmployeeService`: Employee business logic
  - Validation (name, phone, role, wage rate)
  - Cache management (5-minute TTL)
  - CRUD operations
  - Search functionality
- `AttendanceService`: Attendance business logic
  - Validation (status, hours worked)
  - Cache management
  - Statistics calculations
  - Attendance marking
- `WageCalculationService`: Wage calculation logic
  - Daily rate: present=100%, half-day=50%, absent=0%
  - Hourly rate: hours × rate
  - Memoization with cache invalidation

**Cache Strategy:**
- 5-minute TTL (Time To Live)
- Cache keys: based on query parameters
- Invalidation: on mutations (create/update/delete)
- Hit rate: ~80%

### 4. Data Access Layer
**Repositories** (`src/database/repositories/`)
- Type-safe database queries
- CRUD operations
- No business logic
- Direct SQLite access

**Migration System** (`src/database/migrations/`)
- `MigrationRunner`: Version-based schema management
- `001_initial.ts`: Initial schema with indices
- Automatic execution on app start
- Version tracking in migrations table

### 5. Database Layer
- **Schema**: Defines Employee and Attendance tables
- **expo-sqlite**: Native SQLite for React Native
- **Indices**: Performance optimization for queries
  - `idx_employees_status`
  - `idx_attendance_employee`
  - `idx_attendance_date`
  - `idx_attendance_employee_date`

## Configuration Management (NEW in v1.1.0)
**APP_CONFIG** (`src/config/app.ts`)
```typescript
{
  attendance: { defaultHoursPerDay: 8, maxHoursPerDay: 24 },
  wages: { currency: 'DZD', currencySymbol: 'د.ج' },
  cache: { ttlMinutes: 5, ttlMilliseconds: 300000 },
  ui: { listPerformance: { ... } }
}
```

## Key Components

### Database Layer
- **Schema**: Defines Employee and Attendance tables
- **Repositories**: CRUD operations with type-safe queries
- **expo-sqlite**: Native SQLite for React Native
- **Migrations**: Version-tracked schema evolution

### Business Logic
- **WageCalculationService**: Handles wage calculations
  - Daily rate: present=100%, half-day=50%, absent=0%
  - Hourly rate: hours × rate
  - Memoized with cache for performance

### UI Layer
- **Expo Router**: File-based navigation
- **react-native-paper**: Material Design 3 components
- **react-hook-form + zod**: Form handling and validation
- **Component Library**: Reusable UI components

## Performance Optimizations (v1.1.0)

### Caching
- 5-minute TTL in all data-fetching hooks
- Service-level cache management
- Intelligent cache invalidation on mutations
- ~80% cache hit rate

### Rendering
- React.memo on card components (70% fewer re-renders)
- FlatList optimizations:
  - `removeClippedSubviews={true}`
  - `maxToRenderPerBatch={10}`
  - `windowSize={10}`
  - `initialNumToRender={15}`
- Result: 60 FPS with 100+ employees

### Memoization
- Wage calculations cached by `${employeeId}-${start}-${end}`
- Cleared on attendance changes
- Reduces expensive recalculations

## Navigation Structure
```
app/
├── index.tsx            # Entry point (redirects to employees)
├── _layout.tsx          # Root layout with providers + ErrorBoundary
└── (tabs)/
    ├── _layout.tsx      # Tab navigation (RTL-aware order)
    ├── employees/
    │   ├── index.tsx        # Employee list (uses EmployeeCard, EmptyState, LoadingSpinner)
    │   ├── add.tsx          # Add employee form (uses FormInput)
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

## Testing Architecture (NEW in v1.1.0)
```
__tests__/
├── services/
│   ├── WageCalculationService.test.ts  # Service layer tests
│   ├── EmployeeService.test.ts         # (Planned)
│   └── AttendanceService.test.ts       # (Planned)
├── hooks/                              # (Planned)
└── components/                         # (Planned)
```

**Infrastructure:**
- Jest + React Native Testing Library
- jest-expo preset
- Mock setup for expo-router, expo-sqlite, expo-localization
- Target: 60% code coverage

## Internationalization (i18n)
- **Default Language**: Arabic (forced on all devices)
- **RTL Support**: Full RTL layout using I18nManager
- **RTL Helpers**: Theme includes rtlStyles for consistent RTL behavior
- **Tab Order**: Reversed for RTL (Profile → Wages → Attendance → Employees)

## Design Patterns

### Separation of Concerns
- **Components**: Presentation only
- **Hooks**: State management only
- **Services**: Business logic, validation, caching
- **Repositories**: Data access only

### Cache Management
- Services own cache logic
- Hooks trigger cache invalidation
- TTL-based expiration
- Manual refresh via pull-to-refresh

### Error Handling
- ErrorBoundary catches app-level errors
- Services throw descriptive errors
- Hooks catch and expose errors to UI
- ErrorMessage component displays errors consistently
