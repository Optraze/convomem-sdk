import type { ConvoMemClient } from "../client.ts";
import type {
  Entity,
  EntityGraphResponse,
  EntityListResponse,
  EntitySearchParams,
} from "../types.ts";

export class EntitiesResource {
  #client: ConvoMemClient;

  constructor(client: ConvoMemClient) {
    this.#client = client;
  }

  /**
   * List entities (paginated).
   */
  async list(
    opts?: { page?: number; limit?: number; type?: string },
  ): Promise<EntityListResponse> {
    const params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.limit) params.limit = String(opts.limit);
    if (opts?.type) params.type = opts.type;

    return await this.#client.request<EntityListResponse>(
      "GET",
      "/entities",
      { params },
    );
  }

  /**
   * Get a single entity by ID.
   */
  async get(entityId: string): Promise<Entity> {
    return await this.#client.request<Entity>(
      "GET",
      `/entities/${entityId}`,
    );
  }

  /**
   * Search entities by query parameters.
   */
  async search(params: EntitySearchParams): Promise<EntityListResponse> {
    const query: Record<string, string> = {};
    if (params.query) query.query = params.query;
    if (params.type) query.type = params.type;
    if (params.limit) query.limit = String(params.limit);

    return await this.#client.request<EntityListResponse>(
      "GET",
      "/entities/search",
      { params: query },
    );
  }

  /**
   * Get entity relationship graph.
   */
  async getGraph(
    opts?: { entityId?: string; depth?: number },
  ): Promise<EntityGraphResponse> {
    const params: Record<string, string> = {};
    if (opts?.entityId) params.entityId = opts.entityId;
    if (opts?.depth) params.depth = String(opts.depth);

    return await this.#client.request<EntityGraphResponse>(
      "GET",
      "/entities/graph",
      { params },
    );
  }

  /**
   * Delete an entity by ID.
   */
  async delete(entityId: string): Promise<void> {
    return await this.#client.request(
      "DELETE",
      `/entities/${entityId}`,
    );
  }
}
