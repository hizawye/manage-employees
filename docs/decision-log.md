# Decision Log

## 2026-01-13: Project Initialization

### Platform Choice: React Native + Expo
**Decision:** Use React Native with Expo for cross-platform mobile development.
**Rationale:**
- Single codebase for iOS and Android
- Expo provides excellent developer experience
- User specified this preference

### Database: expo-sqlite
**Decision:** Use SQLite for local-first data storage.
**Rationale:**
- Relational data model fits employee/attendance structure
- ACID transactions for data integrity
- Works offline without network dependency
- User requested local-first with optional sync later

### UI Library: react-native-paper
**Decision:** Use react-native-paper for Material Design components.
**Rationale:**
- Material Design 3 is professional and familiar
- Comprehensive component library
- Good TypeScript support

### Navigation: Expo Router
**Decision:** Use file-based routing with expo-router.
**Rationale:**
- Simpler mental model (similar to Next.js)
- Type-safe navigation
- Better deep linking support

### Wage Calculation Logic
**Decision:** Daily = full/half/0, Hourly = hours × rate.
**Rationale:**
- User confirmed support for both wage types
- Daily: present=100%, half-day=50%, absent=0%
- Hourly: track hours worked, multiply by rate
