import { AttendanceStatus } from '../models';
import { colors } from '../constants/theme';
import { t } from '../i18n';

/**
 * Get color for attendance status
 */
export function getStatusColor(status: AttendanceStatus): string {
  switch (status) {
    case AttendanceStatus.PRESENT:
      return colors.present;
    case AttendanceStatus.HALF_DAY:
      return colors.halfDay;
    case AttendanceStatus.ABSENT:
      return colors.absent;
    default:
      return colors.textLight;
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
