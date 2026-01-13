import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM dd, yyyy');
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM dd');
}

export function toISODateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getTodayString(): string {
  return toISODateString(new Date());
}

export function getWeekRange(date: Date = new Date()): { start: string; end: string } {
  return {
    start: toISODateString(startOfWeek(date, { weekStartsOn: 1 })),
    end: toISODateString(endOfWeek(date, { weekStartsOn: 1 })),
  };
}

export function getMonthRange(date: Date = new Date()): { start: string; end: string } {
  return {
    start: toISODateString(startOfMonth(date)),
    end: toISODateString(endOfMonth(date)),
  };
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
