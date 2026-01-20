import React from 'react';
import { StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';
import { EmployeeStatus, AttendanceStatus } from '../../models';
import { getStatusColor, getStatusLabel } from '../../utils/attendanceUtils';
import { colors } from '../../constants/theme';
import { t } from '../../i18n';

interface StatusChipProps {
  type: 'employee' | 'attendance';
  status: EmployeeStatus | AttendanceStatus;
  compact?: boolean;
}

export const StatusChip: React.FC<StatusChipProps> = ({ type, status, compact = true }) => {
  if (type === 'attendance') {
    return (
      <Chip
        compact={compact}
        style={[styles.chip, { backgroundColor: getStatusColor(status as AttendanceStatus) }]}
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
        return colors.textLight;
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
