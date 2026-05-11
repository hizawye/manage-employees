import React from 'react';
import { Badge } from '../ui/badge';
import { EmployeeStatus, AttendanceStatus } from '../../models';
import { getStatusLabel } from '../../utils/attendanceUtils';
import { t } from '../../i18n';

interface StatusChipProps {
  type: 'employee' | 'attendance';
  status: EmployeeStatus | AttendanceStatus;
  compact?: boolean;
}

export const StatusChip: React.FC<StatusChipProps> = ({ type, status }) => {
  if (type === 'attendance') {
    const variant =
      status === AttendanceStatus.PRESENT
        ? 'success'
        : status === AttendanceStatus.HALF_DAY
        ? 'warning'
        : status === AttendanceStatus.ABSENT
        ? 'destructive'
        : 'secondary';

    return (
      <Badge variant={variant}>
        {getStatusLabel(status as AttendanceStatus)}
      </Badge>
    );
  }

  const variant = status === EmployeeStatus.ACTIVE ? 'success' : 'destructive';
  const label = status === EmployeeStatus.ACTIVE ? t('employee.active') : t('employee.inactive');

  return (
    <Badge variant={variant}>
      {label}
    </Badge>
  );
};
