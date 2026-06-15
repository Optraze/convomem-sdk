import type { ConvoMemClient } from "../client.ts";
import type {
  Conversation,
  ConversationListResponse,
  ConversationEndRequest,
  ConversationEscalateRequest,
} from "../types.ts";

export class ConversationsResource {
  #client: ConvoMemClient;

  constructor(client: ConvoMemClient) {
    this.#client = client;
  }

  /**
   * Start a new conversation for a customer.
   */
  async start(
    customerId: string,
    channel: "VOICE" | "CHAT" | "SMS" | "EMAIL",
  ): Promise<Conversation> {
    return this.#client.request<Conversation>(
      "POST",
      `/customers/${customerId}/conversations`,
      { body: { channel } },
    );
  }

  /**
   * List conversations for a customer (paginated).
   */
  async list(
    customerId: string,
    opts?: { page?: number; limit?: number },
  ): Promise<ConversationListResponse> {
    const params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.limit) params.limit = String(opts.limit);

    return this.#client.request<ConversationListResponse>(
      "GET",
      `/customers/${customerId}/conversations`,
      { params },
    );
  }

  /**
   * End a conversation (by path params).
   */
  async end(
    customerId: string,
    conversationId: string,
    request?: ConversationEndRequest,
  ): Promise<Conversation> {
    return this.#client.request<Conversation>(
      "PATCH",
      `/customers/${customerId}/conversations/${conversationId}`,
      { body: request },
    );
  }

  /**
   * End a conversation (flat — body params).
   */
  async endFlat(request: {
    customerId: string;
    conversationId: string;
    outcome?: string;
  }): Promise<void> {
    return this.#client.request("POST", "/customers/conversations/end", {
      body: request,
    });
  }

  /**
   * Escalate a conversation (by path params).
   */
  async escalate(
    customerId: string,
    conversationId: string,
    request?: ConversationEscalateRequest,
  ): Promise<Conversation> {
    return this.#client.request<Conversation>(
      "PATCH",
      `/customers/${customerId}/conversations/${conversationId}/escalate`,
      { body: request },
    );
  }

  /**
   * Escalate a conversation (flat — body params).
   */
  async escalateFlat(request: {
    customerId: string;
    conversationId: string;
    reason?: string;
  }): Promise<void> {
    return this.#client.request(
      "POST",
      "/customers/conversations/escalate",
      { body: request },
    );
  }
}
