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
  CaptureStatusResponse,
  Conversation,
  ConversationListResponse,
  ConvoMemConfig,
  Customer,
  CustomerCreateRequest,
  CustomerIdentity,
  CustomerListResponse,
  CustomerLookupResponse,
  CustomerUpdateRequest,
  EmbedTokenResponse,
  HandoffResponse,
  HandoffRouteResponse,
  Memory,
  MemoryContext,
  MemoryListResponse,
  SocialHandle,
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
   * To close a conversation, set `endConversation` (or `escalate`) on the final
   * capture rather than calling {@link ConvoMem.endConversation} separately.
   * Capture persists the transcript in a background job, so closing in a second
   * call races analysis against that write — on a voice hang-up, where both
   * calls land together, the summary can be built from half a transcript.
   * Setting the flag here makes persist → close → analyse one ordered chain.
   *
   * @param messages - New turns since the last capture, in chronological order.
   * @param identity - Any one identifier (customerId, email, phone, externalId).
   * @param options - Channel, display name, social handles, and close-out flags.
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
   *
   * @example Close the conversation on the last turn
   * ```ts
   * await client.capture(
   *   [{ role: "assistant", content: "All sorted — anything else?" }],
   *   { phone: "+14155550101" },
   *   { channel: "VOICE", endConversation: true, outcome: "refund_issued" },
   * );
   * ```
   */
  async capture(
    messages: Array<{
      role: "user" | "assistant" | "agent" | "system";
      content: string;
      language?: string;
    }>,
    identity: CustomerIdentity,
    options?: {
      channel?: "VOICE" | "CHAT" | "SMS" | "EMAIL";
      userName?: string;
      /** Social handles as an additional identity signal. */
      socialHandles?: Array<string | SocialHandle>;
      /** Close the conversation as COMPLETED. Mutually exclusive with `escalate`. */
      endConversation?: boolean;
      /** Outcome recorded alongside `endConversation`. */
      outcome?: string;
      /** Close the conversation as ESCALATED. Mutually exclusive with `endConversation`. */
      escalate?: boolean;
      /** Reason recorded alongside `escalate`. */
      reason?: string;
      /** Deduplicate retries of the same capture for this agent (24h); changed payloads return 409. */
      idempotencyKey?: string;
      language?: string;
      occurredAt?: string;
      infer?: boolean;
      speakerId?: string;
      speakerName?: string;
    },
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

  /** Get queued, processing, completed, or failed state for a capture. */
  async getCaptureStatus(captureId: string): Promise<CaptureStatusResponse> {
    return await this.#http.getCaptureStatus(captureId);
  }

  // ── B. Memory Retrieval & Semantic Lookup ────────────────

  /**
   * Recall semantically relevant memories for a topic.
   *
   * Returns a pre-formatted `context` string ready for LLM injection plus
   * the individual memory records. Call this **before** generating a reply
   * so the model has up-to-date customer context.
   *
   * The returned `context` wraps the memory lines in a delimited block marked
   * as unverified caller statements. Inject it verbatim — the framing is what
   * stops a caller-authored "memory" from reading as an instruction to your
   * model. See the security notes in the docs before stripping it.
   *
   * @param topic - The user's current message or question. Drives semantic ranking.
   * @param identity - Any one identifier.
   * @param options - `autoCreate` registers the customer on first contact; `userName` backfills their name; `maxTokens` caps the context block.
   * @returns Pre-rendered context string, token count, and ranked memory records.
   *
   * @example
   * ```ts
   * const { context, memories, tokenCount } = await client.lookup(
   *   "preferred shipping method",
   *   { email: "alice@example.com" },
   *   { autoCreate: true, maxTokens: 400 },
   * );
   * ```
   */
  async lookup(
    topic: string,
    identity: CustomerIdentity,
    options?: {
      autoCreate?: boolean;
      userName?: string;
      /**
       * Token ceiling for the `context` block on this call only (50–4000,
       * clamped). Omit to use the agent's configured budget, then the default
       * of 800. A voice agent usually wants a tighter brief than an email one.
       */
      maxTokens?: number;
      limit?: number;
      threshold?: number;
      rerank?: boolean;
      latestOnly?: boolean;
      explain?: boolean;
      referenceDate?: string;
      includeAgentFacts?: boolean;
      verify?: boolean;
    },
  ): Promise<MemoryContext> {
    const params: Record<string, string> = { topic };
    if (identity.email) params.email = identity.email;
    if (identity.phone) params.phone = identity.phone;
    if (identity.externalId) params.externalId = identity.externalId;
    if (options?.autoCreate !== undefined) {
      params.autoCreate = String(options.autoCreate);
    }
    if (options?.userName) params.userName = options.userName;
    if (options) {
      for (
        const key of [
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
        const value = options[key];
        if (value !== undefined) params[key] = String(value);
      }
    }

    if (identity.customerId) {
      // The path route already identifies the customer, so only the tuning
      // params travel with it — but they must still travel, or a caller
      // passing customerId would silently lose their maxTokens.
      const pathParams: Record<string, string> = { ...params };
      delete pathParams.email;
      delete pathParams.phone;
      delete pathParams.externalId;
      delete pathParams.autoCreate;
      delete pathParams.userName;
      return await this.#http.request<MemoryContext>(
        "GET",
        `/customers/${identity.customerId}/memories/lookup`,
        { params: pathParams },
      );
    }
    return await this.#http.request<MemoryContext>(
      "GET",
      "/customers/memories/lookup",
      { params },
    );
  }

  /**
   * Recall context at the *start* of a conversation, before the customer has
   * said why they are calling.
   *
   * This is the cold open: the phone has rung and nobody knows yet what it is
   * about. Rather than the most recent facts, you get a call-opening brief —
   * any unresolved issue first (with its status and the latest internal agent
   * notes), a line if this is a repeat customer, then memories ranked on what
   * is knowable without a query: confidence and remaining strength.
   *
   * There is no embedding call and no vector search on this path, so it is
   * safe to run while the caller is still hearing the ring tone.
   *
   * @param identity - Any one identifier.
   * @param options - `autoCreate` registers the customer on first contact; `userName` backfills their name; `maxTokens` caps the context block.
   * @returns The customer profile, the brief, and the structured open issue if there is one.
   *
   * @example
   * ```ts
   * const { customer, context, openIssue } = await client.coldOpen(
   *   { phone: "+14155550101" },
   *   { autoCreate: true },
   * );
   *
   * if (openIssue) {
   *   console.log(`Still open: ${openIssue.summary} (${openIssue.reason})`);
   * }
   * ```
   */
  async coldOpen(
    identity: CustomerIdentity,
    options?: { autoCreate?: boolean; userName?: string; maxTokens?: number },
  ): Promise<CustomerLookupResponse> {
    const params: Record<string, string> = {};
    if (identity.customerId) params.customerId = identity.customerId;
    if (identity.email) params.email = identity.email;
    if (identity.phone) params.phone = identity.phone;
    if (identity.externalId) params.externalId = identity.externalId;
    if (options?.autoCreate !== undefined) {
      params.autoCreate = String(options.autoCreate);
    }
    if (options?.userName) params.userName = options.userName;
    if (options?.maxTokens !== undefined) {
      params.maxTokens = String(options.maxTokens);
    }

    return await this.#http.request<CustomerLookupResponse>(
      "GET",
      "/customers/lookup",
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
    options?: {
      page?: number;
      limit?: number;
      category?: string;
      includeExpired?: boolean;
      asOf?: string;
    },
  ): Promise<MemoryListResponse> {
    const params: Record<string, string> = {};
    if (options?.page) params.page = String(options.page);
    if (options?.limit) params.limit = String(options.limit);
    if (options?.category) params.category = options.category;
    if (options?.includeExpired !== undefined) {
      params.includeExpired = String(options.includeExpired);
    }
    if (options?.asOf) params.asOf = options.asOf;

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
    options?: { category?: string; expiresAt?: string | null },
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
    data: { content?: string; category?: string; expiresAt?: string | null },
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
    return await this.#http.request<Customer>("POST", "/customers", {
      body: data,
    });
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
    sortBy?:
      | "name"
      | "memories"
      | "conversations"
      | "recent"
      | "created"
      | "sentiment";
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
    if (options?.minMemories !== undefined) {
      params.minMemories = String(options.minMemories);
    }
    if (options?.maxMemories !== undefined) {
      params.maxMemories = String(options.maxMemories);
    }
    if (options?.from) params.from = options.from;
    if (options?.to) params.to = options.to;
    return await this.#http.request<CustomerListResponse>("GET", "/customers", {
      params,
    });
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
    const res = await this.#http.request<
      { customer: Customer | null; found: boolean }
    >(
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
   * `metadata` replaces the stored metadata object; send every key you want to keep.
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
    options: {
      channel: "VOICE" | "CHAT" | "SMS" | "EMAIL";
      metadata?: Record<string, unknown>;
    },
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
   * @param options - `fresh` bypasses the cached brief (24 hours by default); `narrative: false` skips the LLM summary.
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
    if (options?.narrative !== undefined) {
      params.narrative = String(options.narrative);
    }

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
  // ── F. Handoff routing ───────────────────────────────────

  /**
   * Resolve where a live transfer for this customer should go.
   *
   * Answers the question a voice platform asks mid-call: the customer wants a
   * human, which one? The judgement itself was made offline when their last
   * conversation ended (or, with real-time routing enabled on the agent, on the
   * last mid-call capture), so this is a single indexed read with no LLM work
   * on the call path.
   *
   * **This call never fails.** A voice platform treats a resolver error as a
   * failed transfer, which strands a caller — so an unknown customer, a missing
   * decision, or an internal failure all degrade to the agent's default
   * destination instead of throwing. Read `source` to see which tier answered:
   * `memory` is a real per-customer decision, `default` is the fallback.
   *
   * @param identity - Any one identifier.
   * @param options - `format: "dograh"` returns Dograh's `transfer_context` shape instead of the generic one.
   * @returns The destination to transfer to, plus which tier chose it and why.
   *
   * @example
   * ```ts
   * const { destination, source, reasoning } = await client.routeHandoff({
   *   phone: "+14155550101",
   * });
   *
   * if (destination) {
   *   await telephony.transfer(destination.value, destination.transferMessage);
   * }
   * ```
   */
  async routeHandoff(
    identity: CustomerIdentity,
    options?: { format?: "generic" | "dograh" },
  ): Promise<HandoffRouteResponse> {
    return await this.#http.request<HandoffRouteResponse>(
      "POST",
      "/handoff/route",
      {
        params: options?.format ? { format: options.format } : undefined,
        body: {
          customerId: identity.customerId,
          externalId: identity.externalId,
          email: identity.email,
          phone: identity.phone,
        },
      },
    );
  }

  async createEmbedToken(
    identity: CustomerIdentity,
    options?: { ttlSeconds?: number },
  ): Promise<EmbedTokenResponse> {
    return await this.#http.request<EmbedTokenResponse>(
      "POST",
      "/embed/tokens",
      {
        body: {
          customerId: identity.customerId,
          externalId: identity.externalId,
          email: identity.email,
          phone: identity.phone,
          ...options,
        },
      },
    );
  }
}
