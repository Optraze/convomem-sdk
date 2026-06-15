/**
 * Customers resource for the ConvoMem SDK.
 *
 * Manages customer identity records, lookups, and cross-channel agent handoff.
 * Customers are the central identity entity in ConvoMem — all conversations,
 * memories, and insights are linked to a customer record.
 *
 * @module
 */

import type { ConvoMemClient } from "../client.ts";
import type {
  Customer,
  CustomerCreateRequest,
  CustomerListResponse,
  CustomerLookupParams,
  CustomerLookupResponse,
  CustomerUpdateRequest,
  HandoffParams,
  HandoffResponse,
} from "../types.ts";

/**
 * Resource class for managing customer records and handoff context.
 *
 * Provides CRUD operations for customers, identity-based lookup with optional
 * auto-creation, and cross-channel agent handoff briefing generation.
 *
 * @example
 * ```ts
 * const client = new ConvoMemClient({ apiKey: "sk-org-abc" });
 *
 * // Create a customer
 * const customer = await client.customers.create({
 *   name: "Alice Johnson",
 *   email: "alice@example.com",
 * });
 *
 * // Look up with memory context
 * const lookup = await client.customers.lookup({ email: "alice@example.com", topic: "billing" });
 * ```
 */
export class CustomersResource {
  #client: ConvoMemClient;

  constructor(client: ConvoMemClient) {
    this.#client = client;
  }

