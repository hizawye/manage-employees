import * as Crypto from 'expo-crypto';
import { getDatabase } from '../index';
import { Log, CreateLogInput } from '../../models';

interface LogRow {
    id: string;
    user_id: number;
    action: string;
    description: string;
    entity_type: string | null;
    entity_id: string | null;
    details: string | null;
    created_at: string;
}

function mapRowToLog(row: LogRow): Log {
    return {
        id: row.id,
        userId: row.user_id,
        action: row.action,
        description: row.description,
        entityType: row.entity_type as any || undefined,
        entityId: row.entity_id || undefined,
        details: row.details || undefined,
        createdAt: row.created_at,
    };
}

export async function createLog(userId: number, input: CreateLogInput): Promise<Log> {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.runAsync(
        `INSERT INTO logs (id, user_id, action, description, entity_type, entity_id, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            userId,
            input.action,
            input.description,
            input.entityType || null,
            input.entityId || null,
            input.details || null,
            now,
        ]
    );

    return {
        ...input,
        id,
        userId,
        createdAt: now,
    };
}

export async function getLogs(
    userId: number,
    limit: number = 50,
    offset: number = 0,
    action?: string
): Promise<Log[]> {
    const db = await getDatabase();
    let query = 'SELECT * FROM logs WHERE user_id = ?';
    const params: (string | number)[] = [userId];

    if (action) {
        query += ' AND action = ?';
        params.push(action);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = await db.getAllAsync<LogRow>(query, params);
    return rows.map(mapRowToLog);
}

export async function clearLogs(userId: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM logs WHERE user_id = ?', [userId]);
}
