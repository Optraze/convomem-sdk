/**
 * Webhooks resource for the ConvoMem SDK.
 *
 * Manages webhook subscriptions for receiving real-time event notifications.
 * Webhooks allow your application to receive HTTP callbacks when events occur
 * in ConvoMem, such as new conversations, memory ingestion, or customer updates.
 *
 * @module
 */

import type { ConvoMemClient } from "../client.ts";
import type {
  Webhook,
  WebhookCreateRequest,
  WebhookUpdateRequest,
} from "../types.ts";

/**
 * Resource class for managing webhook subscriptions.
 *
 * Webhooks enable real-time event delivery to your application. Each webhook
 * is scoped to an organization and can subscribe to specific event types.
 * Payloads are signed with HMAC for verification.
 *
 * @example
 * ```ts
 * const client = new ConvoMemClient({ apiKey: "sk-org-abc", orgId: "org_1" });
 *
 * // Create a webhook
 * const webhook = await client.webhooks.create("org_abc123", {
 *   url: "https://your-app.com/webhooks/convomem",
 *   events: ["conversation.created", "memory.ingested"],
 *   secret: "whsec_your_hmac_secret",
 * });
 *
 * console.log(webhook.id); // "wh_new123"
 * ```
 */
export class WebhooksResource {
  #client: ConvoMemClient;

  constructor(client: ConvoMemClient) {
    this.#client = client;
  }

  /**
   * Create a new webhook subscription for an organization.
   *
   * Registers a new webhook that will receive HTTP POST callbacks when
   * subscribed events occur. The webhook URL must be publicly accessible
   * and respond with a 2xx status code.
   *
   * @param orgId - The organization UUID to create the webhook for.
   * @param request - The webhook creation payload with URL, events, and optional HMAC secret.
   * @returns The newly created {@link Webhook} record.
   *
   * @example
   * ```ts
   * const webhook = await client.webhooks.create("org_abc123", {
   *   url: "https://your-app.com/webhooks/convomem",
   *   events: ["conversation.created", "memory.ingested", "customer.updated"],
   *   secret: "whsec_your_hmac_secret",
   * });
   *
   * console.log(webhook.id);     // "wh_new123"
   * console.log(webhook.active); // true
   * ```
   */
  async create(orgId: string, request: WebhookCreateRequest): Promise<Webhook> {
    return await this.#client.request<Webhook>(
      "POST",
      `/orgs/${orgId}/webhooks`,
      { body: request },
    );
  }

  /**
   * List all webhook subscriptions for an organization.
   *
   * Returns all webhooks registered for the specified organization,
   * including their URLs, subscribed events, and active status.
   *
   * @param orgId - The organization UUID.
   * @returns An array of {@link Webhook} records.
   *
   * @example
   * ```ts
   * const webhooks = await client.webhooks.list("org_abc123");
   *
   * for (const wh of webhooks) {
   *   console.log(`${wh.url} - events: ${wh.events?.join(", ")} (active: ${wh.active})`);
   * }
   * ```
   */
  async list(orgId: string): Promise<Webhook[]> {
    return await this.#client.request<Webhook[]>(
      "GET",
      `/orgs/${orgId}/webhooks`,
    );
  }

  /**
   * Update an existing webhook subscription.
   *
   * Partially updates the webhook. Only provided fields are changed;
   * omitted fields remain unchanged.
   *
   * @param orgId - The organization UUID.
   * @param webhookId - The webhook UUID to update.
   * @param request - The update payload with fields to change (url, events, secret, active).
   * @returns The updated {@link Webhook} record.
   *
   * @example
   * ```ts
   * const updated = await client.webhooks.update("org_abc123", "wh_123", {
   *   events: ["conversation.created", "memory.ingested", "insight.generated"],
   *   active: true,
   * });
   * ```
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
   * Delete a webhook subscription permanently.
   *
   * Removes the webhook and stops all event delivery. This operation
   * is irreversible.
   *
   * @param orgId - The organization UUID.
   * @param webhookId - The webhook UUID to delete.
   * @returns A promise that resolves when the deletion is complete.
   *
   * @example
   * ```ts
   * await client.webhooks.delete("org_abc123", "wh_123");
   * ```
   */
  async delete(orgId: string, webhookId: string): Promise<void> {
    return await this.#client.request<void>(
      "DELETE",
      `/orgs/${orgId}/webhooks/${webhookId}`,
    );
  }
}
