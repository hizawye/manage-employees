import React from 'react';
import { StyleSheet } from 'react-native';
import { Chip, useTheme } from 'react-native-paper';
import { EmployeeStatus, AttendanceStatus } from '../../models';
import { getStatusLabel } from '../../utils/attendanceUtils';
import { t } from '../../i18n';

interface StatusChipProps {
  type: 'employee' | 'attendance';
  status: EmployeeStatus | AttendanceStatus;
  compact?: boolean;
}

export const StatusChip: React.FC<StatusChipProps> = ({ type, status, compact = true }) => {
  const { colors } = useTheme();

  if (type === 'attendance') {
    const getAttendanceStatusColor = (status: AttendanceStatus) => {
      switch (status) {
        case AttendanceStatus.PRESENT:
          return colors.present;
        case AttendanceStatus.HALF_DAY:
          return colors.halfDay;
        case AttendanceStatus.ABSENT:
          return colors.absent;
        default:
          return colors.onSurfaceVariant;
      }
    };

    return (
      <Chip
        compact={compact}
        style={[styles.chip, { backgroundColor: getAttendanceStatusColor(status as AttendanceStatus) }]}
        textStyle={styles.chipText}
      >
        {getStatusLabel(status as AttendanceStatus)}
      </Chip>
    );
  }

  // Employee status
  const getEmployeeStatusColor = (status: EmployeeStatus) => {
    switch (status) {
      case EmployeeStatus.ACTIVE:
        return colors.success;
      case EmployeeStatus.INACTIVE:
        return colors.error;
      default:
        return colors.onSurfaceVariant;
    }
  };

  const getEmployeeStatusLabel = (status: EmployeeStatus) => {
    switch (status) {
      case EmployeeStatus.ACTIVE:
        return t('employee.active');
      case EmployeeStatus.INACTIVE:
        return t('employee.inactive');
      default:
        return status;
    }
  };

  return (
    <Chip
      compact={compact}
      style={[styles.chip, { backgroundColor: getEmployeeStatusColor(status as EmployeeStatus) }]}
      textStyle={styles.chipText}
    >
      {getEmployeeStatusLabel(status as EmployeeStatus)}
    </Chip>
  );
};

const styles = StyleSheet.create({
  chip: {
    height: 24,
  },
  chipText: {
    fontSize: 10,
    color: '#fff',
  },
});
