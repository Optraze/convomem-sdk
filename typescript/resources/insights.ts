import type { ConvoMemClient } from "../client.ts";
import type {
  BuyingSignal,
  ChannelBreakdown,
  Complaint,
  Conversation,
  ConversationListResponse,
  EntityGraphResponse,
  FrequentIssue,
  InsightActionRequest,
  InsightListResponse,
  InsightsDashboard,
  MemoryInAction,
  PipelineStats,
  SentimentPoint,
} from "../types.ts";

export class InsightsResource {
  #client: ConvoMemClient;

  constructor(client: ConvoMemClient) {
    this.#client = client;
  }

  /**
   * Get the insights dashboard overview.
   */
  async dashboard(): Promise<InsightsDashboard> {
    return await this.#client.request<InsightsDashboard>(
      "GET",
      "/insights/dashboard",
    );
  }

  /**
   * Get buying signals, optionally filtered by customer.
   */
  async buyingSignals(
    opts?: { customerId?: string; limit?: number },
  ): Promise<BuyingSignal[]> {
    const params: Record<string, string> = {};
    if (opts?.customerId) params.customerId = opts.customerId;
    if (opts?.limit) params.limit = String(opts.limit);

    return await this.#client.request<BuyingSignal[]>(
      "GET",
      "/insights/buying-signals",
      { params },
    );
  }

  /**
   * Get sentiment time series data, optionally filtered by customer.
   */
  async sentimentTimeSeries(
    opts?: { customerId?: string; days?: number },
  ): Promise<SentimentPoint[]> {
    const params: Record<string, string> = {};
    if (opts?.customerId) params.customerId = opts.customerId;
    if (opts?.days) params.days = String(opts.days);

    return await this.#client.request<SentimentPoint[]>(
      "GET",
      "/insights/sentiment",
      { params },
    );
  }

  /**
   * List complaints (paginated).
   */
  async complaints(
    opts?: { page?: number; limit?: number },
  ): Promise<Complaint[]> {
    const params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.limit) params.limit = String(opts.limit);

    return await this.#client.request<Complaint[]>(
      "GET",
      "/insights/complaints",
      { params },
    );
  }

  /**
   * Get a single complaint by ID.
   */
  async getComplaint(complaintId: string): Promise<Complaint> {
    return await this.#client.request<Complaint>(
      "GET",
      `/insights/complaints/${complaintId}`,
    );
  }

  /**
   * Get frequent issues across all customers.
   */
  async frequentIssues(): Promise<FrequentIssue[]> {
    return await this.#client.request<FrequentIssue[]>(
      "GET",
      "/insights/frequent-issues",
    );
  }

  /**
   * Get memory-in-action examples.
   */
  async memoryInAction(
    opts?: { limit?: number },
  ): Promise<MemoryInAction[]> {
    const params: Record<string, string> = {};
    if (opts?.limit) params.limit = String(opts.limit);

    return await this.#client.request<MemoryInAction[]>(
      "GET",
      "/insights/memory-in-action",
      { params },
    );
  }

  /**
   * Get channel breakdown statistics.
   */
  async channelBreakdown(): Promise<ChannelBreakdown[]> {
    return await this.#client.request<ChannelBreakdown[]>(
      "GET",
      "/insights/channels",
    );
  }

  /**
   * Get pipeline statistics.
   */
  async pipelineStats(): Promise<PipelineStats> {
    return await this.#client.request<PipelineStats>(
      "GET",
      "/insights/pipeline-stats",
    );
  }

  /**
   * Get entity graph statistics.
   */
  async entityGraphStats(): Promise<Record<string, unknown>> {
    return await this.#client.request<Record<string, unknown>>(
      "GET",
      "/insights/entity-graph/stats",
    );
  }

  /**
   * Get entity graph, optionally filtered by entity ID and depth.
   */
  async entityGraph(
    opts?: { entityId?: string; depth?: number },
  ): Promise<EntityGraphResponse> {
    const params: Record<string, string> = {};
    if (opts?.entityId) params.entityId = opts.entityId;
    if (opts?.depth) params.depth = String(opts.depth);

    return await this.#client.request<EntityGraphResponse>(
      "GET",
      "/insights/entity-graph",
      { params },
    );
  }

  /**
   * Get recent conversations across all customers.
   */
  async recentConversations(
    opts?: { limit?: number },
  ): Promise<Conversation[]> {
    const params: Record<string, string> = {};
    if (opts?.limit) params.limit = String(opts.limit);

    return await this.#client.request<Conversation[]>(
      "GET",
      "/insights/recent-conversations",
      { params },
    );
  }

  /**
   * List conversations across all customers (paginated).
   */
  async listConversations(
    opts?: { page?: number; limit?: number },
  ): Promise<ConversationListResponse> {
    const params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.limit) params.limit = String(opts.limit);

    return await this.#client.request<ConversationListResponse>(
      "GET",
      "/insights/conversations",
      { params },
    );
  }

  /**
   * List insights (paginated, optionally filtered by type).
   */
  async list(
    opts?: { page?: number; limit?: number; type?: string },
  ): Promise<InsightListResponse> {
    const params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.limit) params.limit = String(opts.limit);
    if (opts?.type) params.type = opts.type;

    return await this.#client.request<InsightListResponse>(
      "GET",
      "/insights",
      { params },
    );
  }

  /**
   * Take action on an insight.
   */
  async action(
    insightId: string,
    request: InsightActionRequest,
  ): Promise<void> {
    return await this.#client.request(
      "POST",
      `/insights/${insightId}/action`,
      { body: request },
    );
  }
}
