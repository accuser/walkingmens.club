/**
 * Cloudflare D1 Database type definitions
 */

export interface D1Database {
	prepare(query: string): D1PreparedStatement;
	batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
	exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
	bind(...values: unknown[]): D1PreparedStatement;
	first<T = unknown>(colName?: string): Promise<T | null>;
	run(): Promise<D1Result>;
	all<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Result<T = unknown> {
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

export interface D1ExecResult {
	count: number;
	duration: number;
}