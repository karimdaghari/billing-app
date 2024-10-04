import type { z } from "@hono/zod-openapi";
import {
	CustomerSchema,
	SubscriptionPlanSchema,
	InvoiceSchema,
	PaymentSchema,
} from "./schema";

// Define a type for the KV namespace
interface KVNamespace {
	get: (key: string) => Promise<string | null>;
	put: (key: string, value: string) => Promise<void>;
	delete: (key: string) => Promise<void>;
	list: (options?: {
		prefix?: string;
		limit?: number;
		cursor?: string;
	}) => Promise<{
		keys: { name: string }[];
		list_complete: boolean;
		cursor?: string;
	}>;
}

// Define a type for our schemas
type SchemaType = "customer" | "subscriptionPlan" | "invoice" | "payment";

// Define a mapping of schema types to their respective Zod schemas
const entitySchemaMap = {
	customer: CustomerSchema,
	subscriptionPlan: SubscriptionPlanSchema,
	invoice: InvoiceSchema,
	payment: PaymentSchema,
} as const;

// Infer the type of each schema
type EntityTypeMap = {
	[K in keyof typeof entitySchemaMap]: z.infer<(typeof entitySchemaMap)[K]>;
};

// Create a type for input that excludes the 'id' field
type InputType<T> = Omit<T, "id">;

// Unified KV operations class
export class KVDB {
	private prefixes: Record<SchemaType, string> = {
		customer: "customer:",
		subscriptionPlan: "subscription_plan:",
		invoice: "invoice:",
		payment: "payment:",
	};

	constructor(private namespace: KVNamespace) {}

	private getPrefix(type: SchemaType): string {
		return this.prefixes[type];
	}

	private validateSchema<T extends SchemaType>(type: T, data: unknown) {
		const schema = entitySchemaMap[type];
		return schema.parse(data) as EntityTypeMap[T];
	}

	/**
	 * Get all items of a specific type, optionally filtered by IDs
	 *
	 * @param type - The type of items to retrieve
	 * @param ids - An optional array of IDs to filter the items by
	 * @returns A promise that resolves to an array of items of the specified type
	 */
	async getAll<T extends SchemaType>(type: T): Promise<EntityTypeMap[T][]> {
		const prefix = this.getPrefix(type);
		const { keys } = await this.namespace.list({ prefix });
		const promises = keys.map((key) => this.namespace.get(key.name));
		const results = await Promise.all(promises);
		return results
			.filter((item): item is string => item !== null)
			.map((item) => this.validateSchema(type, JSON.parse(item)));
	}

	/**
	 * Get a single item by type and ID
	 *
	 * @param type - The type of item to retrieve
	 * @param id - The ID of the item to retrieve
	 * @returns A promise that resolves to the item of the specified type, or null if not found
	 */
	async get<T extends SchemaType>(
		type: T,
		id: string,
	): Promise<EntityTypeMap[T] | null> {
		const key = `${this.getPrefix(type)}${id}`;
		const result = await this.namespace.get(key);
		if (!result) return null;
		return this.validateSchema(type, JSON.parse(result));
	}

	/**
	 * Insert a new item
	 *
	 * @param type - The type of item to insert
	 * @param input - The item to insert
	 */
	async insert<T extends SchemaType>(
		type: T,
		input: InputType<EntityTypeMap[T]>,
	): Promise<string> {
		const id = crypto.randomUUID();
		const item = { ...input, id };
		const validatedItem = this.validateSchema(type, item);
		const key = `${this.getPrefix(type)}${id}`;
		const value = JSON.stringify(validatedItem);
		await this.namespace.put(key, value);
		return id;
	}

	/**
	 * Delete an item by type and ID
	 *
	 * @param type - The type of item to delete
	 * @param id - The ID of the item to delete
	 */
	async delete<T extends SchemaType>(type: T, id: string): Promise<void> {
		const key = `${this.getPrefix(type)}${id}`;
		await this.namespace.delete(key);
	}

	/**
	 * Update an existing item
	 *
	 * @param type - The type of item to update
	 * @param id - The ID of the item to update
	 * @param input - The updates to apply to the item
	 *
	 * @example const updatedCustomer = await db.update("customer", "123", { name: "John Doe" });
	 */
	async update<T extends SchemaType>(
		type: T,
		id: string,
		input: Partial<InputType<EntityTypeMap[T]>>,
	): Promise<EntityTypeMap[T]> {
		const key = `${this.getPrefix(type)}${id}`;
		const existingItem = await this.get(type, id);
		if (!existingItem) {
			throw new Error(`Item with ID ${id} not found`);
		}
		const updatedItem = { ...existingItem, ...input };
		const validatedItem = this.validateSchema(type, updatedItem);
		await this.namespace.put(key, JSON.stringify(validatedItem));
		return {
			...validatedItem,
			id,
		};
	}
}

export type DBClient = KVDB;
