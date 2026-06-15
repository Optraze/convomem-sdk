/**
 * Entities resource for the ConvoMem SDK.
 *
 * Manages entities in the knowledge graph — real-world objects (companies,
 * products, people) that are linked to customers and memories through
 * relationships. Provides listing, search, graph traversal, and deletion.
 *
 * @module
 */

import type { ConvoMemClient } from "../client.ts";
import type {
  Entity,
  EntityGraphResponse,
  EntityListResponse,
  EntitySearchParams,
} from "../types.ts";

/**
 * Resource class for managing knowledge graph entities.
 *
 * Entities represent real-world objects that are connected to customers and
 * memories via relationships. Use this resource to list, search, and explore
 * the entity relationship graph.
 *
 * @example
 * ```ts
 * const client = new ConvoMemClient({ apiKey: "sk-org-abc", orgId: "org_1" });
 *
 * // Search for entities
 * const results = await client.entities.search({ query: "Acme Corp", type: "company" });
 *
 * // Get the relationship graph
 * const graph = await client.entities.getGraph({ depth: 2 });
 * ```
 */
export class EntitiesResource {
  #client: ConvoMemClient;

  constructor(client: ConvoMemClient) {
    this.#client = client;
  }

  /**
   * List entities with pagination and optional type filter.
   *
   * Returns a paginated list of all entities in the organization, optionally
   * filtered by entity type.
   *
   * @param opts - Optional filtering and pagination parameters.
   * @param opts.page - Page number (1-indexed). Defaults to 1.
   * @param opts.limit - Maximum number of entities per page. Defaults to API default.
   * @param opts.type - Filter by entity type (e.g. `"company"`, `"product"`, `"person"`).
   * @returns An {@link EntityListResponse} with the entity array, pagination metadata, and total count.
   *
   * @example
   * ```ts
   * // List all entities
   * const all = await client.entities.list();
   *
   * // List only companies
   * const companies = await client.entities.list({ type: "company", limit: 50 });
   *
   * console.log(`Found ${companies.total} companies`);
   * ```
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
   * Get a single entity by its unique ID.
   *
   * @param entityId - The entity UUID.
   * @returns The {@link Entity} record with its properties and metadata.
   *
   * @example
   * ```ts
   * const entity = await client.entities.get("ent_abc123");
   *
   * console.log(entity.name);       // "Acme Corp"
   * console.log(entity.type);       // "company"
   * console.log(entity.properties); // { industry: "tech", size: "enterprise" }
   * ```
   */
  async get(entityId: string): Promise<Entity> {
    return await this.#client.request<Entity>(
      "GET",
      `/entities/${entityId}`,
    );
  }

  /**
   * Search entities by query text with optional type filter.
   *
   * Performs a text-based search across entity names and properties.
   * Results can be filtered by entity type and limited in count.
   *
   * @param params - Search parameters including query text, optional type filter, and result limit.
   * @returns An {@link EntityListResponse} with matching entities.
   *
   * @example
   * ```ts
   * const results = await client.entities.search({
   *   query: "cloud provider",
   *   type: "company",
   *   limit: 10,
   * });
   *
   * for (const entity of results.entities) {
   *   console.log(`${entity.name} (${entity.type})`);
   * }
   * ```
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
   * Get the entity relationship graph.
   *
   * Returns a graph of entities and their relationships. Optionally scoped
   * to a specific entity and traversal depth.
   *
   * @param opts - Optional graph parameters.
   * @param opts.entityId - Center the graph on this entity UUID.
   * @param opts.depth - Maximum traversal depth from the center entity. Defaults to API default.
   * @returns An {@link EntityGraphResponse} with graph nodes (entities) and edges (relationships).
   *
   * @example
   * ```ts
   * // Full graph
   * const graph = await client.entities.getGraph();
   *
   * // Scoped to a specific entity with depth limit
   * const graph = await client.entities.getGraph({
   *   entityId: "ent_abc123",
   *   depth: 2,
   * });
   *
   * console.log(graph.nodes.length); // 15
   * console.log(graph.edges.length); // 23
   * ```
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
   * Delete an entity permanently.
   *
   * Removes the entity from the knowledge graph. Relationships involving
   * this entity will also be removed.
   *
   * @param entityId - The entity UUID to delete.
   * @returns A promise that resolves when the deletion is complete.
   *
   * @example
   * ```ts
   * await client.entities.delete("ent_abc123");
   * ```
   */
  async delete(entityId: string): Promise<void> {
    return await this.#client.request(
      "DELETE",
      `/entities/${entityId}`,
    );
  }
}
