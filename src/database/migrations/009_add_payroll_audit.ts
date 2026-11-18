import type { Migration } from './index';

// The audit insert shares the transaction that changed the payment or adjustment.
function auditTrigger(table: 'payments' | 'wage_adjustments', event: 'INSERT' | 'UPDATE' | 'DELETE', action: string) {
  const row = event === 'DELETE' ? 'OLD' : 'NEW';
  const fields = table === 'payments'
    ? `'periodStart', ${row}.period_start, 'periodEnd', ${row}.period_end`
    : `'date', ${row}.date`;
  const previous = event === 'UPDATE' ? ", 'previousAmount', OLD.amount" : '';
  const changed = event === 'UPDATE' ? 'WHEN OLD.amount IS NOT NEW.amount OR OLD.note IS NOT NEW.note' : '';
  return `
    CREATE TRIGGER IF NOT EXISTS audit_${action} AFTER ${event} ON ${table} ${changed}
    BEGIN
      INSERT INTO logs (id, user_id, action, description, entity_type, entity_id, details, created_at)
      SELECT lower(hex(randomblob(16))), ${row}.user_id, '${action}', '${action}', 'payroll', ${row}.id,
        json_object('employeeName', name, 'amount', ${row}.amount, ${fields}${previous}),
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      FROM employees WHERE id = ${row}.employee_id AND user_id = ${row}.user_id;
    END;
  `;
}

export const addPayrollAudit: Migration = {
  version: 9,
  name: 'add_payroll_audit',
  async up(db) {
    await db.execAsync([
      'CREATE INDEX IF NOT EXISTS idx_logs_owner_date ON logs(user_id, created_at DESC, id DESC);',
      'CREATE INDEX IF NOT EXISTS idx_logs_owner_type_date ON logs(user_id, entity_type, created_at DESC, id DESC);',
      auditTrigger('payments', 'INSERT', 'create_payment'),
      auditTrigger('payments', 'DELETE', 'delete_payment'),
      auditTrigger('wage_adjustments', 'INSERT', 'create_adjustment'),
      auditTrigger('wage_adjustments', 'UPDATE', 'update_adjustment'),
      auditTrigger('wage_adjustments', 'DELETE', 'delete_adjustment'),
    ].join('\n'));
  },
};
