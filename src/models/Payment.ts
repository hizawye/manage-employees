export interface Payment {
  id: string;
  userId: number;
  employeeId: string;
  amount: number;
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
  notes?: string;
  createdAt: string;
}

export type CreatePaymentInput = Omit<Payment, 'id' | 'createdAt'>;

export interface PaymentSummary {
  employeeId: string;
  employeeName: string;
  totalWage: number;
  totalPaid: number;
  remaining: number;
  isFullyPaid: boolean;
}
