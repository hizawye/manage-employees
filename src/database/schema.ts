export const CREATE_EMPLOYEES_TABLE = `
  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    role TEXT NOT NULL,
    wage_type TEXT NOT NULL CHECK(wage_type IN ('daily', 'hourly')),
    wage_rate REAL NOT NULL CHECK(wage_rate >= 0),
    join_date TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('active', 'inactive')),
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

export const CREATE_ATTENDANCE_TABLE = `
  CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'half_day')),
    hours_worked REAL CHECK(hours_worked >= 0),
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE(employee_id, date)
  );
`;

export const CREATE_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
  CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);
  CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
  CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
`;
