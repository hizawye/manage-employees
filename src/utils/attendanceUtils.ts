import { AttendanceStatus } from '../models';
import { colors as staticColors } from '../constants/theme';
import { t } from '../i18n';
import { MD3Colors } from 'react-native-paper';

/**
 * Get color for attendance status
 * Accepts an optional theme colors object to support dynamic theming
 */
export function getStatusColor(status: AttendanceStatus, themeColors?: MD3Colors): string {
  // Use provided theme colors or fallback to static colors
  // We cast staticColors to any because it matches the shape but isn't typed as MD3Colors
  const colors = themeColors || (staticColors as any);

  switch (status) {
    case AttendanceStatus.PRESENT:
      return colors.present;
    case AttendanceStatus.HALF_DAY:
      return colors.halfDay;
    case AttendanceStatus.ABSENT:
      return colors.absent;
    default:
      return colors.textLight || colors.onSurfaceVariant;
  }
}

/**
 * Get translated label for attendance status
 */
export function getStatusLabel(status: AttendanceStatus): string {
  switch (status) {
    case AttendanceStatus.PRESENT:
      return t('attendance.present');
    case AttendanceStatus.HALF_DAY:
      return t('attendance.halfDay');
    case AttendanceStatus.ABSENT:
      return t('attendance.absent');
    default:
      return status;
  }
}

/**
 * Get icon name for attendance status
 */
export function getStatusIcon(status: AttendanceStatus): string {
  switch (status) {
    case AttendanceStatus.PRESENT:
      return 'check-circle';
    case AttendanceStatus.HALF_DAY:
      return 'clock-outline';
    case AttendanceStatus.ABSENT:
      return 'close-circle';
    default:
      return 'help-circle';
  }
}
