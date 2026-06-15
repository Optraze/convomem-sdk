import type { ConvoMemClient } from "../client.ts";
import type {
  Webhook,
  WebhookCreateRequest,
  WebhookUpdateRequest,
} from "../types.ts";

export class WebhooksResource {
  #client: ConvoMemClient;

  constructor(client: ConvoMemClient) {
    this.#client = client;
  }

  /**
   * Create a new webhook for an organization.
   */
  async create(orgId: string, request: WebhookCreateRequest): Promise<Webhook> {
    return await this.#client.request<Webhook>(
      "POST",
      `/orgs/${orgId}/webhooks`,
      { body: request },
    );
  }

  /**
   * List all webhooks for an organization.
   */
  async list(orgId: string): Promise<Webhook[]> {
    return await this.#client.request<Webhook[]>(
      "GET",
      `/orgs/${orgId}/webhooks`,
    );
  }

  /**
   * Update an existing webhook.
   */
  async update(
    orgId: string,
    webhookId: string,
    request: WebhookUpdateRequest,
  ): Promise<Webhook> {
    return await this.#client.request<Webhook>(
      "PATCH",
      `/orgs/${orgId}/webhooks/${webhookId}`,
      { body: request },
    );
  }

  /**
   * Delete a webhook.
   */
  async delete(orgId: string, webhookId: string): Promise<void> {
    return await this.#client.request<void>(
      "DELETE",
      `/orgs/${orgId}/webhooks/${webhookId}`,
    );
  }
}
