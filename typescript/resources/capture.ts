import type { ConvoMemClient } from "../client.ts";
import type { CaptureRequest, CaptureResponse } from "../types.ts";

export class CaptureResource {
  #client: ConvoMemClient;

  constructor(client: ConvoMemClient) {
    this.#client = client;
  }

  /**
   * Capture a message and auto-manage session.
   * Resolves customer identity, finds or creates an active conversation,
   * enqueues the message for memory extraction, and returns session context.
   */
  async capture(request: CaptureRequest): Promise<CaptureResponse> {
    return this.#client.request<CaptureResponse>("POST", "/capture", {
      body: request,
    });
  }
}
