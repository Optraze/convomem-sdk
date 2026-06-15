/**
 * ConvoMem API client implementation.
 *
 * This module provides the main {@link ConvoMemClient} class that serves as the
 * entry point for interacting with the ConvoMem API. It handles authentication,
 * request construction, retries, and exposes resource-specific sub-clients for
 * each API domain.
 *
 * @module
 */

import type { CaptureRequest, CaptureResponse, ConvoMemConfig } from "./types.ts";
import { ConvoMemApiError, ConvoMemError } from "./errors.ts";
import { CustomersResource } from "./resources/customers.ts";
import { MemoriesResource } from "./resources/memories.ts";
import { ConversationsResource } from "./resources/conversations.ts";
import { EmbedResource } from "./resources/embed.ts";
import { EntitiesResource } from "./resources/entities.ts";
import { OrgsResource } from "./resources/orgs.ts";
import { InsightsResource } from "./resources/insights.ts";
import { WebhooksResource } from "./resources/webhooks.ts";

const DEFAULT_BASE_URL = "https://api.convomem.com/api/v1";

/**
 * The primary client for interacting with the ConvoMem API.
 *
 * Provides authenticated access to all ConvoMem resources including customers,
 * memories, conversations, capture, embed, entities, organizations, insights,
 * and webhooks.
 *
 * @example
 * ```ts
 * import { ConvoMemClient } from "convomem";
 *
 * const client = new ConvoMemClient({ apiKey: "your-api-key" });
 *
 * // List customers
 * const customers = await client.customers.list();
 *
 * // Add a memory
 * const memory = await client.memories.add({
 *   customerId: "cust_123",
 *   content: "User prefers dark mode",
 * });
 *
 * // Capture a conversation
 * const capture = await client.capture({
 *   conversationId: "conv_456",
 *   messages: [
 *     { role: "user", content: "Hello!" },
 *     { role: "assistant", content: "Hi there!" },
 *   ],
 * });
 * ```
 */
export class ConvoMemClient {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #fetch: typeof globalThis.fetch;
  readonly #timeout: number;
  readonly #maxRetries: number;
  readonly #retryDelay: number;

  /** Resource for managing customers. */
  readonly customers: CustomersResource;

  /** Resource for managing memories associated with customers. */
  readonly memories: MemoriesResource;

  /** Resource for managing conversations. */
  readonly conversations: ConversationsResource;

  /** Resource for generating and managing embed tokens. */
  readonly embed: EmbedResource;

  /** Resource for managing entities and entity graphs. */
  readonly entities: EntitiesResource;

  /** Resource for managing organizations and organization settings. */
  readonly orgs: OrgsResource;

  /** Resource for accessing insights and analytics dashboards. */
  readonly insights: InsightsResource;

  /** Resource for managing webhook subscriptions. */
  readonly webhooks: WebhooksResource;

  /**
   * Creates a new ConvoMem client instance.
   *
   * @param config - Configuration options for the client.
   * @param config.apiKey - Your ConvoMem API key. Required for authentication.
   * @param config.baseUrl - Base URL for the API. Defaults to `https://api.convomem.com/api/v1`.
   * @param config.fetch - Custom fetch implementation. Defaults to the global `fetch`.
   * @param config.timeout - Request timeout in milliseconds. Defaults to `30000`.
   * @param config.maxRetries - Maximum number of retry attempts for failed requests (5xx or 429). Defaults to `0`.
   * @param config.retryDelay - Base delay in milliseconds between retries. Doubles with each attempt. Defaults to `1000`.
   */
  constructor(config: ConvoMemConfig) {
    this.#apiKey = config.apiKey;
    this.#baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.#fetch = config.fetch ?? globalThis.fetch;
    this.#timeout = config.timeout ?? 30000;
    this.#maxRetries = config.maxRetries ?? 0;
    this.#retryDelay = config.retryDelay ?? 1000;

    this.customers = new CustomersResource(this);
    this.memories = new MemoriesResource(this);
    this.conversations = new ConversationsResource(this);
    this.embed = new EmbedResource(this);
    this.entities = new EntitiesResource(this);
    this.orgs = new OrgsResource(this);
    this.insights = new InsightsResource(this);
    this.webhooks = new WebhooksResource(this);
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
   * @param opts - Optional settings.
   * @param opts.signal - An {@link AbortSignal} to cancel the request.
   * @returns A {@link CaptureResponse} with conversation ID, customer ID, status, and flags indicating whether new records were created.
   *
   * @example
   * ```ts
   * // Simple single-message capture
   * const result = await client.capture({
   *   message: "What's the status of my order?",
   *   customerId: "cust_abc123",
   *   channel: "CHAT",
   * });
   *
   * // Multi-turn conversation capture
   * const result = await client.capture({
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
  async capture(
    request: CaptureRequest,
    opts?: { signal?: AbortSignal },
  ): Promise<CaptureResponse> {
    return await this.request<CaptureResponse>("POST", "/capture", {
      body: request,
      signal: opts?.signal,
    });
  }

  /**
   * Returns a delay in milliseconds for the given retry attempt, using full
   * jitter (random value between 0 and the linear backoff base) to avoid
   * synchronized retries from multiple clients.
   */
  #retryDelayMs(attempt: number): number {
    return Math.random() * this.#retryDelay * (attempt + 1);
  }

  /** @internal */
  async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      params?: Record<string, string>;
      headers?: Record<string, string>;
      /** Optional signal to allow external cancellation of this request. */
      signal?: AbortSignal;
    },
  ): Promise<T> {
    const url = new URL(`${this.#baseUrl}${path}`);

    if (options?.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      }
    }

    const headers: Record<string, string> = {
      "X-API-Key": this.#apiKey,
      ...options?.headers,
    };

    const init: RequestInit = { method, headers };

    if (options?.body) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.#maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.#timeout);
      const signal = options?.signal
        ? AbortSignal.any([controller.signal, options.signal])
        : controller.signal;

      try {
        const res = await this.#fetch(url, { ...init, signal });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          if (res.status >= 500 || res.status === 429) {
            if (attempt < this.#maxRetries) {
              await new Promise((r) =>
                setTimeout(r, this.#retryDelayMs(attempt))
              );
              continue;
            }
          }
          let body: unknown;
          try {
            body = text ? JSON.parse(text) : undefined;
          } catch {
            body = text;
          }
          throw new ConvoMemApiError(
            res.status,
            `ConvoMem API error ${res.status}: ${text || res.statusText}`,
            url.toString(),
            body,
          );
        }

        // Some endpoints respond 200/204 with an empty body.
        const text = await res.text();
        return (text ? JSON.parse(text) : undefined) as T;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          if (options?.signal?.aborted) {
            throw err;
          }
          lastError = new ConvoMemError(
            `ConvoMem API request timed out after ${this.#timeout}ms`,
          );
          if (attempt < this.#maxRetries) {
            await new Promise((r) =>
              setTimeout(r, this.#retryDelayMs(attempt))
            );
            continue;
          }
          throw lastError;
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    throw lastError ?? new ConvoMemError("ConvoMem API request failed after retries");
  }
}
