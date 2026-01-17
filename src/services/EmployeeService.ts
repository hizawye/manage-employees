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
    statusFilter?: EmployeeStatus,
    forceRefresh = false
  ): Promise<Employee[]> {
    const cacheKey = statusFilter || 'all';
    const now = Date.now();
    const cached = employeeCache.get(cacheKey);

    if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const data = await dbGetAllEmployees(statusFilter);
    employeeCache.set(cacheKey, { data, timestamp: now });
    return data;
  }

  /**
   * Get employee by ID
   * Uses separate cache for individual employees
   */
  static async getEmployeeById(id: string, forceRefresh = false): Promise<Employee | null> {
    const now = Date.now();
    const cached = singleEmployeeCache.get(id);

    if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const data = await dbGetEmployeeById(id);
    if (data) {
      singleEmployeeCache.set(id, { data, timestamp: now });
    }
    return data;
  }

  /**
   * Create a new employee
   * Clears cache after creation
   */
  static async createEmployee(input: CreateEmployeeInput): Promise<Employee> {
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

    const employee = await dbCreateEmployee(input);

    // Clear all caches after mutation
    this.clearCache();

    return employee;
  }

  /**
   * Update an existing employee
   * Clears cache after update
   */
  static async updateEmployee(id: string, input: UpdateEmployeeInput): Promise<void> {
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

    await dbUpdateEmployee(id, input);

    // Clear caches after mutation
    this.clearCache(id);
  }

  /**
   * Delete an employee
   * Clears cache after deletion
   */
  static async deleteEmployee(id: string): Promise<void> {
    await dbDeleteEmployee(id);

    // Clear caches after mutation
    this.clearCache(id);
  }

  /**
   * Search employees by name, phone, or role
   */
  static async searchEmployees(query: string): Promise<Employee[]> {
    if (!query.trim()) {
      return this.getAllEmployees();
    }
    return dbSearchEmployees(query);
  }

  /**
   * Clear cache for specific employee or all employees
   */
  static clearCache(employeeId?: string): void {
    if (employeeId) {
      singleEmployeeCache.delete(employeeId);
    }
    // Always clear list cache on any mutation
    employeeCache.clear();
  }
}
