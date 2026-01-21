export enum LogActionType {
    // Employee Actions
    CREATE_EMPLOYEE = 'create_employee',
    UPDATE_EMPLOYEE = 'update_employee',
    DELETE_EMPLOYEE = 'delete_employee',

    // Attendance Actions
    MARK_ATTENDANCE = 'mark_attendance',
    UPDATE_ATTENDANCE = 'update_attendance',
    DELETE_ATTENDANCE = 'delete_attendance',
}

export interface Log {
    id: string;
    userId: number;
    action: LogActionType | string;
    description: string;
    entityType?: 'employee' | 'attendance';
    entityId?: string;
    details?: string; // JSON string for extra details (e.g. diffs)
    createdAt: string;
}

export interface CreateLogInput {
    action: LogActionType | string;
    description: string;
    entityType?: 'employee' | 'attendance';
    entityId?: string;
    details?: string;
}
