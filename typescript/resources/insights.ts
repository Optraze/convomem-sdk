/**
 * Insights resource for the ConvoMem SDK.
 *
 * Provides analytics, dashboards, and intelligence derived from customer
 * conversations and memories. Includes buying signals, sentiment trends,
 * complaints, frequent issues, entity graphs, and pipeline statistics.
 *
 * @module
 */

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

/**
 * Resource class for accessing analytics and insights.
 *
 * The insights resource aggregates data across all customers and conversations
 * to provide actionable intelligence — from high-level dashboard metrics to
 * detailed sentiment trends and buying signals.
 *
 * @example
 * ```ts
 * const client = new ConvoMemClient({ apiKey: "sk-org-abc", orgId: "org_1" });
 *
 * // Get dashboard overview
 * const dashboard = await client.insights.dashboard();
 *
 * // Check for buying signals
 * const signals = await client.insights.buyingSignals({ limit: 10 });
 * ```
 */
export class InsightsResource {
  #client: ConvoMemClient;

  constructor(client: ConvoMemClient) {
    this.#client = client;
  }

  /**
   * Get the insights dashboard overview.
   *
   * Returns aggregated statistics for the organization including total
   * customers, memories, conversations, active conversations, and average
   * sentiment.
   *
   * @returns An {@link InsightsDashboard} with aggregated metrics.
   *
   * @example
   * ```ts
   * const dashboard = await client.insights.dashboard();
   *
   * console.log(dashboard.totalCustomers);     // 1250
   * console.log(dashboard.totalMemories);      // 8430
   * console.log(dashboard.activeConversations); // 42
   * console.log(dashboard.avgSentiment);        // 0.72
   * ```
   */
  async dashboard(): Promise<InsightsDashboard> {
    return await this.#client.request<InsightsDashboard>(
      "GET",
      "/insights/dashboard",
    );
  }

  /**
   * Get buying signals detected from customer conversations.
   *
   * Returns signals that indicate purchase intent, upsell opportunities,
   * or other revenue-related events. Optionally filtered by customer.
   *
   * @param opts - Optional filter parameters.
   * @param opts.customerId - Filter signals to a specific customer UUID.
   * @param opts.limit - Maximum number of signals to return. Defaults to API default.
   * @returns An array of {@link BuyingSignal} records.
   *
   * @example
   * ```ts
   * // All buying signals
   * const signals = await client.insights.buyingSignals();
   *
   * // Signals for a specific customer
   * const signals = await client.insights.buyingSignals({
   *   customerId: "cust_abc123",
   *   limit: 5,
   * });
   *
   * for (const signal of signals) {
   *   console.log(`${signal.signal} (confidence: ${signal.confidence})`);
   * }
   * ```
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
   * Get sentiment time series data.
   *
   * Returns a time series of sentiment scores showing how customer sentiment
   * has trended over time. Optionally filtered by customer and time range.
   *
   * @param opts - Optional filter parameters.
   * @param opts.customerId - Filter to a specific customer UUID.
   * @param opts.days - Number of days of history to include. Defaults to API default.
   * @returns An array of {@link SentimentPoint} records with timestamps and scores.
   *
   * @example
   * ```ts
   * // Last 30 days of sentiment data
   * const points = await client.insights.sentimentTimeSeries({ days: 30 });
   *
   * for (const point of points) {
   *   console.log(`${point.timestamp}: ${point.score}`);
   * }
   *
   * // Customer-specific sentiment
   * const points = await client.insights.sentimentTimeSeries({
   *   customerId: "cust_abc123",
   *   days: 7,
   * });
   * ```
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
   * List customer complaints with pagination.
   *
   * Returns a paginated list of all complaints detected across customer
   * conversations.
   *
   * @param opts - Optional pagination parameters.
   * @param opts.page - Page number (1-indexed). Defaults to 1.
   * @param opts.limit - Maximum number of complaints per page. Defaults to API default.
   * @returns An array of {@link Complaint} records.
   *
   * @example
   * ```ts
   * const complaints = await client.insights.complaints({ page: 1, limit: 20 });
   *
   * for (const complaint of complaints) {
   *   console.log(`${complaint.category}: ${complaint.content}`);
   * }
   * ```
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
   * Get a single complaint by its unique ID.
   *
   * @param complaintId - The complaint UUID.
   * @returns The {@link Complaint} record.
   *
   * @example
   * ```ts
   * const complaint = await client.insights.getComplaint("cmp_abc123");
   *
   * console.log(complaint.content);  // "Product arrived damaged..."
   * console.log(complaint.severity); // "high"
   * console.log(complaint.status);   // "open"
   * ```
   */
  async getComplaint(complaintId: string): Promise<Complaint> {
    return await this.#client.request<Complaint>(
      "GET",
      `/insights/complaints/${complaintId}`,
    );
  }

  /**
   * Get frequently occurring issues across all customers.
   *
   * Returns a list of the most common issues detected in conversations,
   * ranked by frequency.
   *
   * @returns An array of {@link FrequentIssue} records with issue descriptions, counts, and percentages.
   *
   * @example
   * ```ts
   * const issues = await client.insights.frequentIssues();
   *
   * for (const issue of issues) {
   *   console.log(`${issue.issue}: ${issue.count} occurrences (${issue.percentage}%)`);
   * }
   * ```
   */
  async frequentIssues(): Promise<FrequentIssue[]> {
    return await this.#client.request<FrequentIssue[]>(
      "GET",
      "/insights/frequent-issues",
    );
  }

  /**
   * Get examples of memories being actively used in conversations.
   *
   * Returns memories that were retrieved and injected into LLM context
   * during conversations, showing how the memory system impacts interactions.
   *
   * @param opts - Optional parameters.
   * @param opts.limit - Maximum number of examples to return. Defaults to API default.
   * @returns An array of {@link MemoryInAction} records.
   *
   * @example
   * ```ts
   * const examples = await client.insights.memoryInAction({ limit: 10 });
   *
   * for (const example of examples) {
   *   console.log(`Memory "${example.fact}" used in ${example.usedInConversation}`);
   *   console.log(`Impact: ${example.impact}`);
   * }
   * ```
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
   * Get channel distribution breakdown.
   *
   * Returns statistics showing how conversations are distributed across
   * communication channels (VOICE, CHAT, SMS, EMAIL).
   *
   * @returns An array of {@link ChannelBreakdown} records with channel names, counts, and percentages.
   *
   * @example
   * ```ts
   * const breakdown = await client.insights.channelBreakdown();
   *
   * for (const channel of breakdown) {
   *   console.log(`${channel.channel}: ${channel.count} conversations (${channel.percentage}%)`);
   * }
   * ```
   */
  async channelBreakdown(): Promise<ChannelBreakdown[]> {
    return await this.#client.request<ChannelBreakdown[]>(
      "GET",
      "/insights/channels",
    );
  }

  /**
   * Get sales pipeline statistics.
   *
   * Returns aggregated pipeline metrics including total leads, qualified
   * leads, and conversion rate.
   *
   * @returns A {@link PipelineStats} object with pipeline metrics.
   *
   * @example
   * ```ts
   * const stats = await client.insights.pipelineStats();
   *
   * console.log(stats.totalLeads);     // 320
   * console.log(stats.qualifiedLeads); // 85
   * console.log(stats.conversionRate); // 0.266
   * ```
   */
  async pipelineStats(): Promise<PipelineStats> {
    return await this.#client.request<PipelineStats>(
      "GET",
      "/insights/pipeline-stats",
    );
  }

  /**
   * Get entity graph statistics.
   *
   * Returns aggregate statistics about the knowledge graph including
   * node counts, edge counts, and type distributions.
   *
   * @returns A record containing entity graph statistics.
   *
   * @example
   * ```ts
   * const stats = await client.insights.entityGraphStats();
   *
   * console.log(stats.totalNodes); // 450
   * console.log(stats.totalEdges); // 1200
   * ```
   */
  async entityGraphStats(): Promise<Record<string, unknown>> {
    return await this.#client.request<Record<string, unknown>>(
      "GET",
      "/insights/entity-graph/stats",
    );
  }

  /**
   * Get the entity relationship graph.
   *
   * Returns a graph of entities and their relationships, optionally scoped
   * to a specific entity and traversal depth.
   *
   * @param opts - Optional graph parameters.
   * @param opts.entityId - Center the graph on this entity UUID.
   * @param opts.depth - Maximum traversal depth from the center entity.
   * @returns An {@link EntityGraphResponse} with graph nodes and edges.
   *
   * @example
   * ```ts
   * // Full graph
   * const graph = await client.insights.entityGraph();
   *
   * // Scoped to a specific entity
   * const graph = await client.insights.entityGraph({
   *   entityId: "ent_abc123",
   *   depth: 3,
   * });
   *
   * console.log(`${graph.nodes.length} nodes, ${graph.edges.length} edges`);
   * ```
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
   *
   * Returns the most recent conversations regardless of customer, useful
   * for monitoring real-time activity.
   *
   * @param opts - Optional parameters.
   * @param opts.limit - Maximum number of conversations to return. Defaults to API default.
   * @returns An array of {@link Conversation} records.
   *
   * @example
   * ```ts
   * const recent = await client.insights.recentConversations({ limit: 10 });
   *
   * for (const conv of recent) {
   *   console.log(`${conv.channel} (${conv.status}) - ${conv.startedAt}`);
   * }
   * ```
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
   * List conversations across all customers with pagination.
   *
   * Returns a paginated list of all conversations in the organization,
   * ordered by recency.
   *
   * @param opts - Optional pagination parameters.
   * @param opts.page - Page number (1-indexed). Defaults to 1.
   * @param opts.limit - Maximum number of conversations per page. Defaults to API default.
   * @returns A {@link ConversationListResponse} with the conversation array, pagination metadata, and total count.
   *
   * @example
   * ```ts
   * const result = await client.insights.listConversations({ page: 1, limit: 50 });
   *
   * console.log(`Showing ${result.conversations.length} of ${result.total} conversations`);
   * ```
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
   * List insights with pagination and optional type filter.
   *
   * Returns a paginated list of generated insights, optionally filtered
   * by insight type (e.g. `"trend"`, `"anomaly"`, `"recommendation"`).
   *
   * @param opts - Optional filtering and pagination parameters.
   * @param opts.page - Page number (1-indexed). Defaults to 1.
   * @param opts.limit - Maximum number of insights per page. Defaults to API default.
   * @param opts.type - Filter by insight type.
   * @returns An {@link InsightListResponse} with the insight array, pagination metadata, and total count.
   *
   * @example
   * ```ts
   * // All insights
   * const result = await client.insights.list();
   *
   * // Only recommendations
   * const result = await client.insights.list({ type: "recommendation", limit: 10 });
   *
   * for (const insight of result.insights) {
   *   console.log(`${insight.title}: ${insight.summary}`);
   * }
   * ```
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
   *
   * Performs an action on a specific insight, such as dismissing, archiving,
   * or sharing it with team members.
   *
   * @param insightId - The insight UUID.
   * @param request - The action request with action type and optional notes.
   * @returns A promise that resolves when the action is complete.
   *
   * @example
   * ```ts
   * // Dismiss an insight
   * await client.insights.action("ins_abc123", {
   *   action: "dismiss",
   *   notes: "Not relevant to current strategy",
   * });
   *
   * // Share an insight
   * await client.insights.action("ins_abc123", {
   *   action: "share",
   *   notes: "Team should review this trend",
   * });
   * ```
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
