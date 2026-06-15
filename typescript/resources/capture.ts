/**
 * Capture resource for the ConvoMem SDK.
 *
 * Provides a unified endpoint for capturing conversation messages with automatic
 * session management. The capture flow resolves customer identity, finds or
 * creates an active conversation, enqueues the message for memory extraction,
 * and returns session context — all in a single call.
 *
 * @module
 */

import type { ConvoMemClient } from "../client.ts";
import type { CaptureRequest, CaptureResponse } from "../types.ts";

/**
 * Resource class for capturing conversation messages.
 *
 * The capture endpoint is the primary entry point for feeding data into ConvoMem.
 * It handles customer resolution, conversation lifecycle, and memory extraction
 * in one atomic operation.
 *
 * @example
 * ```ts
 * const client = new ConvoMemClient({ apiKey: "sk-org-abc", orgId: "org_1" });
 *
 * const result = await client.capture.capture({
 *   message: "I need help with my order",
 *   email: "alice@example.com",
 *   channel: "CHAT",
 * });
 *
 * console.log(result.conversationId); // "conv_abc123"
 * console.log(result.isNewCustomer);  // false
 * ```
 */
export class CaptureResource {
  #client: ConvoMemClient;

  constructor(client: ConvoMemClient) {
    this.#client = client;
  }

  /**
   * Capture a message and auto-manage session.
   *
   * Resolves customer identity from the provided identifiers, finds or creates
   * an active conversation for the specified channel, enqueues the message for
   * asynchronous memory extraction, and returns session context including the
   * conversation and customer IDs.
   *
   * @param request - The capture request containing the message, customer identity, and channel.
   * @returns A {@link CaptureResponse} with conversation ID, customer ID, status, and flags indicating whether new records were created.
   *
   * @example
   * ```ts
   * // Simple single-message capture
   * const result = await client.capture.capture({
   *   message: "What's the status of my order?",
   *   customerId: "cust_abc123",
   *   channel: "CHAT",
   * });
   *
   * // Multi-turn conversation capture
   * const result = await client.capture.capture({
   *   messages: [
   *     { role: "user", content: "I want to return an item" },
   *     { role: "assistant", content: "I can help with that. What's your order number?" },
   *     { role: "user", content: "Order #12345" },
   *   ],
   *   email: "bob@example.com",
   *   channel: "VOICE",
   *   idempotencyKey: "cap_unique_123",
   * });
   * ```
   */
  async capture(request: CaptureRequest): Promise<CaptureResponse> {
    return await this.#client.request<CaptureResponse>("POST", "/capture", {
      body: request,
    });
  }
}
