import { Payment, CreatePaymentInput } from '../models';
import {
  createPayment as dbCreatePayment,
  getPaymentsByEmployee as dbGetPaymentsByEmployee,
  getTotalPaidForPeriod as dbGetTotalPaidForPeriod,
  deletePayment as dbDeletePayment,
} from '../database/repositories';

export class PaymentService {
  /**
   * Record a payment for an employee
   */
  static async recordPayment(userId: number, input: CreatePaymentInput): Promise<Payment> {
    if (!input.employeeId) {
      throw new Error('Employee ID is required');
    }
    if (input.amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }
    if (!input.periodStart || !input.periodEnd) {
      throw new Error('Period start and end dates are required');
    }

    return dbCreatePayment(userId, input);
  }

  /**
   * Get payment history for an employee
   */
  static async getEmployeePayments(
    userId: number,
    employeeId: string,
    periodStart?: string,
    periodEnd?: string
  ): Promise<Payment[]> {
    return dbGetPaymentsByEmployee(userId, employeeId, periodStart, periodEnd);
  }

  /**
   * Get total amount already paid for a specific period
   */
  static async getPaidAmount(
    userId: number,
    employeeId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<number> {
    return dbGetTotalPaidForPeriod(userId, employeeId, periodStart, periodEnd);
  }

  /**
   * Check if an employee is fully paid for a period
   */
  static async isFullyPaid(
    userId: number,
    employeeId: string,
    periodStart: string,
    periodEnd: string,
    totalWage: number
  ): Promise<{ paid: number; remaining: number; isFullyPaid: boolean }> {
    const paid = await dbGetTotalPaidForPeriod(userId, employeeId, periodStart, periodEnd);
    const remaining = Math.max(0, totalWage - paid);
    return {
      paid,
      remaining,
      isFullyPaid: remaining <= 0,
    };
  }

  /**
   * Delete a payment record
   */
  static async deletePayment(userId: number, id: string): Promise<void> {
    await dbDeletePayment(userId, id);
  }
}
