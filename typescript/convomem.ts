/**
 * ConvoMem flat API client — the primary SDK entry point.
 *
 * Implements the method-based interface defined in the SDK API specification.
 * Each method routes to the correct REST endpoint based on whether a
 * `customerId` UUID is provided (path-based route) or only a flat identity
 * field (`email`, `phone`, `externalId`) is available (flat route resolved
 * server-side — no client-side lookup round-trip).
 *
 * @module
 */

import type {
  CaptureResponse,
  Conversation,
  ConversationListResponse,
  ConvoMemConfig,
  Customer,
  CustomerCreateRequest,
  CustomerIdentity,
  CustomerListResponse,
  CustomerStats,
  CustomerUpdateRequest,
  EmbedTokenResponse,
  HandoffResponse,
  Memory,
  MemoryContext,
  MemoryListResponse,
  MergeCandidate,
} from "./types.ts";
import { ConvoMemClient } from "./client.ts";

const DEFAULT_TIMEOUT = 10_000;
const DEFAULT_MAX_RETRIES = 3;

/**
 * The primary ConvoMem API client.
 *
 * Exposes all integration-scope endpoints as flat methods. Identity is
 * resolved server-side — pass `customerId` for the most direct route, or
 * any of `email`, `phone`, `externalId` and the server will resolve the
 * customer automatically.
 *
 * @example
 * ```ts
 * import { ConvoMem } from "convomem";
 *
 * const client = new ConvoMem({ apiKey: process.env.CONVOMEM_API_KEY });
 *
 * // Recall context before replying
 * const { context } = await client.lookup("billing question", { email: "alice@example.com" });
 *
 * // … generate reply using context …
 *
 * // Capture the exchange
 * await client.capture(
 *   [{ role: "user", content: "What's my invoice total?" }, { role: "assistant", content: "…" }],
 *   { email: "alice@example.com" },
 *   { channel: "CHAT" },
 * );
 * ```
 */
export class ConvoMem {
  readonly #http: ConvoMemClient;

