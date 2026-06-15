import type { ConvoMemClient } from "../client.ts";
import type { EmbedTokenRequest, EmbedTokenResponse } from "../types.ts";

export class EmbedResource {
  #client: ConvoMemClient;

  constructor(client: ConvoMemClient) {
    this.#client = client;
  }

  /**
   * Mint a short-lived embed token for the agent handoff panel.
   */
  async createToken(request: EmbedTokenRequest): Promise<EmbedTokenResponse> {
    return await this.#client.request<EmbedTokenResponse>(
      "POST",
      "/embed/tokens",
      {
        body: request,
      },
    );
  }

  /**
   * Fetch handoff context with an embed token (public endpoint).
   */
  async getHandoff(token: string): Promise<unknown> {
    return await this.#client.request("GET", "/embed/handoff", {
      params: { token },
    });
  }
}
