/**
 * ConvoMem TypeScript SDK — the official client library for the ConvoMem API.
 *
 * **Primary entry point:** {@link ConvoMem} — flat, spec-compliant API where every
 * method routes by identity automatically (UUID path vs. flat server-resolved route).
 *
 * **Advanced entry point:** {@link ConvoMemClient} — resource-based API
 * (`client.customers.*`, `client.memories.*`, etc.) for fine-grained control.
 *
 * @example
 * ```ts
 * import { ConvoMem } from "convomem";
 *
 * const client = new ConvoMem({ apiKey: process.env.CONVOMEM_API_KEY });
 *
 * // Recall context before replying
 * const { context } = await client.lookup(
 *   "order status",
 *   { email: "alice@example.com" },
 *   { autoCreate: true },
 * );
 *
 * // … generate reply …
 *
 * // Capture the exchange (fire-and-forget)
 * await client.capture(
 *   [
 *     { role: "user", content: "Where is my order?" },
 *     { role: "assistant", content: "Your order ships tomorrow." },
 *   ],
 *   { email: "alice@example.com" },
 *   { channel: "CHAT" },
 * );
 * ```
 *
 * @module
 */

/** Primary flat-API client (spec-compliant). */
export { ConvoMem } from "./convomem.ts";

/** Resource-based client for advanced use. */
export { ConvoMemClient } from "./client.ts";

/**
 * Type definitions for the ConvoMem API.
 *
 * - **Capture** — {@link CaptureRequest}, {@link CaptureResponse}
 * - **Config** — {@link ConvoMemConfig}
 * - **Conversations** — {@link Conversation}, {@link ConversationListResponse}, {@link ConversationEndRequest}, {@link ConversationEndResponse}, {@link ConversationEscalateRequest}, {@link ConversationEscalateResponse}
 * - **Customers** — {@link Customer}, {@link CustomerCreateRequest}, {@link CustomerIdentity}, {@link CustomerListResponse}, {@link CustomerLookupParams}, {@link CustomerLookupResponse}, {@link CustomerStats}, {@link CustomerUpdateRequest}
 * - **Embed** — {@link EmbedTokenRequest}, {@link EmbedTokenResponse}
 * - **Entities** — {@link Entity}, {@link EntityGraphResponse}, {@link EntityListResponse}, {@link EntitySearchParams}
 * - **Feedback** — {@link FeedbackLookupRequest}, {@link FeedbackLookupResponse}
 * - **Handoff** — {@link HandoffParams}, {@link HandoffResponse}, {@link JourneyEntry}, {@link KeyMemory}
 * - **Memories** — {@link Memory}, {@link MemoryAddRequest}, {@link MemoryContext}, {@link MemoryIngestRequest}, {@link MemoryListResponse}, {@link MemoryLookupParams}, {@link MemoryUpdateRequest}
 * - **Merge** — {@link MergeCandidate}
 */
export type {
  // Capture
  CaptureRequest,
  CaptureResponse,
  // Config
  ConvoMemConfig,
  // Conversations
  Conversation,
  ConversationEndRequest,
  ConversationEndResponse,
  ConversationEscalateRequest,
  ConversationEscalateResponse,
  ConversationListResponse,
  // Customers
  Customer,
  CustomerCreateRequest,
  CustomerIdentity,
  CustomerListResponse,
  CustomerLookupParams,
  CustomerLookupResponse,
  CustomerStats,
  CustomerUpdateRequest,
  // Embed
  EmbedTokenRequest,
  EmbedTokenResponse,
  // Entities
  Entity,
  EntityGraphResponse,
  EntityListResponse,
  EntitySearchParams,
  // Feedback
  FeedbackLookupRequest,
  FeedbackLookupResponse,
  // Handoff
  HandoffParams,
  HandoffResponse,
  JourneyEntry,
  KeyMemory,
  // Memories
  Memory,
  MemoryAddRequest,
  MemoryContext,
  MemoryIngestRequest,
  MemoryListResponse,
  MemoryLookupParams,
  MemoryUpdateRequest,
  // Merge
  MergeCandidate,
} from "./types.ts";

/** Error classes for handling ConvoMem API and SDK errors. */
export { ConvoMemApiError, ConvoMemError } from "./errors.ts";
