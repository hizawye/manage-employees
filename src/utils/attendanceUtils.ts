import { AttendanceStatus } from '../models';
import { colors as staticColors } from '../constants/theme';
import { t } from '../i18n';

/**
 * Get color for attendance status
 * Accepts an optional theme colors object to support dynamic theming
 */
export function getStatusColor(status: AttendanceStatus, themeColors?: Record<string, string>): string {
  // Use provided theme colors or fallback to static colors
  const colors = themeColors || staticColors;

  switch (status) {
    case AttendanceStatus.PRESENT:
      return colors.present || staticColors.present;
    case AttendanceStatus.HALF_DAY:
      return colors.halfDay || staticColors.halfDay;
    case AttendanceStatus.ABSENT:
      return colors.absent || staticColors.absent;
    default:
      return colors.textLight || staticColors.textLight;
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
