/**
 * Memories resource for the ConvoMem SDK.
 *
 * Manages customer memories — the core unit of the ConvoMem platform. Memories
 * are facts, preferences, and insights extracted from conversations. This
 * resource provides ingestion, lookup, and CRUD operations.
 *
 * @module
 */

import type { ConvoMemClient } from "../client.ts";
import type {
  Memory,
  MemoryAddRequest,
  MemoryContext,
  MemoryIngestRequest,
  MemoryListResponse,
  MemoryLookupParams,
  MemoryUpdateRequest,
} from "../types.ts";

function lookupQuery(params: MemoryLookupParams): Record<string, string> {
  const query: Record<string, string> = { topic: params.topic };
  for (
    const key of [
      "phone",
      "email",
      "externalId",
      "maxTokens",
      "limit",
      "threshold",
      "rerank",
      "latestOnly",
      "explain",
      "referenceDate",
      "includeAgentFacts",
      "verify",
    ] as const
  ) {
    const value = params[key];
    if (value !== undefined) query[key] = String(value);
  }
  return query;
}

/**
 * Resource class for managing customer memories.
 *
 * Memories are automatically extracted from conversations and can also be
 * added manually. They are searchable by topic, updatable, and injectable
 * into LLM context via the lookup endpoint.
 *
 * @example
 * ```ts
 * const client = new ConvoMemClient({ apiKey: "sk-org-abc" });
 *
 * // Add a memory directly
 * const memory = await client.memories.add("cust_abc123", {
 *   fact: "Prefers email over phone",
 *   category: "preference",
 * });
 *
 * // Look up memories by topic
 * const context = await client.memories.lookup("cust_abc123", { topic: "communication" });
 * console.log(context.context); // Pre-rendered context for LLM
 * ```
 */
export class MemoriesResource {
  #client: ConvoMemClient;

  /**
   * @internal
   * Instances are created automatically by {@link ConvoMemClient}.
   */
  constructor(client: ConvoMemClient) {
    this.#client = client;
  }

