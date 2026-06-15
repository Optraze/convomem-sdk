// ── Config ──────────────────────────────────────────────

export interface ConvoMemConfig {
  /** Organization API key (sk-org-...) */
  apiKey: string;
  /** Override base URL (default: https://api.convomem.com/api/v1) */
  baseUrl?: string;
  /** Custom fetch implementation (for testing or Deno Deploy) */
  fetch?: typeof globalThis.fetch;
}

// ── Capture ─────────────────────────────────────────────

export interface CaptureRequest {
  /** Single user message (simple form). Required if messages not provided. */
  message?: string;
  /** Full conversation turns. Required if message not provided. */
  messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  /** Customer UUID */
  customerId?: string;
  /** External system identifier */
  externalId?: string;
  /** Customer email */
  email?: string;
  /** Customer phone number */
  phoneNumber?: string;
  /** Customer display name */
  userName?: string;
  /** Channel (default: CHAT) */
  channel?: "VOICE" | "CHAT" | "SMS" | "EMAIL";
  /** Idempotency key */
  idempotencyKey?: string;
}

export interface CaptureResponse {
  conversationId: string;
  customerId: string;
  status: "new" | "active";
  isNewConversation: boolean;
  isNewCustomer: boolean;
}

// ── Customers ───────────────────────────────────────────

export interface CustomerLookupParams {
  customerId?: string;
  phone?: string;
  email?: string;
  externalId?: string;
  topic?: string;
  autoCreate?: "true" | "false";
  userName?: string;
}

export interface CustomerLookupResponse {
  found: boolean;
  isNewCustomer?: boolean;
  customer: Customer | null;
  memories?: Memory[];
  context?: string;
  tokenCount?: number;
}

export interface CustomerCreateRequest {
  name?: string;
  email?: string;
  phone?: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
}

export interface Customer {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerListResponse {
  data: Customer[];
  page: number;
  limit: number;
  total: number;
}

export interface CustomerUpdateRequest {
  name?: string;
  email?: string;
  phone?: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
}

// ── Handoff ─────────────────────────────────────────────

export interface HandoffParams {
  customerId?: string;
  phone?: string;
  email?: string;
  externalId?: string;
  narrative?: "true" | "false";
  fresh?: "true" | "false";
}

export interface HandoffResponse {
  found: boolean;
  customer: Customer | null;
  journey: JourneyEntry[];
  keyMemories: KeyMemory[];
  sentimentTrend: {
    direction: "declining" | "improving" | "stable" | "unknown";
    current: number | null;
  };
  openIssue: {
    isOpen: boolean;
    reason: "ESCALATED" | "ACTIVE" | "OUTCOME_UNRESOLVED" | null;
    summary: string | null;
  };
  narrative: string | null;
  narrativeSource: "llm" | "fallback" | "skipped";
}

export interface JourneyEntry {
  conversationId?: string;
  channel: "VOICE" | "CHAT" | "SMS" | "EMAIL";
  status: "ACTIVE" | "COMPLETED" | "ESCALATED" | "ABANDONED";
  summary: string | null;
  outcome: string | null;
  sentiment: number | null;
  startedAt?: string;
}

export interface KeyMemory {
  content: string;
  category: string;
  channelSource: string | null;
}

// ── Memories ────────────────────────────────────────────

export interface Memory {
  id: string;
  content?: string;
  fact?: string;
  category?: string;
  memoryType?: string;
  importance?: number;
  relevance?: number;
  score?: number;
  sentiment?: string | null;
  sourceContext?: string | null;
  createdAt?: string;
}

export interface MemoryIngestRequest {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  channel?: "VOICE" | "CHAT" | "SMS" | "EMAIL";
}

export interface MemoryLookupParams {
  topic: string;
  phone?: string;
  email?: string;
  externalId?: string;
}

export interface MemoryContext {
  context: string;
  tokenCount: number;
  memories: Memory[];
}

export interface MemoryListResponse {
  data: Memory[];
  page: number;
  limit: number;
  total: number;
}

export interface MemoryUpdateRequest {
  fact?: string;
  category?: string;
  importance?: number;
}

// ── Conversations ───────────────────────────────────────

export interface Conversation {
  id: string;
  customerId?: string;
  channel: "VOICE" | "CHAT" | "SMS" | "EMAIL";
  status: "ACTIVE" | "COMPLETED" | "ESCALATED" | "ABANDONED";
  startedAt?: string;
  endedAt?: string | null;
}

export interface ConversationListResponse {
  data: Conversation[];
  page: number;
  limit: number;
  total: number;
}

export interface ConversationEndRequest {
  outcome?: string;
}

export interface ConversationEscalateRequest {
  reason?: string;
}

// ── Embed ───────────────────────────────────────────────

export interface EmbedTokenRequest {
  customerId?: string;
  externalId?: string;
  email?: string;
  phone?: string;
  ttlSeconds?: number;
}

export interface EmbedTokenResponse {
  token: string;
  expiresIn: number;
  scope: string;
}
