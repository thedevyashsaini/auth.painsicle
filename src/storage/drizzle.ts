import { eq, like } from 'drizzle-orm';
import { joinKey, splitKey, StorageAdapter } from '@openauthjs/openauth/storage/storage'; // Adjust the import path as needed
import { LibSQLDatabase } from 'drizzle-orm/libsql';
import { SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core/table';
import { SQLiteColumn } from 'drizzle-orm/sqlite-core/columns/common';

export type SQLKVTable<TableName extends string> = SQLiteTableWithColumns<{
	name: TableName;
	schema: any;
	columns: {
		key: SQLiteColumn<
			{
				name: 'key';
				tableName: TableName;
				dataType: 'string';
				columnType: 'SQLiteText';
				data: string;
				driverParam: string;
				notNull: true;
				hasDefault: false;
				isPrimaryKey: true;
				isAutoincrement: false;
				hasRuntimeDefault: false;
				enumValues: any;
				generated: undefined;
			},
			{},
			{}
		>;
		value: SQLiteColumn<
			{
				name: 'value';
				tableName: TableName;
				dataType: 'string';
				columnType: 'SQLiteText';
				data: string;
				driverParam: string;
				notNull: true;
				hasDefault: false;
				isPrimaryKey: false;
				isAutoincrement: false;
				hasRuntimeDefault: false;
				enumValues: any;
				generated: undefined;
			},
			{},
			{}
		>;
		expiry: SQLiteColumn<
			{
				name: 'expiry';
				tableName: TableName;
				dataType: 'number';
				columnType: 'SQLiteInteger';
				data: number;
				driverParam: number;
				notNull: true;
				hasDefault: false;
				isPrimaryKey: false;
				isAutoincrement: false;
				hasRuntimeDefault: false;
				enumValues: any;
				generated: undefined;
			},
			{},
			{}
		>;
	};
	dialect: 'sqlite';
}>;

interface DrizzleStorageOptions {
	db: LibSQLDatabase;
	KVtable: SQLKVTable<any>;
}

export function DrizzleStorage(options: DrizzleStorageOptions): StorageAdapter {
	const { db, KVtable } = options;

	return {
		async get(key: string[]) {
			const result = await db
				.select()
				.from(KVtable)
				.where(eq(KVtable.key, joinKey(key)))
				.get();
			if (!result) {
				console.log(`Key not found: ${joinKey(key)}`);
				return;
			}
			if (result.expiry && result.expiry < Math.floor(Date.now() / 1000)) {
				console.log(`Key expired: ${joinKey(key)}`);
				return;
			}
			console.log(`Key found: ${joinKey(key)}, Value: ${result.value}`);
			return JSON.parse(result.value) as Record<string, any>;
		},

		async set(key: string[], value: any, expiry?: Date) {
			const expiryTimestamp = expiry ? Math.floor(expiry.getTime() / 1000) : 0;
			console.log(`Setting key: ${joinKey(key)}, Value: ${JSON.stringify(value)}, Expiry: ${expiryTimestamp}`);
			await db.insert(KVtable).values({
				key: joinKey(key),
				value: JSON.stringify(value),
				expiry: expiryTimestamp,
			});
		},

		async remove(key: string[]) {
			console.log(`Removing key: ${joinKey(key)}`);
			await db
				.delete(KVtable)
				.where(eq(KVtable.key, joinKey(key)))
				.execute();
		},

		async *scan(prefix: string[]) {
			const prefixString = joinKey([...prefix, '']);
			const results = await db
				.select()
				.from(KVtable)
				.where(like(KVtable.key, `${prefixString}%`))
				.all();
			for (const result of results) {
				console.log(`Scanning key: ${result.key}, Value: ${result.value}`);
				yield [splitKey(result.key), JSON.parse(result.value)];
			}
		},
	};
}
