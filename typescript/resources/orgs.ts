/**
 * Organizations resource for the ConvoMem SDK.
 *
 * Manages organization records, members, API keys, and audit logs. Organizations
 * are the top-level tenant boundary — all customers, memories, conversations,
 * and API keys are scoped to an organization.
 *
 * @module
 */

import type { ConvoMemClient } from "../client.ts";
import type {
  Org,
  OrgApiKey,
  OrgApiKeyCreateRequest,
  OrgAuditLog,
  OrgCreateRequest,
  OrgMember,
  OrgMemberAddRequest,
  OrgMemberUpdateRequest,
  OrgUpdateRequest,
} from "../types.ts";

/**
 * Resource class for managing organizations, members, API keys, and audit logs.
 *
 * Organizations are the top-level tenant boundary in ConvoMem. Use this resource
 * to create and manage orgs, invite members, rotate API keys, and review
 * audit logs.
 *
 * @example
 * ```ts
 * const client = new ConvoMemClient({ apiKey: "sk-org-abc", orgId: "org_1" });
 *
 * // Create an organization
 * const org = await client.orgs.create({ name: "Acme Corp", plan: "enterprise" });
 *
 * // Add a member
 * await client.orgs.addMember(org.id, { uid: "user_123", role: "admin" });
 * ```
 */
export class OrgsResource {
  #client: ConvoMemClient;

  constructor(client: ConvoMemClient) {
    this.#client = client;
  }

