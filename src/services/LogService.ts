import { Log, CreateLogInput } from '../models';
import { getLogs as dbGetLogs, createLog as dbCreateLog, clearLogs as dbClearLogs } from '../database/repositories';

export class LogService {
  static async getLogs(
    userId: number,
    limit: number = 50,
    offset: number = 0,
    action?: string
  ): Promise<Log[]> {
    return dbGetLogs(userId, limit, offset, action);
  }

  static async createLog(userId: number, input: CreateLogInput): Promise<Log> {
    return dbCreateLog(userId, input);
  }

  static async clearLogs(userId: number): Promise<void> {
    return dbClearLogs(userId);
  }
}
