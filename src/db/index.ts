import { drizzle } from 'drizzle-orm/libsql';
import { Env } from '../types';

export const db = (env: Env) => drizzle({ connection: {
  url: env.TURSO_CONNECTION_URL!,
  authToken: env.TURSO_AUTH_TOKEN!,
}});
