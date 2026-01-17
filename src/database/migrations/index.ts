export interface Migration {
  version: number;
  name: string;
  up: (db: any) => Promise<void>;
}

export const migrations: Migration[] = [];
