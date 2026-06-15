import type { ConvoMemClient } from "../client.ts";
import type {
  MemoryIngestRequest,
  MemoryLookupParams,
  MemoryContext,
  MemoryListResponse,
  MemoryUpdateRequest,
} from "../types.ts";

export class MemoriesResource {
  #client: ConvoMemClient;

  constructor(client: ConvoMemClient) {
    this.#client = client;
  }

  /**
   * Ingest a completed conversation for memory extraction.
   */
  async ingest(
    customerId: string,
    request: MemoryIngestRequest,
  ): Promise<{ captureId: string; status: "queued" }> {
    return this.#client.request(
      "POST",
      `/customers/${customerId}/memories/ingest`,
      { body: request },
    );
  }

  /**
   * Look up relevant memories for a topic (by customer ID).
   */
  async lookup(
    customerId: string,
    params: MemoryLookupParams,
  ): Promise<MemoryContext> {
    return this.#client.request<MemoryContext>(
      "GET",
      `/customers/${customerId}/memories/lookup`,
      { params: { topic: params.topic } },
    );
  }

  /**
   * Look up relevant memories by identity (no UUID needed).
   */
  async lookupByIdentity(
    params: MemoryLookupParams & {
      phone?: string;
      email?: string;
      externalId?: string;
    },
  ): Promise<MemoryContext> {
    const query: Record<string, string> = { topic: params.topic };
    if (params.phone) query.phone = params.phone;
    if (params.email) query.email = params.email;
    if (params.externalId) query.externalId = params.externalId;

    return this.#client.request<MemoryContext>(
      "GET",
      "/customers/memories/lookup",
      { params: query },
    );
  }

  /**
   * List customer memories (paginated).
   */
  async list(
    customerId: string,
    opts?: { page?: number; limit?: number },
  ): Promise<MemoryListResponse> {
    const params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.limit) params.limit = String(opts.limit);

    return this.#client.request<MemoryListResponse>(
      "GET",
      `/customers/${customerId}/memories`,
      { params },
    );
  }

  /**
   * Update a customer memory.
   */
  async update(
    customerId: string,
    memId: string,
    request: MemoryUpdateRequest,
  ): Promise<void> {
    return this.#client.request(
      "PATCH",
      `/customers/${customerId}/memories/${memId}`,
      { body: request },
    );
  }

  /**
   * Delete a customer memory.
   */
  async delete(customerId: string, memId: string): Promise<void> {
    return this.#client.request(
      "DELETE",
      `/customers/${customerId}/memories/${memId}`,
    );
  }
}