  /**
   * Lookup a customer by identifier with optional semantic memory retrieval.
   *
   * Resolves a customer from any of the provided identifiers (customerId, phone,
   * email, or externalId). Optionally retrieves topic-scoped memories and renders
   * them as context for LLM injection. Can auto-create the customer if not found.
   *
   * @param params - Lookup parameters including customer identifiers, topic, and auto-create flag.
   * @returns A {@link CustomerLookupResponse} with the matched customer, associated memories, and pre-rendered context.
   *
   * @example
   * ```ts
   * // Basic lookup by email
   * const result = await client.customers.lookup({ email: "alice@example.com" });
   *
   * // Lookup with topic-scoped memory and auto-create
   * const result = await client.customers.lookup({
   *   phone: "+1-555-0123",
   *   topic: "order_status",
   *   autoCreate: "true",
   *   userName: "New User",
   * });
   *
   * if (result.found) {
   *   console.log(result.context); // Pre-rendered memory context for LLM
   * }
   * ```
   */
  async lookup(params: CustomerLookupParams): Promise<CustomerLookupResponse> {
    const query: Record<string, string> = {};
    if (params.customerId) query.customerId = params.customerId;
    if (params.phone) query.phone = params.phone;
    if (params.email) query.email = params.email;
    if (params.externalId) query.externalId = params.externalId;
    if (params.topic) query.topic = params.topic;
    if (params.autoCreate) query.autoCreate = params.autoCreate;
    if (params.userName) query.userName = params.userName;

    return await this.#client.request<CustomerLookupResponse>(
      "GET",
      "/customers/lookup",
      { params: query },
    );
  }

  /**
   * Create a new customer record.
   *
   * Creates a new customer identity in the ConvoMem platform. The customer
   * can be identified by email, phone, externalId, or any combination thereof.
   *
   * @param request - The customer creation payload with name, email, phone, externalId, and optional metadata.
   * @returns The newly created {@link Customer} record.
   *
   * @example
   * ```ts
   * const customer = await client.customers.create({
   *   name: "Alice Johnson",
   *   email: "alice@example.com",
   *   phone: "+1-555-0123",
   *   metadata: { plan: "enterprise", source: "web" },
   * });
   *
   * console.log(customer.id); // "cust_abc123"
   * ```
   */
  async create(request: CustomerCreateRequest): Promise<Customer> {
    return await this.#client.request<Customer>("POST", "/customers", {
      body: request,
    });
  }

  /**
   * List customers with pagination.
   *
   * Returns a paginated list of all customers in the organization.
   *
   * @param opts - Optional pagination parameters.
   * @param opts.page - Page number (1-indexed). Defaults to 1.
   * @param opts.limit - Maximum number of customers per page. Defaults to API default.
   * @returns A {@link CustomerListResponse} with the customer array, pagination metadata, and total count.
   *
   * @example
   * ```ts
   * // List first page
   * const page1 = await client.customers.list();
   *
   * // Paginate
   * const page2 = await client.customers.list({ page: 2, limit: 25 });
   *
   * console.log(`Showing ${page2.customers.length} of ${page2.total} customers`);
   * ```
   */
  async list(opts?: {
    page?: number;
    limit?: number;
  }): Promise<CustomerListResponse> {
    const params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.limit) params.limit = String(opts.limit);

    const res = await this.#client.request<
      { data: Customer[]; page: number; limit: number; total: number }
    >("GET", "/customers", { params });

    return {
      customers: res.data,
      page: res.page,
      limit: res.limit,
      total: res.total,
    };
  }

  /**
   * Get a single customer by their unique ID.
   *
   * @param id - The customer UUID.
   * @returns The {@link Customer} record.
   *
   * @example
   * ```ts
   * const customer = await client.customers.get("cust_abc123");
   *
   * console.log(customer.name);       // "Alice Johnson"
   * console.log(customer.memoryCount); // 14
   * ```
   */
  async get(id: string): Promise<Customer> {
    return await this.#client.request<Customer>("GET", `/customers/${id}`);
  }

  /**
   * Update an existing customer record.
   *
   * Partially updates the customer. Only provided fields are changed;
   * omitted fields remain unchanged. Metadata is merged with existing values.
   *
   * @param id - The customer UUID.
   * @param request - The update payload with fields to change.
   * @returns The updated {@link Customer} record.
   *
   * @example
   * ```ts
   * const updated = await client.customers.update("cust_abc123", {
   *   name: "Alice J.",
   *   metadata: { plan: "pro" },
   * });
   * ```
   */
  async update(id: string, request: CustomerUpdateRequest): Promise<Customer> {
    return await this.#client.request<Customer>("PATCH", `/customers/${id}`, {
      body: request,
    });
  }

  /**
   * Permanently delete a customer and all associated data.
   *
   * This operation is irreversible. All conversations, memories, and insights
   * linked to this customer will also be removed.
   *
   * @param id - The customer UUID to delete.
   * @returns A promise that resolves when the deletion is complete.
   *
   * @example
   * ```ts
   * await client.customers.delete("cust_abc123");
   * ```
   */
  async delete(id: string): Promise<void> {
    return await this.#client.request<void>("DELETE", `/customers/${id}`);
  }

  /**
   * Generate a cross-channel agent handoff briefing.
   *
   * Produces a structured briefing that helps a new agent quickly understand
   * the customer's history, sentiment, key memories, and open issues. The
   * customer is resolved from any of the provided identifiers.
   *
   * @param params - Handoff parameters including customer identifiers and options for narrative/fresh generation.
   * @returns A {@link HandoffResponse} with the customer record, journey, key memories, sentiment trend, and optional narrative.
   *
   * @example
   * ```ts
   * const handoff = await client.customers.handoff({
   *   email: "alice@example.com",
   *   narrative: "true",
   *   fresh: "true",
   * });
   *
   * console.log(handoff.narrative); // LLM-generated summary
   * console.log(handoff.journey);   // Conversation history
   * ```
   */
  async handoff(params: HandoffParams): Promise<HandoffResponse> {
    const query: Record<string, string> = {};
    if (params.customerId) query.customerId = params.customerId;
    if (params.phone) query.phone = params.phone;
    if (params.email) query.email = params.email;
    if (params.externalId) query.externalId = params.externalId;
    if (params.narrative) query.narrative = params.narrative;
    if (params.fresh) query.fresh = params.fresh;

    return await this.#client.request<HandoffResponse>(
      "GET",
      "/customers/handoff",
      {
        params: query,
      },
    );
  }

  /**
   * Generate a cross-channel agent handoff briefing by customer ID.
   *
   * Convenience method that accepts a customer UUID directly instead of
   * identity-based lookup parameters.
   *
   * @param id - The customer UUID.
   * @param opts - Optional handoff options.
   * @param opts.narrative - Whether to include an LLM-generated narrative summary (`"true"` or `"false"`).
   * @param opts.fresh - Whether to generate a fresh (non-cached) summary (`"true"` or `"false"`).
   * @returns A {@link HandoffResponse} with the customer record, journey, key memories, sentiment trend, and optional narrative.
   *
   * @example
   * ```ts
   * const handoff = await client.customers.handoffById("cust_abc123", {
   *   narrative: "true",
   *   fresh: "false",
   * });
   *
   * console.log(handoff.openIssue.isOpen); // false
   * ```
   */
  async handoffById(
    id: string,
    opts?: { narrative?: "true" | "false"; fresh?: "true" | "false" },
  ): Promise<HandoffResponse> {
    const params: Record<string, string> = {};
    if (opts?.narrative) params.narrative = opts.narrative;
    if (opts?.fresh) params.fresh = opts.fresh;

    return await this.#client.request<HandoffResponse>(
      "GET",
      `/customers/${id}/handoff`,
      { params },
    );
  }
}
