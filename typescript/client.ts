import type { ConvoMemConfig } from "./types.ts";
import { CaptureResource } from "./resources/capture.ts";
import { CustomersResource } from "./resources/customers.ts";
import { MemoriesResource } from "./resources/memories.ts";
import { ConversationsResource } from "./resources/conversations.ts";
import { EmbedResource } from "./resources/embed.ts";
import { EntitiesResource } from "./resources/entities.ts";
import { OrgsResource } from "./resources/orgs.ts";
import { InsightsResource } from "./resources/insights.ts";
import { WebhooksResource } from "./resources/webhooks.ts";

const DEFAULT_BASE_URL = "https://api.convomem.com/api/v1";

export class ConvoMemClient {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #fetch: typeof globalThis.fetch;
  readonly #timeout: number;
  readonly #maxRetries: number;
  readonly #retryDelay: number;

  readonly capture: CaptureResource;
  readonly customers: CustomersResource;
  readonly memories: MemoriesResource;
  readonly conversations: ConversationsResource;
  readonly embed: EmbedResource;
  readonly entities: EntitiesResource;
  readonly orgs: OrgsResource;
  readonly insights: InsightsResource;
  readonly webhooks: WebhooksResource;

  constructor(config: ConvoMemConfig) {
    this.#apiKey = config.apiKey;
    this.#baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.#fetch = config.fetch ?? globalThis.fetch;
    this.#timeout = config.timeout ?? 30000;
    this.#maxRetries = config.maxRetries ?? 0;
    this.#retryDelay = config.retryDelay ?? 1000;

    this.capture = new CaptureResource(this);
    this.customers = new CustomersResource(this);
    this.memories = new MemoriesResource(this);
    this.conversations = new ConversationsResource(this);
    this.embed = new EmbedResource(this);
    this.entities = new EntitiesResource(this);
    this.orgs = new OrgsResource(this);
    this.insights = new InsightsResource(this);
    this.webhooks = new WebhooksResource(this);
  }

  /** @internal */
  async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      params?: Record<string, string>;
      headers?: Record<string, string>;
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

      try {
        const res = await this.#fetch(url, {
          ...init,
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          if (res.status >= 500 || res.status === 429) {
            if (attempt < this.#maxRetries) {
              await new Promise((r) =>
                setTimeout(r, this.#retryDelay * (attempt + 1))
              );
              continue;
            }
          }
          throw new Error(
            `ConvoMem API error ${res.status}: ${text || res.statusText}`,
          );
        }

        // 204 No Content
        if (res.status === 204) {
          return undefined as T;
        }

        return res.json() as Promise<T>;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          lastError = new Error(
            `ConvoMem API request timed out after ${this.#timeout}ms`,
          );
          if (attempt < this.#maxRetries) {
            await new Promise((r) =>
              setTimeout(r, this.#retryDelay * (attempt + 1))
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

    throw lastError ?? new Error("ConvoMem API request failed after retries");
  }
}
