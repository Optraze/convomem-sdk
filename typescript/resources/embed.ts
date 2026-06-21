/**
 * Embed resource for the ConvoMem SDK.
 *
 * Provides token-based authentication for embedding the ConvoMem agent handoff
 * panel into external applications. Mint short-lived tokens and use them to
 * fetch handoff context via the public embed endpoint.
 *
 * @module
 */

import type { ConvoMemClient } from "../client.ts";
import type { EmbedTokenRequest, EmbedTokenResponse, HandoffResponse } from "../types.ts";

/**
 * Resource class for managing embed tokens and handoff context.
 *
 * The embed system allows external applications to securely access customer
 * handoff data without exposing API keys. Tokens are short-lived and scoped
 * to a specific customer.
 *
 * @example
 * ```ts
 * const client = new ConvoMemClient({ apiKey: "sk-org-abc" });
 *
 * // Mint a token for the handoff panel
 * const { token } = await client.embed.createToken({ customerId: "cust_abc123" });
 *
 * // Use the token to fetch handoff context (public endpoint, no API key needed)
 * const handoff = await client.embed.getHandoff(token);
 * ```
 */
export class EmbedResource {
  #client: ConvoMemClient;

  /**
   * @internal
   * Instances are created automatically by {@link ConvoMemClient}.
   */
  constructor(client: ConvoMemClient) {
    this.#client = client;
  }

  /**
   * Mint a short-lived embed token for the agent handoff panel.
   *
   * Generates a time-limited token that can be used to securely access
   * customer handoff context from the public embed endpoint. The token
   * is scoped to a specific customer and expires after the configured TTL.
   *
   * @param request - The token request with customer identity and optional TTL.
   * @param opts - Optional settings.
   * @param opts.signal - An {@link AbortSignal} to cancel the request.
   * @returns An {@link EmbedTokenResponse} with the token string, expiration time, and scope.
   *
   * @example
   * ```ts
   * const { token, expiresIn, scope } = await client.embed.createToken({
   *   customerId: "cust_abc123",
   *   ttlSeconds: 1800, // 30 minutes
   * });
   *
   * console.log(token);      // "emb_xyz789..."
   * console.log(expiresIn);  // 1800
   * console.log(scope);      // "customer"
   * ```
   */
  async createToken(
    request: EmbedTokenRequest,
    opts?: { signal?: AbortSignal },
  ): Promise<EmbedTokenResponse> {
    return await this.#client.request<EmbedTokenResponse>(
      "POST",
      "/embed/tokens",
      {
        body: request,
        signal: opts?.signal,
      },
    );
  }

  /**
   * Fetch handoff context using an embed token (public endpoint).
   *
   * Retrieves the customer handoff briefing using a previously minted embed
   * token. This is a public endpoint that does not require an API key —
   * authentication is handled by the token itself.
   *
   * @param token - The embed token obtained from {@link createToken}.
   * @param opts - Optional settings.
   * @param opts.signal - An {@link AbortSignal} to cancel the request.
   * @returns A {@link HandoffResponse} with customer record, journey, key memories, and sentiment trend.
   *
   * @example
   * ```ts
   * // First, mint a token (server-side, with API key)
   * const { token } = await client.embed.createToken({ customerId: "cust_abc123" });
   *
   * // Then, use the token from the client-side (no API key needed)
   * const handoff = await client.embed.getHandoff(token);
   *
   * console.log(handoff.customer);  // Customer record
   * console.log(handoff.journey);   // Conversation history
   * ```
   */
  async getHandoff(
    token: string,
    opts?: { signal?: AbortSignal },
  ): Promise<HandoffResponse> {
    return await this.#client.request<HandoffResponse>("GET", "/embed/handoff", {
      params: { token },
      signal: opts?.signal,
    });
  }
}