  /**
   * Creates a new ConvoMem flat-API client.
   *
   * Internally delegates to {@link ConvoMemClient} with a default 10s timeout
   * and 3 retries. Pass a custom fetch, timeout, or retry policy via `config`.
   *
   * @param config - Configuration options (at minimum requires `apiKey`).
   */
  constructor(config: ConvoMemConfig) {
    this.#http = new ConvoMemClient({
      timeout: DEFAULT_TIMEOUT,
      maxRetries: DEFAULT_MAX_RETRIES,
      ...config,
    });
  }

  // ── A. Memory Ingestion & Extraction ────────────────────

  /**
   * Capture conversation turns for background memory extraction.
   *
   * Resolves customer identity, finds or creates an active session for the
   * channel, and enqueues the turns for asynchronous extraction. Fire-and-
   * forget — extracted facts become searchable a few seconds after this
   * call returns.
   *
   * Send turns **verbatim** — do not filter, summarize, or skip turns you
   * consider "unimportant". Let ConvoMem's pipeline decide what to extract.
   *
   * @param messages - New turns since the last capture, in chronological order.
   * @param identity - Any one identifier (customerId, email, phone, externalId).
   * @param options - Optional channel and display name.
   * @returns Session context with conversationId, customerId, and new-record flags.
   *
   * @example
   * ```ts
   * await client.capture(
   *   [
   *     { role: "user", content: "I want to cancel my subscription." },
   *     { role: "assistant", content: "I can help with that. May I ask why?" },
   *   ],
   *   { email: "alice@example.com" },
   *   { channel: "CHAT", userName: "Alice" },
   * );
   * ```
   */
  async capture(
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    identity: CustomerIdentity,
    options?: { channel?: "VOICE" | "CHAT" | "SMS" | "EMAIL"; userName?: string },
  ): Promise<CaptureResponse> {
    return await this.#http.request<CaptureResponse>("POST", "/capture", {
      body: {
        messages,
        customerId: identity.customerId,
        externalId: identity.externalId,
        email: identity.email,
        phoneNumber: identity.phone,
        ...options,
      },
    });
  }

  // ── B. Memory Retrieval & Semantic Lookup ────────────────

  /**
   * Recall semantically relevant memories for a topic.
   *
   * Returns a pre-formatted `context` string ready for LLM injection plus
   * the individual memory records. Call this **before** generating a reply
   * so the model has up-to-date customer context.
   *
   * @param topic - The user's current message or question. Drives semantic ranking.
   * @param identity - Any one identifier.
   * @param options - `autoCreate` registers the customer on first contact; `userName` backfills their name.
   * @returns Pre-rendered context string, token count, and ranked memory records.
   *
   * @example
   * ```ts
   * const { context, memories, tokenCount } = await client.lookup(
   *   "preferred shipping method",
   *   { email: "alice@example.com" },
   *   { autoCreate: true },
   * );
   * ```
   */
  async lookup(
    topic: string,
    identity: CustomerIdentity,
    options?: { autoCreate?: boolean; userName?: string },
  ): Promise<MemoryContext> {
    const params: Record<string, string> = { topic };
    if (identity.customerId) params.customerId = identity.customerId;
    if (identity.email) params.email = identity.email;
    if (identity.phone) params.phone = identity.phone;
    if (identity.externalId) params.externalId = identity.externalId;
    if (options?.autoCreate !== undefined) params.autoCreate = String(options.autoCreate);
    if (options?.userName) params.userName = options.userName;

    if (identity.customerId) {
      return await this.#http.request<MemoryContext>(
        "GET",
        `/customers/${identity.customerId}/memories/lookup`,
        { params: { topic } },
      );
    }
    return await this.#http.request<MemoryContext>(
      "GET",
      "/customers/memories/lookup",
      { params },
    );
  }

  /**
   * List all stored memories for a customer with pagination.
   *
   * @param identity - Any one identifier.
   * @param options - Pagination and category filter.
   * @returns Paginated list of memory records.
   *
   * @example
   * ```ts
   * const { memories, total } = await client.listMemories(
   *   { customerId: "cust_abc123" },
   *   { page: 1, limit: 20 },
   * );
   * ```
   */
  async listMemories(
    identity: CustomerIdentity,
    options?: { page?: number; limit?: number; category?: string },
  ): Promise<MemoryListResponse> {
    const params: Record<string, string> = {};
    if (options?.page) params.page = String(options.page);
    if (options?.limit) params.limit = String(options.limit);
    if (options?.category) params.category = options.category;

    if (identity.customerId) {
      return await this.#http.request<MemoryListResponse>(
        "GET",
        `/customers/${identity.customerId}/memories`,
        { params },
      );
    }
    if (identity.email) params.email = identity.email;
    if (identity.phone) params.phone = identity.phone;
    if (identity.externalId) params.externalId = identity.externalId;
    return await this.#http.request<MemoryListResponse>(
      "GET",
      "/customers/memories",
      { params },
    );
  }

  // ── C. Manual Memory Manipulation ────────────────────────

  /**
   * Manually add a memory fact for a customer.
   *
   * Written synchronously to the database and vector store — available for
   * recall immediately, unlike `capture` which extracts asynchronously.
   * Use for injecting known facts, corrections, or CRM data.
   *
   * @param content - The memory text to store.
   * @param identity - Any one identifier.
   * @param options - Optional category (normalized server-side; unknown values fall back to `context`).
   * @returns The created memory record.
   *
   * @example
   * ```ts
   * const memory = await client.addMemory(
   *   "Dislikes automatic subscription renewals",
   *   { email: "alice@example.com" },
   *   { category: "preference" },
   * );
   * ```
   */
  async addMemory(
    content: string,
    identity: CustomerIdentity,
    options?: { category?: string },
  ): Promise<Memory> {
    if (identity.customerId) {
      return await this.#http.request<Memory>(
        "POST",
        `/customers/${identity.customerId}/memories`,
        { body: { content, ...options } },
      );
    }
    return await this.#http.request<Memory>("POST", "/customers/memories", {
      body: {
        content,
        ...options,
        email: identity.email,
        phone: identity.phone,
        externalId: identity.externalId,
      },
    });
  }

  /**
   * Update an existing memory (content or category).
   *
   * Requires `identity.customerId` — path-based route only.
   *
   * @param memoryId - UUID of the memory to update.
   * @param data - Fields to change.
   * @param identity - Must include `customerId`.
   * @returns The updated memory record.
   *
   * @example
   * ```ts
   * const updated = await client.updateMemory(
   *   "mem-uuid-1234",
   *   { category: "pain_point" },
   *   { customerId: "cust-uuid-5678" },
   * );
   * ```
   */
  async updateMemory(
    memoryId: string,
    data: { content?: string; category?: string },
    identity: CustomerIdentity,
  ): Promise<Memory> {
    if (!identity.customerId) {
      throw new Error("updateMemory requires identity.customerId");
    }
    return await this.#http.request<Memory>(
      "PATCH",
      `/customers/${identity.customerId}/memories/${memoryId}`,
      { body: data },
    );
  }

  /**
   * Permanently delete a memory.
   *
   * Requires `identity.customerId` — path-based route only.
   *
   * @param memoryId - UUID of the memory to delete.
   * @param identity - Must include `customerId`.
   *
   * @example
   * ```ts
   * await client.deleteMemory("mem-uuid-1234", { customerId: "cust-uuid-5678" });
   * ```
   */
  async deleteMemory(
    memoryId: string,
    identity: CustomerIdentity,
  ): Promise<void> {
    if (!identity.customerId) {
      throw new Error("deleteMemory requires identity.customerId");
    }
    return await this.#http.request<void>(
      "DELETE",
      `/customers/${identity.customerId}/memories/${memoryId}`,
    );
  }

  // ── D. Customer Profile Management ───────────────────────

  /**
   * Create a new customer profile.
   *
   * At least one of `email`, `phone`, or `externalId` is required.
   *
   * @param data - Customer fields.
   * @returns The created customer record.
   *
   * @example
   * ```ts
   * const customer = await client.createCustomer({
   *   name: "John Doe",
   *   email: "john@example.com",
   *   metadata: { plan: "Premium" },
   * });
   * ```
   */
  async createCustomer(data: CustomerCreateRequest): Promise<Customer> {
    return await this.#http.request<Customer>("POST", "/customers", { body: data });
  }

  /**
   * List customers with pagination and filtering.
   *
   * @param options - Pagination and sort options.
   * @returns Paginated list of customer records.
   *
   * @example
   * ```ts
   * const { data, total } = await client.listCustomers({ page: 1, limit: 50 });
   * ```
   */
  async listCustomers(options?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: "name" | "memories" | "conversations" | "recent" | "created" | "sentiment";
    sortOrder?: "asc" | "desc";
    sentiment?: "positive" | "neutral" | "negative";
    minMemories?: number;
    maxMemories?: number;
    from?: string;
    to?: string;
  }): Promise<CustomerListResponse> {
    const params: Record<string, string> = {};
    if (options?.page) params.page = String(options.page);
    if (options?.limit) params.limit = String(options.limit);
    if (options?.search) params.search = options.search;
    if (options?.sortBy) params.sortBy = options.sortBy;
    if (options?.sortOrder) params.sortOrder = options.sortOrder;
    if (options?.sentiment) params.sentiment = options.sentiment;
    if (options?.minMemories !== undefined) params.minMemories = String(options.minMemories);
    if (options?.maxMemories !== undefined) params.maxMemories = String(options.maxMemories);
    if (options?.from) params.from = options.from;
    if (options?.to) params.to = options.to;
    return await this.#http.request<CustomerListResponse>("GET", "/customers", { params });
  }

  /**
   * Get a single customer profile.
   *
   * Uses `GET /customers/:id` when `customerId` is provided, or
   * `GET /customers/lookup` for flat identity fields.
   *
   * @param identity - Any one identifier.
   * @returns The customer record.
   *
   * @example
   * ```ts
   * const customer = await client.getCustomer({ email: "john@example.com" });
   * ```
   */
  async getCustomer(identity: CustomerIdentity): Promise<Customer> {
    if (identity.customerId) {
      return await this.#http.request<Customer>(
        "GET",
        `/customers/${identity.customerId}`,
      );
    }
    const params: Record<string, string> = {};
    if (identity.email) params.email = identity.email;
    if (identity.phone) params.phone = identity.phone;
    if (identity.externalId) params.externalId = identity.externalId;
    const res = await this.#http.request<{ customer: Customer | null; found: boolean }>(
      "GET",
      "/customers/lookup",
      { params },
    );
    if (!res.found || !res.customer) {
      throw new Error("Customer not found");
    }
    return res.customer;
  }

  /**
   * Update an existing customer profile.
   *
   * Uses `PATCH /customers/:id` (UUID) or `PATCH /customers` (flat identity in body).
   * Metadata is merged with existing values.
   *
   * @param identity - Any one identifier.
   * @param data - Fields to update.
   * @returns The updated customer record.
   *
   * @example
   * ```ts
   * const updated = await client.updateCustomer(
   *   { customerId: "uuid-123" },
   *   { metadata: { plan: "VIP" } },
   * );
   * ```
   */
  async updateCustomer(
    identity: CustomerIdentity,
    data: CustomerUpdateRequest,
  ): Promise<Customer> {
    if (identity.customerId) {
      return await this.#http.request<Customer>(
        "PATCH",
        `/customers/${identity.customerId}`,
        { body: data },
      );
    }
    return await this.#http.request<Customer>("PATCH", "/customers", {
      body: {
        ...data,
        email: identity.email,
        phone: identity.phone,
        externalId: identity.externalId,
      },
    });
  }

  /**
   * Delete a customer and all their conversations and memories.
   *
   * **Irreversible.** Uses `DELETE /customers/:id` (UUID) or
   * `DELETE /customers?email=…` (flat query).
   *
   * @param identity - Any one identifier.
   *
   * @example
   * ```ts
   * await client.deleteCustomer({ customerId: "uuid-123" });
   * ```
   */
  async deleteCustomer(identity: CustomerIdentity): Promise<void> {
    if (identity.customerId) {
      return await this.#http.request<void>(
        "DELETE",
        `/customers/${identity.customerId}`,
      );
    }
    const params: Record<string, string> = {};
    if (identity.email) params.email = identity.email;
    if (identity.phone) params.phone = identity.phone;
    if (identity.externalId) params.externalId = identity.externalId;
    return await this.#http.request<void>("DELETE", "/customers", { params });
  }

  /**
   * List customer profiles flagged as potential duplicates.
   *
   * @returns Array of merge candidate pairs.
   *
   * @example
   * ```ts
   * const candidates = await client.listMergeCandidates();
   * ```
   */
  async listMergeCandidates(): Promise<MergeCandidate[]> {
    return await this.#http.request<MergeCandidate[]>(
      "GET",
      "/customers/merge-candidates",
    );
  }

  /**
   * Dismiss a merge candidate as a false positive.
   *
   * @param customerId - Primary customer UUID.
   * @param candidateId - Candidate customer UUID.
   *
   * @example
   * ```ts
   * await client.dismissMergeCandidate("cust-1", "cust-2");
   * ```
   */
  async dismissMergeCandidate(
    customerId: string,
    candidateId: string,
  ): Promise<void> {
    return await this.#http.request<void>(
      "POST",
      `/customers/${customerId}/merge-candidates/${candidateId}/dismiss`,
    );
  }

  /**
   * Return aggregate customer statistics for the organization.
   *
   * @param options - Optional ISO date range filter (`from`, `to`).
   * @returns Org-wide stats: counts, averages, sentiment breakdown.
   *
   * @example
   * ```ts
   * const stats = await client.getStats({ from: "2026-01-01" });
   * ```
   */
  async getStats(options?: { from?: string; to?: string }): Promise<CustomerStats> {
    const params: Record<string, string> = {};
    if (options?.from) params.from = options.from;
    if (options?.to) params.to = options.to;
    return await this.#http.request<CustomerStats>(
      "GET",
      "/customers/stats",
      { params },
    );
  }

  // ── E. Conversation Session Management ───────────────────

  /**
   * Start an active conversation session.
   *
   * Uses `POST /customers/:id/conversations` (UUID) or
   * `POST /customers/conversations` (flat identity in body).
   *
   * @param identity - Any one identifier.
   * @param options - Channel (required) and optional metadata.
   * @returns The created conversation with `status: "ACTIVE"`.
   *
   * @example
   * ```ts
   * const conversation = await client.startConversation(
   *   { email: "john@example.com" },
   *   { channel: "VOICE" },
   * );
   * ```
   */
  async startConversation(
    identity: CustomerIdentity,
    options: { channel: "VOICE" | "CHAT" | "SMS" | "EMAIL"; metadata?: Record<string, unknown> },
  ): Promise<Conversation> {
    if (identity.customerId) {
      return await this.#http.request<Conversation>(
        "POST",
        `/customers/${identity.customerId}/conversations`,
        { body: options },
      );
    }
    return await this.#http.request<Conversation>(
      "POST",
      "/customers/conversations",
      {
        body: {
          ...options,
          email: identity.email,
          phone: identity.phone,
          externalId: identity.externalId,
        },
      },
    );
  }

  /**
   * End a conversation session.
   *
   * Uses the path-based `PATCH` when `conversationId` is provided alongside
   * `identity.customerId`; falls back to the flat `POST /customers/conversations/end`
   * for all other identity forms.
   *
   * Capture the final turns with `capture()` **before** calling this.
   *
   * @param conversationId - Conversation UUID (required for path-based form).
   * @param identity - Any one identifier.
   * @param options - Optional one-line outcome summary.
   *
   * @example
   * ```ts
   * await client.endConversation("conv-123", { customerId: "cust-456" }, {
   *   outcome: "Resolved billing problem",
   * });
   * ```
   */
  async endConversation(
    conversationId: string | null,
    identity: CustomerIdentity,
    options?: { outcome?: string },
  ): Promise<void> {
    if (conversationId && identity.customerId) {
      return await this.#http.request<void>(
        "PATCH",
        `/customers/${identity.customerId}/conversations/${conversationId}`,
        { body: options },
      );
    }
    return await this.#http.request<void>(
      "POST",
      "/customers/conversations/end",
      {
        body: {
          customerId: identity.customerId,
          conversationId,
          email: identity.email,
          phone: identity.phone,
          externalId: identity.externalId,
          outcome: options?.outcome,
        },
      },
    );
  }

  /**
   * Escalate a conversation to a human agent.
   *
   * Call when the user requests a person, is frustrated, or the request is
   * out of scope. Pair with `getHandoff()` so the human has full context.
   *
   * @param conversationId - Conversation UUID.
   * @param identity - Any one identifier.
   * @param options - Short reason for escalation (≤500 chars).
   *
   * @example
   * ```ts
   * await client.escalateConversation("conv-123", { customerId: "cust-456" }, {
   *   reason: "Angry customer requesting manager",
   * });
   * ```
   */
  async escalateConversation(
    conversationId: string | null,
    identity: CustomerIdentity,
    options?: { reason?: string },
  ): Promise<void> {
    if (conversationId && identity.customerId) {
      return await this.#http.request<void>(
        "PATCH",
        `/customers/${identity.customerId}/conversations/${conversationId}/escalate`,
        { body: options },
      );
    }
    return await this.#http.request<void>(
      "POST",
      "/customers/conversations/escalate",
      {
        body: {
          customerId: identity.customerId,
          conversationId,
          email: identity.email,
          phone: identity.phone,
          externalId: identity.externalId,
          reason: options?.reason,
        },
      },
    );
  }

  /**
   * List a customer's conversations with pagination.
   *
   * @param identity - Any one identifier.
   * @param options - Pagination and status filter.
   * @returns Paginated list of conversation records (most recent first).
   *
   * @example
   * ```ts
   * const { conversations, total } = await client.listConversations(
   *   { email: "john@example.com" },
   *   { status: "COMPLETED", limit: 50 },
   * );
   * ```
   */
  async listConversations(
    identity: CustomerIdentity,
    options?: {
      page?: number;
      limit?: number;
      status?: "ACTIVE" | "COMPLETED" | "ESCALATED" | "ABANDONED";
    },
  ): Promise<ConversationListResponse> {
    const params: Record<string, string> = {};
    if (options?.page) params.page = String(options.page);
    if (options?.limit) params.limit = String(options.limit);
    if (options?.status) params.status = options.status;

    if (identity.customerId) {
      return await this.#http.request<ConversationListResponse>(
        "GET",
        `/customers/${identity.customerId}/conversations`,
        { params },
      );
    }
    if (identity.email) params.email = identity.email;
    if (identity.phone) params.phone = identity.phone;
    if (identity.externalId) params.externalId = identity.externalId;
    return await this.#http.request<ConversationListResponse>(
      "GET",
      "/customers/conversations",
      { params },
    );
  }

  // ── F. Human Agent Handoff & Embeds ──────────────────────

  /**
   * Generate a cross-channel handoff briefing for a human agent.
   *
   * Returns the customer's full journey, key memories, sentiment trend,
   * open-issue detection, and an AI-written narrative. Call immediately
   * before transferring to a human.
   *
   * @param identity - Any one identifier.
   * @param options - `fresh` bypasses the 10-min cache; `narrative: false` skips the LLM summary.
   * @returns Structured briefing with journey, memories, sentiment, and narrative.
   *
   * @example
   * ```ts
   * const handoff = await client.getHandoff({ email: "john@example.com" }, { fresh: true });
   * ```
   */
  async getHandoff(
    identity: CustomerIdentity,
    options?: { fresh?: boolean; narrative?: boolean },
  ): Promise<HandoffResponse> {
    const params: Record<string, string> = {};
    if (options?.fresh !== undefined) params.fresh = String(options.fresh);
    if (options?.narrative !== undefined) params.narrative = String(options.narrative);

    if (identity.customerId) {
      return await this.#http.request<HandoffResponse>(
        "GET",
        `/customers/${identity.customerId}/handoff`,
        { params },
      );
    }
    if (identity.email) params.email = identity.email;
    if (identity.phone) params.phone = identity.phone;
    if (identity.externalId) params.externalId = identity.externalId;
    return await this.#http.request<HandoffResponse>(
      "GET",
      "/customers/handoff",
      { params },
    );
  }

  /**
   * Mint a short-lived read-only embed token for the ConvoMem agent panel.
   *
   * Generate server-side and pass to the browser. Never expose your org API key
   * to the client — use this token instead.
   *
   * @param identity - Any one identifier.
   * @param options - `ttlSeconds` defaults to 3600 (range: 60–86400).
   * @returns Token string, expiry, and scope.
   *
   * @example
   * ```ts
   * const { token, expiresIn } = await client.createEmbedToken(
   *   { email: "john@example.com" },
   *   { ttlSeconds: 7200 },
   * );
   * // Embed: https://app.convomem.com/embed/agent-panel?token=<token>
   * ```
   */
  async createEmbedToken(
    identity: CustomerIdentity,
    options?: { ttlSeconds?: number },
  ): Promise<EmbedTokenResponse> {
    return await this.#http.request<EmbedTokenResponse>("POST", "/embed/tokens", {
      body: {
        customerId: identity.customerId,
        externalId: identity.externalId,
        email: identity.email,
        phone: identity.phone,
        ...options,
      },
    });
  }
}