  /**
   * Ingest a completed conversation for asynchronous memory extraction.
   *
   * Submits conversation messages to the extraction pipeline. The API will
   * asynchronously analyze the messages and create memory records for any
   * facts, preferences, or insights discovered.
   *
   * @param customerId - The customer UUID to associate extracted memories with.
   * @param request - The ingestion request containing conversation messages and optional channel.
   * @param opts - Optional settings.
   * @param opts.signal - An {@link AbortSignal} to cancel the request.
   * @returns An object with the `captureId` and status `"queued"` confirming the ingestion was accepted.
   *
   * @example
   * ```ts
   * const result = await client.memories.ingest("cust_abc123", {
   *   messages: [
   *     { role: "user", content: "I prefer email over phone" },
   *     { role: "assistant", content: "Noted, I'll make sure we contact you via email." },
   *   ],
   *   channel: "CHAT",
   * });
   *
   * console.log(result.captureId); // "cap_xyz789"
   * console.log(result.status);    // "queued"
   * ```
   */
  async ingest(
    customerId: string,
    request: MemoryIngestRequest,
    opts?: { signal?: AbortSignal },
  ): Promise<{ captureId: string; status: "queued" }> {
    return await this.#client.request(
      "POST",
      `/customers/${customerId}/memories/ingest`,
      { body: request, signal: opts?.signal },
    );
  }

  /**
   * Look up relevant memories for a topic by customer ID.
   *
   * Retrieves memories scoped to a specific topic for the given customer.
   * Returns a pre-rendered context string suitable for LLM prompt injection,
   * along with the individual memory records and token count.
   *
   * @param customerId - The customer UUID.
   * @param params - Lookup parameters including the topic to search for.
   * @param opts - Optional settings.
   * @param opts.signal - An {@link AbortSignal} to cancel the request.
   * @returns A {@link MemoryContext} with the rendered context string, token count, and matching memories.
   *
   * @example
   * ```ts
   * const context = await client.memories.lookup("cust_abc123", {
   *   topic: "billing",
   * });
   *
   * console.log(context.context);    // "Customer has had 3 billing issues..."
   * console.log(context.tokenCount); // 142
   * console.log(context.memories);   // Array of Memory objects
   * ```
   */
  async lookup(
    customerId: string,
    params: MemoryLookupParams,
    opts?: { signal?: AbortSignal },
  ): Promise<MemoryContext> {
    return await this.#client.request<MemoryContext>(
      "GET",
      `/customers/${customerId}/memories/lookup`,
      { params: lookupQuery(params), signal: opts?.signal },
    );
  }

  /**
   * Look up relevant memories by customer identity (no UUID required).
   *
   * Resolves the customer from phone, email, or externalId, then retrieves
   * topic-scoped memories. Useful when you don't have the customer UUID
   * but have their contact information.
   *
   * @param params - Lookup parameters including the topic and at least one identity field (phone, email, or externalId).
   * @param opts - Optional settings.
   * @param opts.signal - An {@link AbortSignal} to cancel the request.
   * @returns A {@link MemoryContext} with the rendered context string, token count, and matching memories.
   *
   * @example
   * ```ts
   * const context = await client.memories.lookupByIdentity({
   *   topic: "preferences",
   *   email: "alice@example.com",
   * });
   *
   * console.log(context.memories.length); // 5
   * ```
   */
  async lookupByIdentity(
    params: MemoryLookupParams & {
      phone?: string;
      email?: string;
      externalId?: string;
    },
    opts?: { signal?: AbortSignal },
  ): Promise<MemoryContext> {
    const query = lookupQuery(params);

    return await this.#client.request<MemoryContext>(
      "GET",
      "/customers/memories/lookup",
      { params: query, signal: opts?.signal },
    );
  }

  /**
   * List all memories for a customer with pagination.
   *
   * Returns a paginated list of all memories associated with the given customer,
   * ordered by relevance or recency.
   *
   * @param customerId - The customer UUID.
   * @param opts - Optional pagination parameters.
   * @param opts.page - Page number (1-indexed). Defaults to 1.
   * @param opts.limit - Maximum number of memories per page. Defaults to API default.
   * @param opts.signal - An {@link AbortSignal} to cancel the request.
   * @returns A {@link MemoryListResponse} with the memory array, pagination metadata, and total count.
   *
   * @example
   * ```ts
   * const result = await client.memories.list("cust_abc123", { page: 1, limit: 10 });
   *
   * for (const memory of result.memories) {
   *   console.log(`${memory.category}: ${memory.content}`);
   * }
   * ```
   */
  async list(
    customerId: string,
    opts?: {
      page?: number;
      limit?: number;
      includeExpired?: boolean;
      asOf?: string;
      signal?: AbortSignal;
    },
  ): Promise<MemoryListResponse> {
    const params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.limit) params.limit = String(opts.limit);
    if (opts?.includeExpired !== undefined) {
      params.includeExpired = String(opts.includeExpired);
    }
    if (opts?.asOf) params.asOf = opts.asOf;

    const res = await this.#client.request<
      { memories: Memory[]; page: number; limit: number; total: number }
    >("GET", `/customers/${customerId}/memories`, {
      params,
      signal: opts?.signal,
    });

    return {
      memories: res.memories,
      page: res.page,
      limit: res.limit,
      total: res.total,
    };
  }

  /**
   * Update an existing customer memory.
   *
   * Partially updates the memory record. Only provided fields are changed;
   * omitted fields remain unchanged.
   *
   * @param customerId - The customer UUID.
   * @param memId - The memory UUID to update.
   * @param request - The update payload with fields to change (content, category).
   * @param opts - Optional settings.
   * @param opts.signal - An {@link AbortSignal} to cancel the request.
   * @returns The updated {@link Memory} record.
   *
   * @example
   * ```ts
   * await client.memories.update("cust_abc123", "mem_xyz789", {
   *   content: "Prefers email communication over phone calls",
   *   category: "preference",
   * });
   * ```
   */
  async update(
    customerId: string,
    memId: string,
    request: MemoryUpdateRequest,
    opts?: { signal?: AbortSignal },
  ): Promise<Memory> {
    return await this.#client.request<Memory>(
      "PATCH",
      `/customers/${customerId}/memories/${memId}`,
      { body: request, signal: opts?.signal },
    );
  }

  /**
   * Delete a customer memory permanently.
   *
   * @param customerId - The customer UUID.
   * @param memId - The memory UUID to delete.
   * @param opts - Optional settings.
   * @param opts.signal - An {@link AbortSignal} to cancel the request.
   * @returns A promise that resolves when the deletion is complete.
   *
   * @example
   * ```ts
   * await client.memories.delete("cust_abc123", "mem_xyz789");
   * ```
   */
  async delete(
    customerId: string,
    memId: string,
    opts?: { signal?: AbortSignal },
  ): Promise<void> {
    return await this.#client.request(
      "DELETE",
      `/customers/${customerId}/memories/${memId}`,
      { signal: opts?.signal },
    );
  }

  /**
   * Manually add a memory for a customer.
   *
   * Creates a new memory record directly without going through the extraction
   * pipeline. Use this for injecting known facts, preferences, or corrections.
   *
   * @param customerId - The customer UUID.
   * @param request - The memory payload with content text and optional category.
   * @param opts - Optional settings.
   * @param opts.signal - An {@link AbortSignal} to cancel the request.
   * @returns The newly created {@link Memory} record.
   *
   * @example
   * ```ts
   * const memory = await client.memories.add("cust_abc123", {
   *   content: "Customer is a VIP account holder",
   *   category: "status",
   * });
   *
   * console.log(memory.id); // "mem_new123"
   * ```
   */
  async add(
    customerId: string,
    request: MemoryAddRequest,
    opts?: { signal?: AbortSignal },
  ): Promise<Memory> {
    return await this.#client.request<Memory>(
      "POST",
      `/customers/${customerId}/memories`,
      { body: request, signal: opts?.signal },
    );
  }

  /**
   * Get a specific memory by ID.
   *
   * @param customerId - The customer UUID.
   * @param memId - The memory UUID.
   * @param opts - Optional settings.
   * @param opts.signal - An {@link AbortSignal} to cancel the request.
   * @returns The {@link Memory} record.
   *
   * @example
   * ```ts
   * const memory = await client.memories.get("cust_abc123", "mem_xyz789");
   *
   * console.log(memory.content);    // "Prefers email over phone"
   * console.log(memory.importance); // 0.8
   * ```
   */
  async get(
    customerId: string,
    memId: string,
    opts?: { signal?: AbortSignal },
  ): Promise<Memory> {
    return await this.#client.request<Memory>(
      "GET",
      `/customers/${customerId}/memories/${memId}`,
      { signal: opts?.signal },
    );
  }
}
