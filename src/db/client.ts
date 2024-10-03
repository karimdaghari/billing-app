import type { z } from "@hono/zod-openapi";
import {
	CustomerSchema,
	CustomerInput,
	SubscriptionPlanSchema,
	SubscriptionPlanInput,
	InvoiceSchema,
	InvoiceInput,
	PaymentSchema,
	PaymentInput,
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

// Define a mapping of schema types to their respective Zod schemas and inputs
const entitySchemaMap = {
	customer: { schema: CustomerSchema, input: CustomerInput },
	subscriptionPlan: {
		schema: SubscriptionPlanSchema,
		input: SubscriptionPlanInput,
	},
	invoice: { schema: InvoiceSchema, input: InvoiceInput },
	payment: { schema: PaymentSchema, input: PaymentInput },
} as const;

// Infer the type of each schema and input
type EntityTypeMap = {
	[K in keyof typeof entitySchemaMap]: {
		schema: z.infer<(typeof entitySchemaMap)[K]["schema"]>;
		input: z.infer<(typeof entitySchemaMap)[K]["input"]>;
	};
};

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

	private validateSchema<T extends SchemaType>(
		type: T,
		data: unknown,
		isInput = false,
	) {
		const schema = isInput
			? entitySchemaMap[type].input
			: entitySchemaMap[type].schema;
		return schema.parse(data) as EntityTypeMap[T][typeof isInput extends true
			? "input"
			: "schema"];
	}

	/**
	 * Get all items of a specific type, optionally filtered by IDs
	 *
	 * @param type - The type of items to retrieve
	 * @param ids - An optional array of IDs to filter the items by
	 * @returns A promise that resolves to an array of items of the specified type
	 */
	async getAll<T extends SchemaType>(
		type: T,
		ids?: string[],
	): Promise<{
		success: boolean;
		data: EntityTypeMap[T]["schema"][] | null;
	}> {
		const prefix = this.getPrefix(type);
		try {
			if (ids && ids.length > 0) {
				const promises = ids.map((id) => this.get(type, id));
				const results = await Promise.all(promises);
				const data = results
					.filter(
						(
							item,
						): item is { success: true; data: EntityTypeMap[T]["schema"] } =>
							item.success && item.data !== null,
					)
					.map((item) => item.data);
				return {
					success: true,
					data,
				};
			}

			const { keys } = await this.namespace.list({ prefix });
			const promises = keys.map((key) => this.namespace.get(key.name));
			const results = await Promise.all(promises);
			const data = results
				.filter((item): item is string => item !== null)
				.map((item) => this.validateSchema(type, JSON.parse(item)));
			return {
				success: true,
				data,
			};
		} catch (error) {
			return {
				success: false,
				data: null,
			};
		}
	}

	/**
	 * Get a single item by type and ID
	 *
	 * @param type - The type of item to retrieve
	 * @param id - The ID of the item to retrieve
	 * @returns A promise that resolves to the item of the specified type, or null if not found
	 */
	async get<T extends SchemaType>(type: T, id: string) {
		const key = `${this.getPrefix(type)}${id}`;
		const result = await this.namespace.get(key);
		try {
			if (!result)
				return {
					success: true,
					data: null,
				};
			const data = this.validateSchema(type, JSON.parse(result));
			return {
				success: true,
				data,
			};
		} catch (error) {
			return {
				success: false,
				data: null,
			};
		}
	}

	/**
	 * Insert a new item
	 *
	 * @param type - The type of item to insert
	 * @param input - The item to insert
	 */
	async insert<T extends SchemaType>(
		type: T,
		input: EntityTypeMap[T]["input"],
	): Promise<{
		success: boolean;
		data: EntityTypeMap[T]["schema"] | null;
	}> {
		const validatedItem = this.validateSchema(type, input, true);
		const id = crypto.randomUUID();
		const key = `${this.getPrefix(type)}${id}`;
		try {
			await this.namespace.put(key, JSON.stringify(validatedItem));
			return await this.get(type, id);
		} catch (error) {
			return {
				success: false,
				data: null,
			};
		}
	}

	/**
	 * Delete an item by type and ID
	 *
	 * @param type - The type of item to delete
	 * @param id - The ID of the item to delete
	 */
	async delete<T extends SchemaType>(
		type: T,
		id: string,
	): Promise<{
		success: boolean;
		data: EntityTypeMap[T]["schema"] | null;
	}> {
		const key = `${this.getPrefix(type)}${id}`;
		try {
			await this.namespace.delete(key);
			return {
				success: true,
				data: null,
			};
		} catch (error) {
			return {
				success: false,
				data: null,
			};
		}
	}

	/**
	 * Update an existing item
	 *
	 * @param type - The type of item to update
	 * @param id - The ID of the item to update
	 * @param input - The updates to apply to the item
	 *
	 * @example const res = await db.update("customer", "123", { name: "John Doe" });
	 */
	async update<T extends SchemaType>(
		type: T,
		id: string,
		input: Partial<EntityTypeMap[T]["input"]>,
	): Promise<{
		success: boolean;
		data: EntityTypeMap[T]["schema"] | null;
	}> {
		try {
			const key = `${this.getPrefix(type)}${id}`;
			const existingItem = await this.get(type, id);
			if (!existingItem) {
				throw new Error(`Item with ID ${id} not found`);
			}
			const updatedItem = { ...existingItem, ...input };
			const validatedItem = this.validateSchema(type, updatedItem);
			await this.namespace.put(key, JSON.stringify(validatedItem));
			return await this.get(type, id);
		} catch (error) {
			return {
				success: false,
				data: null,
			};
		}
	}
}
