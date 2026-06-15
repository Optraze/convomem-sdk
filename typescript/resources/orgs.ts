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

export class OrgsResource {
  #client: ConvoMemClient;

  constructor(client: ConvoMemClient) {
    this.#client = client;
  }

  /**
   * Create a new organization.
   */
  async create(request: OrgCreateRequest): Promise<Org> {
    return await this.#client.request<Org>("POST", "/orgs", {
      body: request,
    });
  }

  /**
   * Get an organization by ID.
   */
  async get(orgId: string): Promise<Org> {
    return await this.#client.request<Org>("GET", `/orgs/${orgId}`);
  }

  /**
   * Update an organization.
   */
  async update(orgId: string, request: OrgUpdateRequest): Promise<Org> {
    return await this.#client.request<Org>("PATCH", `/orgs/${orgId}`, {
      body: request,
    });
  }

  /**
   * Add a member to an organization.
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
   * Get a member of an organization.
   */
  async getMember(orgId: string, uid: string): Promise<OrgMember> {
    return await this.#client.request<OrgMember>(
      "GET",
      `/orgs/${orgId}/members/${uid}`,
    );
  }

  /**
   * Update a member of an organization.
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
   */
  async removeMember(orgId: string, uid: string): Promise<void> {
    return await this.#client.request<void>(
      "DELETE",
      `/orgs/${orgId}/members/${uid}`,
    );
  }

  /**
   * Create an API key for an organization.
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
   * List API keys for an organization.
   */
  async listApiKeys(orgId: string): Promise<OrgApiKey[]> {
    return await this.#client.request<OrgApiKey[]>(
      "GET",
      `/orgs/${orgId}/api-keys`,
    );
  }

  /**
   * Delete an API key from an organization.
   */
  async deleteApiKey(orgId: string, keyId: string): Promise<void> {
    return await this.#client.request<void>(
      "DELETE",
      `/orgs/${orgId}/api-keys/${keyId}`,
    );
  }

  /**
   * Get audit logs for an organization.
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
