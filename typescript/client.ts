import type { ConvoMemConfig } from "./types.ts";
import { CaptureResource } from "./resources/capture.ts";
import { CustomersResource } from "./resources/customers.ts";
import { MemoriesResource } from "./resources/memories.ts";
import { ConversationsResource } from "./resources/conversations.ts";
import { EmbedResource } from "./resources/embed.ts";

const DEFAULT_BASE_URL = "https://api.convomem.com/api/v1";

export class ConvoMemClient {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #fetch: typeof globalThis.fetch;

  readonly capture: CaptureResource;
  readonly customers: CustomersResource;
  readonly memories: MemoriesResource;
  readonly conversations: ConversationsResource;
  readonly embed: EmbedResource;

  constructor(config: ConvoMemConfig) {
    this.#apiKey = config.apiKey;
    this.#baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.#fetch = config.fetch ?? globalThis.fetch;

    this.capture = new CaptureResource(this);
    this.customers = new CustomersResource(this);
    this.memories = new MemoriesResource(this);
    this.conversations = new ConversationsResource(this);
    this.embed = new EmbedResource(this);
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
    const url = new URL(path, this.#baseUrl);

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

    const res = await this.#fetch(url, init);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `ConvoMem API error ${res.status}: ${text || res.statusText}`,
      );
    }

    // 204 No Content
    if (res.status === 204) {
      return undefined as T;
    }

    return res.json() as Promise<T>;
  }
}
