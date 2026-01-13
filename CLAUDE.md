# Project: Manage Employees

## Tech Stack
- **Language:** TypeScript
- **Framework:** React Native with Expo SDK 54
- **Navigation:** Expo Router (file-based)
- **Database:** expo-sqlite (local-first)
- **UI Library:** react-native-paper (Material Design 3)
- **Forms:** react-hook-form + zod
- **Environment:** Fedora Linux / Fish Shell

## Automated Workflow
- **State Recovery:** On start, read `docs/project-status.md` and `docs/decision-log.md`.
- **Sync Command:** `/update-docs-and-commit`

## Commands
- **/context**: `cat docs/project-status.md docs/decision-log.md docs/architecture.md`
- **/status**: `cat docs/project-status.md`
- **/log**: `cat docs/decision-log.md | tail -n 20`

## Project Structure
```
manage-employees/
├── app/                    # Expo Router screens
│   ├── (tabs)/
│   │   ├── employees/      # Employee CRUD
│   │   ├── attendance/     # Attendance tracking
│   │   └── wages/          # Wage calculations
│   └── _layout.tsx
├── src/
│   ├── components/         # Reusable UI components
│   ├── database/           # SQLite schema & repositories
│   ├── models/             # TypeScript interfaces
│   ├── services/           # Business logic
│   ├── hooks/              # Custom React hooks
│   └── utils/              # Helper functions
└── docs/                   # Documentation
```

## Running the App
```bash
npm start          # Start Expo development server
npm run android    # Run on Android
npm run ios        # Run on iOS
```