  /**
   * Create a new organization.
   *
   * Creates a new organization in the ConvoMem platform. The creating user
   * is automatically assigned the owner role.
   *
   * @param request - The organization creation payload with name and optional plan.
   * @returns The newly created {@link Org} record.
   *
   * @example
   * ```ts
   * const org = await client.orgs.create({
   *   name: "Acme Corp",
   *   plan: "enterprise",
   * });
   *
   * console.log(org.id); // "org_new789"
   * ```
   */
  async create(request: OrgCreateRequest): Promise<Org> {
    return await this.#client.request<Org>("POST", "/orgs", {
      body: request,
    });
  }

  /**
   * Get an organization by its unique ID.
   *
   * @param orgId - The organization UUID.
   * @returns The {@link Org} record.
   *
   * @example
   * ```ts
   * const org = await client.orgs.get("org_abc123");
   *
   * console.log(org.name); // "Acme Corp"
   * console.log(org.plan); // "enterprise"
   * ```
   */
  async get(orgId: string): Promise<Org> {
    return await this.#client.request<Org>("GET", `/orgs/${orgId}`);
  }

  /**
   * Update an existing organization.
   *
   * Partially updates the organization. Only provided fields are changed.
   *
   * @param orgId - The organization UUID.
   * @param request - The update payload with fields to change (name, plan).
   * @returns The updated {@link Org} record.
   *
   * @example
   * ```ts
   * const updated = await client.orgs.update("org_abc123", {
   *   name: "Acme Corporation",
   *   plan: "pro",
   * });
   * ```
   */
  async update(orgId: string, request: OrgUpdateRequest): Promise<Org> {
    return await this.#client.request<Org>("PATCH", `/orgs/${orgId}`, {
      body: request,
    });
  }

  /**
   * Add a member to an organization.
   *
   * Invites or adds a user to the organization with the specified role.
   *
   * @param orgId - The organization UUID.
   * @param request - The member add payload with user ID and role.
   * @returns The newly created {@link OrgMember} record.
   *
   * @example
   * ```ts
   * const member = await client.orgs.addMember("org_abc123", {
   *   uid: "user_456",
   *   role: "admin",
   * });
   *
   * console.log(member.role); // "admin"
   * ```
   */
  async addMember(
    orgId: string,
    request: OrgMemberAddRequest,
  ): Promise<OrgMember> {
    return await this.#client.request<OrgMember>(
      "POST",
      `/orgs/${orgId}/members`,
      {
        body: request,
      },
    );
  }

  /**
   * Get a member of an organization by user ID.
   *
   * @param orgId - The organization UUID.
   * @param uid - The user UUID.
   * @returns The {@link OrgMember} record.
   *
   * @example
   * ```ts
   * const member = await client.orgs.getMember("org_abc123", "user_456");
   *
   * console.log(member.role);    // "admin"
   * console.log(member.joinedAt); // "2025-01-15T10:30:00Z"
   * ```
   */
  async getMember(orgId: string, uid: string): Promise<OrgMember> {
    return await this.#client.request<OrgMember>(
      "GET",
      `/orgs/${orgId}/members/${uid}`,
    );
  }

  /**
   * Update a member's role in an organization.
   *
   * @param orgId - The organization UUID.
   * @param uid - The user UUID.
   * @param request - The update payload with the new role.
   * @returns The updated {@link OrgMember} record.
   *
   * @example
   * ```ts
   * const updated = await client.orgs.updateMember("org_abc123", "user_456", {
   *   role: "owner",
   * });
   * ```
   */
  async updateMember(
    orgId: string,
    uid: string,
    request: OrgMemberUpdateRequest,
  ): Promise<OrgMember> {
    return await this.#client.request<OrgMember>(
      "PATCH",
      `/orgs/${orgId}/members/${uid}`,
      { body: request },
    );
  }

  /**
   * Remove a member from an organization.
   *
   * @param orgId - The organization UUID.
   * @param uid - The user UUID to remove.
   * @returns A promise that resolves when the removal is complete.
   *
   * @example
   * ```ts
   * await client.orgs.removeMember("org_abc123", "user_456");
   * ```
   */
  async removeMember(orgId: string, uid: string): Promise<void> {
    return await this.#client.request<void>(
      "DELETE",
      `/orgs/${orgId}/members/${uid}`,
    );
  }

  /**
   * Create a new API key for an organization.
   *
   * Generates a new API key that can be used to authenticate SDK requests.
   * The key value is only returned on creation — store it securely.
   *
   * @param orgId - The organization UUID.
   * @param request - Optional key creation payload with a human-readable name.
   * @returns The newly created {@link OrgApiKey} record including the key value.
   *
   * @example
   * ```ts
   * const apiKey = await client.orgs.createApiKey("org_abc123", {
   *   name: "Production Key",
   * });
   *
   * console.log(apiKey.key); // "sk-org-xyz789..." (only shown once!)
   * console.log(apiKey.prefix); // "sk-org-xyz..."
   * ```
   */
  async createApiKey(
    orgId: string,
    request?: OrgApiKeyCreateRequest,
  ): Promise<OrgApiKey> {
    return await this.#client.request<OrgApiKey>(
      "POST",
      `/orgs/${orgId}/api-keys`,
      { body: request },
    );
  }

  /**
   * List all API keys for an organization.
   *
   * Returns all API keys associated with the organization. Key values are
   * not included — only prefixes and metadata are returned.
   *
   * @param orgId - The organization UUID.
   * @returns An array of {@link OrgApiKey} records.
   *
   * @example
   * ```ts
   * const keys = await client.orgs.listApiKeys("org_abc123");
   *
   * for (const key of keys) {
   *   console.log(`${key.name}: ${key.prefix} (last used: ${key.lastUsedAt})`);
   * }
   * ```
   */
  async listApiKeys(orgId: string): Promise<OrgApiKey[]> {
    return await this.#client.request<OrgApiKey[]>(
      "GET",
      `/orgs/${orgId}/api-keys`,
    );
  }

  /**
   * Delete an API key from an organization.
   *
   * Permanently revokes the API key. Any requests using this key will
   * immediately fail authentication.
   *
   * @param orgId - The organization UUID.
   * @param keyId - The API key UUID to delete.
   * @returns A promise that resolves when the deletion is complete.
   *
   * @example
   * ```ts
   * await client.orgs.deleteApiKey("org_abc123", "key_xyz789");
   * ```
   */
  async deleteApiKey(orgId: string, keyId: string): Promise<void> {
    return await this.#client.request<void>(
      "DELETE",
      `/orgs/${orgId}/api-keys/${keyId}`,
    );
  }

  /**
   * Get audit logs for an organization with pagination.
   *
   * Returns a paginated list of audit log entries recording all significant
   * actions performed within the organization (member changes, key rotations,
   * etc.).
   *
   * @param orgId - The organization UUID.
   * @param opts - Optional pagination parameters.
   * @param opts.page - Page number (1-indexed). Defaults to 1.
   * @param opts.limit - Maximum number of log entries per page. Defaults to API default.
   * @returns An array of {@link OrgAuditLog} entries.
   *
   * @example
   * ```ts
   * const logs = await client.orgs.getAuditLogs("org_abc123", { page: 1, limit: 50 });
   *
   * for (const log of logs) {
   *   console.log(`${log.action} by ${log.actor} at ${log.createdAt}`);
   * }
   * ```
   */
  async getAuditLogs(
    orgId: string,
    opts?: { page?: number; limit?: number },
  ): Promise<OrgAuditLog[]> {
    const params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.limit) params.limit = String(opts.limit);

    return await this.#client.request<OrgAuditLog[]>(
      "GET",
      `/orgs/${orgId}/audit-logs`,
      { params },
    );
  }
}
