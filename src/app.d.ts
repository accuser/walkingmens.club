// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

// Cloudflare D1 Database types
interface D1Database {
	prepare(query: string): D1PreparedStatement;
	batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
	exec(query: string): Promise<D1ExecResult>;
}

interface D1PreparedStatement {
	bind(...values: unknown[]): D1PreparedStatement;
	first<T = unknown>(colName?: string): Promise<T | null>;
	run(): Promise<D1Result>;
	all<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Result<T = unknown> {
	results?: T[];
	success: boolean;
	error?: string;
	meta: {
		duration: number;
		size_after: number;
		rows_read: number;
		rows_written: number;
		last_row_id: number;
		changed_db: boolean;
		changes: number;
	};
}

interface D1ExecResult {
	count: number;
	duration: number;
}

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user?: import('$lib/auth').AdminUser;
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				DB: D1Database;
			};
		}
	}
}

export {};
