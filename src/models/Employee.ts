export enum WageType {
  DAILY = 'daily',
  HOURLY = 'hourly',
}

export enum EmployeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  role: string;
  wageType: WageType;
  wageRate: number;
  joinDate: string;
  status: EmployeeStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateEmployeeInput = Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateEmployeeInput = Partial<Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>>;
