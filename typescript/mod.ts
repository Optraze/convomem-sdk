/**
 * ConvoMem TypeScript SDK — the official client library for the ConvoMem API.
 *
 * This module is the main entry point for the SDK. It re-exports the
 * {@link ConvoMemClient} class, all API resource types, and error classes.
 *
 * @example
 * ```ts
 * import { ConvoMemClient } from "convomem";
 *
 * const client = new ConvoMemClient({ apiKey: "your-api-key" });
 *
 * // List all customers
 * const { customers } = await client.customers.list();
 *
 * // Add a memory for a customer
 * await client.memories.add({
 *   customerId: customers[0].id,
 *   content: "Prefers email over phone",
 * });
 *
 * // Get insights dashboard
 * const dashboard = await client.insights.dashboard();
 * ```
 *
 * @module
 */

/** The main ConvoMem API client. */
export { ConvoMemClient } from "./client.ts";

/**
 * All type definitions for the ConvoMem API.
 *
 * Includes request/response types for every resource domain:
 * - **Capture** — {@link CaptureRequest}, {@link CaptureResponse}
 * - **Conversations** — {@link Conversation}, {@link ConversationListResponse}, {@link ConversationEndRequest}, {@link ConversationEndResponse}, {@link ConversationEscalateRequest}, {@link ConversationEscalateResponse}
 * - **Config** — {@link ConvoMemConfig}
 * - **Customers** — {@link Customer}, {@link CustomerCreateRequest}, {@link CustomerListResponse}, {@link CustomerLookupParams}, {@link CustomerLookupResponse}, {@link CustomerUpdateRequest}
 * - **Embed** — {@link EmbedTokenRequest}, {@link EmbedTokenResponse}
 * - **Entities** — {@link Entity}, {@link EntityGraphResponse}, {@link EntityListResponse}, {@link EntitySearchParams}
 * - **Handoff** — {@link HandoffParams}, {@link HandoffResponse}
 * - **Insights** — {@link Insight}, {@link InsightActionRequest}, {@link InsightListResponse}, {@link InsightsDashboard}
 * - **Memories** — {@link Memory}, {@link MemoryAddRequest}, {@link MemoryContext}, {@link MemoryInAction}, {@link MemoryIngestRequest}, {@link MemoryListResponse}, {@link MemoryLookupParams}, {@link MemoryUpdateRequest}
 * - **Orgs** — {@link Org}, {@link OrgApiKey}, {@link OrgApiKeyCreateRequest}, {@link OrgAuditLog}, {@link OrgCreateRequest}, {@link OrgMember}, {@link OrgMemberAddRequest}, {@link OrgMemberUpdateRequest}, {@link OrgUpdateRequest}
 * - **Webhooks** — {@link Webhook}, {@link WebhookCreateRequest}, {@link WebhookUpdateRequest}
 * - **Analytics** — {@link BuyingSignal}, {@link ChannelBreakdown}, {@link Complaint}, {@link FrequentIssue}, {@link JourneyEntry}, {@link KeyMemory}, {@link PipelineStats}, {@link SentimentPoint}
 * - **Feedback** — {@link FeedbackLookupRequest}, {@link FeedbackLookupResponse}
 */
export type {
  BuyingSignal,
  // Capture
  CaptureRequest,
  CaptureResponse,
  ChannelBreakdown,
  Complaint,
  // Conversations
  Conversation,
  ConversationEndRequest,
  ConversationEndResponse,
  ConversationEscalateRequest,
  ConversationEscalateResponse,
  ConversationListResponse,
  // Config
  ConvoMemConfig,
  Customer,
  CustomerCreateRequest,
  CustomerListResponse,
  // Customers
  CustomerLookupParams,
  CustomerLookupResponse,
  CustomerUpdateRequest,
  // Embed
  EmbedTokenRequest,
  EmbedTokenResponse,
  // Entities
  Entity,
  EntityGraphResponse,
  EntityListResponse,
  EntitySearchParams,
  FeedbackLookupRequest,
  FeedbackLookupResponse,
  FrequentIssue,
  // Handoff
  HandoffParams,
  HandoffResponse,
  Insight,
  InsightActionRequest,
  InsightListResponse,
  // Insights
  InsightsDashboard,
  JourneyEntry,
  KeyMemory,
  Memory,
  MemoryAddRequest,
  MemoryContext,
  MemoryInAction,
  // Memories
  MemoryIngestRequest,
  MemoryListResponse,
  MemoryLookupParams,
  MemoryUpdateRequest,
  // Orgs
  Org,
  OrgApiKey,
  OrgApiKeyCreateRequest,
  OrgAuditLog,
  OrgCreateRequest,
  OrgMember,
  OrgMemberAddRequest,
  OrgMemberUpdateRequest,
  OrgUpdateRequest,
  PipelineStats,
  SentimentPoint,
  // Webhooks
  Webhook,
  WebhookCreateRequest,
  WebhookUpdateRequest,
} from "./types.ts";

/** Error classes for handling ConvoMem API and SDK errors. */
export { ConvoMemApiError, ConvoMemError } from "./errors.ts";
