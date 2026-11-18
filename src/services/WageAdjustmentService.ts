import { CreateWageAdjustmentInput, WageAdjustment } from '../models';
import {
  getWageAdjustmentsByEmployee as dbGetWageAdjustmentsByEmployee,
  upsertWageAdjustment as dbUpsertWageAdjustment,
} from '../database/repositories';
import { clearWageCache } from './WageCalculationService';
import { isCurrencyAmount } from '../utils/money';
import { isPayrollDate } from '../utils/payrollDate';

export class WageAdjustmentService {
  static async saveAdjustment(userId: number, input: CreateWageAdjustmentInput): Promise<WageAdjustment> {
    if (!input.employeeId) {
      throw new Error('Employee ID is required');
    }
    if (!isPayrollDate(input.date)) {
      throw new Error('Date is required');
    }
    if (!isCurrencyAmount(input.amount)) {
      throw new Error('Adjustment amount must be a valid number');
    }

    const adjustment = await dbUpsertWageAdjustment(userId, input);
    clearWageCache(userId, input.employeeId);
    return adjustment;
  }

  static async getAdjustmentsByEmployee(
    userId: number,
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<WageAdjustment[]> {
    return dbGetWageAdjustmentsByEmployee(userId, employeeId, startDate, endDate);
  }
}
