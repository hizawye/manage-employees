import { Payment, CreatePaymentInput } from '../models';
import {
  createPayment,
  getPaymentsByEmployee,
  getTotalPaidForPeriod,
  deletePayment,
} from '../database/repositories';
import { isCurrencyAmount, toCentimes } from '../utils/money';
import { isPayrollDate } from '../utils/payrollDate';

export function getPaymentBalance(totalWage: number, paid: number) {
  const remaining = (Math.max(0, toCentimes(totalWage)) - toCentimes(paid)) / 100;
  return {
    paid,
    remaining,
    isFullyPaid: paid > 0 && remaining <= 0,
    isOverpaid: remaining < 0,
    overpaidAmount: Math.max(0, -remaining),
  };
}

// Repository history is newest first. Attribute excess to the payments that crossed
// or followed settlement, using the balance at each payment in chronological order.
export function getPaymentHistoryBalance(totalWage: number, payments: Payment[]) {
  const payableCentimes = Math.max(0, toCentimes(totalWage));
  let paidCentimes = 0;
  const overpaidPaymentIds = new Set<string>();
  for (let i = payments.length - 1; i >= 0; i--) {
    paidCentimes += toCentimes(payments[i].amount);
    if (paidCentimes > payableCentimes) overpaidPaymentIds.add(payments[i].id);
  }
  return { ...getPaymentBalance(totalWage, paidCentimes / 100), overpaidPaymentIds };
}

export class PaymentService {
  static async recordPayment(userId: number, input: CreatePaymentInput): Promise<Payment> {
    if (!input.employeeId) throw new Error('Employee ID is required');
    if (!isCurrencyAmount(input.amount) || input.amount <= 0) {
      throw new Error('Payment must be a positive amount in whole centimes');
    }
    if (!isPayrollDate(input.periodStart) || !isPayrollDate(input.periodEnd) ||
        !isPayrollDate(input.paymentDate) || input.periodStart > input.periodEnd) {
      throw new Error('Invalid payment date or payroll period');
    }
    return createPayment(userId, input);
  }

  static getEmployeePayments = getPaymentsByEmployee;
  static getPaidAmount = getTotalPaidForPeriod;
  static deletePayment = deletePayment;

  static async isFullyPaid(
    userId: number, employeeId: string, periodStart: string, periodEnd: string, totalWage: number
  ) {
    const paid = await getTotalPaidForPeriod(userId, employeeId, periodStart, periodEnd);
    return getPaymentBalance(totalWage, paid);
  }
}
