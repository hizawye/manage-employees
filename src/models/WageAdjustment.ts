export interface WageAdjustment {
  id: string;
  userId: number;
  employeeId: string;
  date: string;
  amount: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateWageAdjustmentInput = Omit<WageAdjustment, 'id' | 'createdAt' | 'updatedAt'>;
