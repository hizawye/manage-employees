export type LogCategory = 'employee' | 'attendance' | 'payroll';

export enum LogActionType {
    CREATE_PAYMENT = 'create_payment',
    DELETE_PAYMENT = 'delete_payment',
    CREATE_ADJUSTMENT = 'create_adjustment',
    UPDATE_ADJUSTMENT = 'update_adjustment',
    DELETE_ADJUSTMENT = 'delete_adjustment',
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
    entityType?: LogCategory;
    entityId?: string;
    details?: string; // JSON string for extra details (e.g. diffs)
    createdAt: string;
}

export interface CreateLogInput {
    action: LogActionType | string;
    description: string;
    entityType?: LogCategory;
    entityId?: string;
    details?: string;
}
