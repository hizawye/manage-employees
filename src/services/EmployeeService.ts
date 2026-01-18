import { Employee, CreateEmployeeInput, UpdateEmployeeInput, EmployeeStatus } from '../models';
import {
  getAllEmployees as dbGetAllEmployees,
  getEmployeeById as dbGetEmployeeById,
  createEmployee as dbCreateEmployee,
  updateEmployee as dbUpdateEmployee,
  deleteEmployee as dbDeleteEmployee,
  searchEmployees as dbSearchEmployees,
} from '../database/repositories';

// Cache for employees
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const employeeCache = new Map<string, CacheEntry<Employee[]>>();
const singleEmployeeCache = new Map<string, CacheEntry<Employee>>();

export class EmployeeService {
  /**
   * Get all employees with optional status filter
   * Uses cache with 5-minute TTL
   */
  static async getAllEmployees(
    userId: number,
    statusFilter?: EmployeeStatus,
    forceRefresh = false
  ): Promise<Employee[]> {
    const cacheKey = `${userId}-${statusFilter || 'all'}`;
    const now = Date.now();
    const cached = employeeCache.get(cacheKey);

    if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const data = await dbGetAllEmployees(userId, statusFilter);
    employeeCache.set(cacheKey, { data, timestamp: now });
    return data;
  }

  /**
   * Get employee by ID
   * Uses separate cache for individual employees
   */
  static async getEmployeeById(userId: number, id: string, forceRefresh = false): Promise<Employee | null> {
    const cacheKey = `${userId}-${id}`;
    const now = Date.now();
    const cached = singleEmployeeCache.get(cacheKey);

    if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const data = await dbGetEmployeeById(userId, id);
    if (data) {
      singleEmployeeCache.set(cacheKey, { data, timestamp: now });
    }
    return data;
  }

  /**
   * Create a new employee
   * Clears cache after creation
   */
  static async createEmployee(userId: number, input: CreateEmployeeInput): Promise<Employee> {
    // Validation
    if (!input.name?.trim()) {
      throw new Error('Employee name is required');
    }
    if (!input.phone?.trim()) {
      throw new Error('Employee phone is required');
    }
    if (!input.role?.trim()) {
      throw new Error('Employee role is required');
    }
    if (input.wageRate <= 0) {
      throw new Error('Wage rate must be greater than 0');
    }

    const employee = await dbCreateEmployee(userId, input);

    // Clear all caches after mutation
    this.clearCache(userId);

    return employee;
  }

  /**
   * Update an existing employee
   * Clears cache after update
   */
  static async updateEmployee(userId: number, id: string, input: UpdateEmployeeInput): Promise<void> {
    // Validation
    if (input.name !== undefined && !input.name.trim()) {
      throw new Error('Employee name cannot be empty');
    }
    if (input.phone !== undefined && !input.phone.trim()) {
      throw new Error('Employee phone cannot be empty');
    }
    if (input.role !== undefined && !input.role.trim()) {
      throw new Error('Employee role cannot be empty');
    }
    if (input.wageRate !== undefined && input.wageRate <= 0) {
      throw new Error('Wage rate must be greater than 0');
    }

    await dbUpdateEmployee(userId, id, input);

    // Clear caches after mutation
    this.clearCache(userId, id);
  }

  /**
   * Delete an employee
   * Clears cache after deletion
   */
  static async deleteEmployee(userId: number, id: string): Promise<void> {
    await dbDeleteEmployee(userId, id);

    // Clear caches after mutation
    this.clearCache(userId, id);
  }

  /**
   * Search employees by name, phone, or role
   */
  static async searchEmployees(userId: number, query: string): Promise<Employee[]> {
    if (!query.trim()) {
      return this.getAllEmployees(userId);
    }
    return dbSearchEmployees(userId, query);
  }

  /**
   * Clear cache for specific employee or all employees
   */
  static clearCache(userId: number, employeeId?: string): void {
    if (employeeId) {
      // Clear cache for this specific user-employee combination
      singleEmployeeCache.delete(`${userId}-${employeeId}`);
    }
    // Clear list caches for this user
    for (const key of employeeCache.keys()) {
      if (key.startsWith(`${userId}-`)) {
        employeeCache.delete(key);
      }
    }
  }
}
