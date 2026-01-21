# Project Rules & Conventions

## 1. Localization & RTL Support
- **Primary Language**: Arabic.
- **Layout Direction**: The app uses **RTL (Right-to-Left)** by default.
- **I18n**: 
  - All text must be internationalized using `src/i18n`.
  - Check `I18nManager.isRTL` for layout adjustments (especially for absolute positioning).
  - Use `flex-start` and `flex-end` instead of `left` and `right` where possible, but be aware that React Native automatically flips `flex-start`/`flex-end` in RTL mode.
  - For icons (like back arrows), verify they point the correct direction in RTL.
  - **Back Buttons**: In RTL, the "Back" button should typically be on the **right** side of the header, pointing right (or left if standard native behavior is preserved, but custom headers might need manual swapping). Note: Standard Android RTL layouts often keep back button on right pointing right.

## 2. Architecture
- **Framework**: React Native with Expo.
- **Navigation**: Expo Router (file-based routing).
- **UI Library**: React Native Paper.
- **State Management**: Context API (Auth, Theme).
- **Database**: SQLite with Repository pattern in `src/database/repositories`.

## 3. Styling
- **Theme**: Use `react-native-paper`'s `useTheme()` hook.
- **Spacing/constants**: Use `src/constants/theme.ts`.
- **SafeArea**: Use `SafeAreaView` from `react-native-safe-area-context` for screens with custom headers.

## 4. Workflows
- **Logs**: Any major action (Create, Update, Delete) must be logged via `LogRepository`.
