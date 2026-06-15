/**
 * Conversations resource for the ConvoMem SDK.
 *
 * Manages the lifecycle of customer conversations — starting, listing, ending,
 * and escalating conversations across channels (VOICE, CHAT, SMS, EMAIL).
 *
 * @module
 */

import type { ConvoMemClient } from "../client.ts";
import type {
  Conversation,
  ConversationEndRequest,
  ConversationEndResponse,
  ConversationEscalateRequest,
  ConversationEscalateResponse,
  ConversationListResponse,
} from "../types.ts";

/**
 * Resource class for managing customer conversations.
 *
 * Conversations track interactions across communication channels and are linked
 * to customers. Each conversation follows a lifecycle from ACTIVE through
 * COMPLETED, ESCALATED, or ABANDONED.
 *
 * @example
 * ```ts
 * const client = new ConvoMemClient({ apiKey: "sk-org-abc" });
 *
 * // Start a new conversation
 * const conv = await client.conversations.start("cust_abc123", "CHAT");
 *
 * // End the conversation
 * await client.conversations.end("cust_abc123", conv.id, { outcome: "resolved" });
 * ```
 */
export class ConversationsResource {
  #client: ConvoMemClient;

  constructor(client: ConvoMemClient) {
    this.#client = client;
  }

  /**
   * Start a new conversation for a customer.
   *
   * Creates a new conversation record in ACTIVE status for the specified
   * customer and communication channel.
   *
   * @param customerId - The customer UUID to start the conversation for.
   * @param channel - The communication channel: `"VOICE"`, `"CHAT"`, `"SMS"`, or `"EMAIL"`.
   * @returns The newly created {@link Conversation} record with status `"ACTIVE"`.
   *
   * @example
   * ```ts
   * const conversation = await client.conversations.start("cust_abc123", "CHAT");
   *
   * console.log(conversation.id);     // "conv_new456"
   * console.log(conversation.status); // "ACTIVE"
   * ```
   */
  async start(
    customerId: string,
    channel: "VOICE" | "CHAT" | "SMS" | "EMAIL",
  ): Promise<Conversation> {
    return await this.#client.request<Conversation>(
      "POST",
      `/customers/${customerId}/conversations`,
      { body: { channel } },
    );
  }

  /**
   * List conversations for a customer with pagination.
   *
   * Returns a paginated list of all conversations associated with the given
   * customer, ordered by recency.
   *
   * @param customerId - The customer UUID.
   * @param opts - Optional pagination parameters.
   * @param opts.page - Page number (1-indexed). Defaults to 1.
   * @param opts.limit - Maximum number of conversations per page. Defaults to API default.
   * @returns A {@link ConversationListResponse} with the conversation array, pagination metadata, and total count.
   *
   * @example
   * ```ts
   * const result = await client.conversations.list("cust_abc123", { page: 1, limit: 20 });
   *
   * for (const conv of result.conversations) {
   *   console.log(`${conv.channel}: ${conv.status}`);
   * }
   * ```
   */
  async list(
    customerId: string,
    opts?: { page?: number; limit?: number },
  ): Promise<ConversationListResponse> {
    const params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.limit) params.limit = String(opts.limit);

    const res = await this.#client.request<
      { data: Conversation[]; page: number; limit: number; total: number }
    >("GET", `/customers/${customerId}/conversations`, { params });

    return {
      conversations: res.data,
      page: res.page,
      limit: res.limit,
      total: res.total,
    };
  }

  /**
   * End a conversation by path parameters.
   *
   * Transitions the conversation to COMPLETED status with an optional outcome
   * description. Uses the customer and conversation IDs in the URL path.
   *
   * @param customerId - The customer UUID.
   * @param conversationId - The conversation UUID to end.
   * @param request - Optional end request with an outcome description (e.g. `"resolved"`, `"customer_hung_up"`).
   * @returns A {@link ConversationEndResponse} with the conversation ID, `"COMPLETED"` status, and end timestamp.
   *
   * @example
   * ```ts
   * const ended = await client.conversations.end(
   *   "cust_abc123",
   *   "conv_456",
   *   { outcome: "resolved" },
   * );
   *
   * console.log(ended.status); // "COMPLETED"
   * ```
   */
  async end(
    customerId: string,
    conversationId: string,
    request?: ConversationEndRequest,
  ): Promise<ConversationEndResponse> {
    return await this.#client.request<ConversationEndResponse>(
      "PATCH",
      `/customers/${customerId}/conversations/${conversationId}`,
      { body: request },
    );
  }

  /**
   * End a conversation using flat body parameters.
   *
   * Alternative to {@link end} that accepts all identifiers in the request body
   * instead of URL path parameters. Useful when the API gateway requires
   * a single POST body.
   *
   * @param request - The end request with customerId, conversationId, and optional outcome.
   * @returns A promise that resolves when the conversation is ended.
   *
   * @example
   * ```ts
   * await client.conversations.endFlat({
   *   customerId: "cust_abc123",
   *   conversationId: "conv_456",
   *   outcome: "resolved",
   * });
   * ```
   */
  async endFlat(request: {
    customerId: string;
    conversationId: string;
    outcome?: string;
  }): Promise<void> {
    return await this.#client.request("POST", "/customers/conversations/end", {
      body: request,
    });
  }

  /**
   * Escalate a conversation by path parameters.
   *
   * Transitions the conversation to ESCALATED status with an optional reason.
   * Uses the customer and conversation IDs in the URL path.
   *
   * @param customerId - The customer UUID.
   * @param conversationId - The conversation UUID to escalate.
   * @param request - Optional escalation request with a reason description.
   * @returns A {@link ConversationEscalateResponse} with the conversation ID and `"ESCALATED"` status.
   *
   * @example
   * ```ts
   * const escalated = await client.conversations.escalate(
   *   "cust_abc123",
   *   "conv_456",
   *   { reason: "Complex billing dispute requires supervisor" },
   * );
   *
   * console.log(escalated.status); // "ESCALATED"
   * ```
   */
  async escalate(
    customerId: string,
    conversationId: string,
    request?: ConversationEscalateRequest,
  ): Promise<ConversationEscalateResponse> {
    return await this.#client.request<ConversationEscalateResponse>(
      "PATCH",
      `/customers/${customerId}/conversations/${conversationId}/escalate`,
      { body: request },
    );
  }

  /**
   * Escalate a conversation using flat body parameters.
   *
   * Alternative to {@link escalate} that accepts all identifiers in the request
   * body instead of URL path parameters.
   *
   * @param request - The escalation request with customerId, conversationId, and optional reason.
   * @returns A promise that resolves when the escalation is complete.
   *
   * @example
   * ```ts
   * await client.conversations.escalateFlat({
   *   customerId: "cust_abc123",
   *   conversationId: "conv_456",
   *   reason: "Customer requesting human agent",
   * });
   * ```
   */
  async escalateFlat(request: {
    customerId: string;
    conversationId: string;
    reason?: string;
  }): Promise<void> {
    return await this.#client.request(
      "POST",
      "/customers/conversations/escalate",
      { body: request },
    );
  }
}
