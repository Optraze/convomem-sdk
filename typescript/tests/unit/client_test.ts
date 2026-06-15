import { beforeAll, describe, it } from "@std/testing/bdd";
import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { ConvoMemApiError, ConvoMemClient } from "../../mod.ts";

/** Creates a mock fetch that captures calls and returns predefined responses */
function mockFetch(response: unknown, status = 200) {
  const calls: { url: string; init?: RequestInit }[] = [];

  const fetch = (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push({ url, init });

    const body = response === undefined || response === null
      ? null
      : JSON.stringify(response);

    return Promise.resolve(
      new Response(body, {
        status,
        headers: body ? { "Content-Type": "application/json" } : undefined,
      }),
    );
  };

  return { fetch, calls };
}

describe("ConvoMemClient Unit", () => {
  let _client: ConvoMemClient;

  beforeAll(() => {
    _client = new ConvoMemClient({ apiKey: "test-key" });
  });

  describe("constructor", () => {
    it("creates client with default base URL", () => {
      const c = new ConvoMemClient({ apiKey: "key" });
      assertExists(c);
    });

    it("creates client with custom base URL", () => {
      const c = new ConvoMemClient({
        apiKey: "key",
        baseUrl: "http://localhost:8080/api/v1",
      });
      assertExists(c);
    });
  });

  describe("Capture", () => {
    it("sends POST /capture with correct body", async () => {
      const mock = mockFetch({
        conversationId: "conv-123",
        customerId: "cust-456",
        status: "active",
        isNewConversation: false,
        isNewCustomer: false,
      });

      const c = new ConvoMemClient({ apiKey: "test-key", fetch: mock.fetch });
      const result = await c.capture({
        message: "Hello",
        customerId: "cust-456",
      });

      assertEquals(result.conversationId, "conv-123");
      assertEquals(result.status, "active");
      assertEquals(mock.calls.length, 1);
      assertEquals(mock.calls[0].url.includes("/capture"), true);
      assertEquals(mock.calls[0].init?.method, "POST");

      const body = JSON.parse(mock.calls[0].init?.body as string);
      assertEquals(body.message, "Hello");
      assertEquals(body.customerId, "cust-456");
    });
  });

  describe("Customers", () => {
    it("sends GET /customers/{id}", async () => {
      const mock = mockFetch({
        id: "cust-123",
        name: "Test User",
        email: "test@example.com",
      });

      const c = new ConvoMemClient({ apiKey: "test-key", fetch: mock.fetch });
      const result = await c.customers.get("cust-123");

      assertEquals(result.id, "cust-123");
      assertEquals(result.name, "Test User");
      assertEquals(mock.calls[0].url.includes("/customers/cust-123"), true);
    });

    it("sends POST /customers with body", async () => {
      const mock = mockFetch({ id: "cust-new", name: "New User" });

      const c = new ConvoMemClient({ apiKey: "test-key", fetch: mock.fetch });
      const result = await c.customers.create({
        name: "New User",
        email: "new@example.com",
      });

      assertEquals(result.id, "cust-new");
      assertEquals(mock.calls[0].init?.method, "POST");

      const body = JSON.parse(mock.calls[0].init?.body as string);
      assertEquals(body.name, "New User");
      assertEquals(body.email, "new@example.com");
    });

    it("sends PATCH /customers/{id}", async () => {
      const mock = mockFetch({ id: "cust-123", name: "Updated" });

      const c = new ConvoMemClient({ apiKey: "test-key", fetch: mock.fetch });
      const result = await c.customers.update("cust-123", { name: "Updated" });

      assertEquals(result.name, "Updated");
      assertEquals(mock.calls[0].init?.method, "PATCH");

      const body = JSON.parse(mock.calls[0].init?.body as string);
      assertEquals(body.name, "Updated");
    });

    it("sends DELETE /customers/{id}", async () => {
      const mock = mockFetch(null, 204);

      const c = new ConvoMemClient({ apiKey: "test-key", fetch: mock.fetch });
      await c.customers.delete("cust-123");

      assertEquals(mock.calls[0].init?.method, "DELETE");
      assertEquals(mock.calls[0].url.includes("/customers/cust-123"), true);
    });

    it("sends GET /customers/lookup with query params", async () => {
      const mock = mockFetch({
        found: true,
        customer: { id: "cust-123", name: "Jane" },
        memories: [],
      });

      const c = new ConvoMemClient({ apiKey: "test-key", fetch: mock.fetch });
      const result = await c.customers.lookup({ phone: "+15551234567" });

      assertEquals(result.found, true);
      assertEquals(mock.calls[0].url.includes("/customers/lookup"), true);
      assertEquals(mock.calls[0].url.includes("phone=%2B15551234567"), true);
    });

    it("sends GET /customers with pagination", async () => {
      const mock = mockFetch({
        data: [{ id: "cust-1" }],
        page: 1,
        limit: 10,
        total: 1,
      });

      const c = new ConvoMemClient({ apiKey: "test-key", fetch: mock.fetch });
      const result = await c.customers.list({ page: 1, limit: 10 });

      assertEquals(result.customers.length, 1);
      assertEquals(mock.calls[0].url.includes("page=1"), true);
      assertEquals(mock.calls[0].url.includes("limit=10"), true);
    });
  });

  describe("Memories", () => {
    it("sends POST /customers/{id}/memories/ingest", async () => {
      const mock = mockFetch({ captureId: "cap-123", status: "queued" });

      const c = new ConvoMemClient({ apiKey: "test-key", fetch: mock.fetch });
      const result = await c.memories.ingest("cust-123", {
        messages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there!" },
        ],
      });

      assertEquals(result.captureId, "cap-123");
      assertEquals(mock.calls[0].url.includes("/memories/ingest"), true);

      const body = JSON.parse(mock.calls[0].init?.body as string);
      assertEquals(body.messages.length, 2);
    });

    it("sends GET /customers/{id}/memories", async () => {
      const mock = mockFetch({
        data: [{ id: "mem-1", fact: "Prefers morning deliveries" }],
        page: 1,
        limit: 20,
        total: 1,
      });

      const c = new ConvoMemClient({ apiKey: "test-key", fetch: mock.fetch });
      const result = await c.memories.list("cust-123");

      assertEquals(result.memories.length, 1);
      assertEquals(
        mock.calls[0].url.includes("/customers/cust-123/memories"),
        true,
      );
    });

    it("sends GET /customers/{id}/memories/lookup with topic", async () => {
      const mock = mockFetch({
        context: "Known facts...",
        tokenCount: 42,
        memories: [{ id: "mem-1", fact: "Prefers morning deliveries" }],
      });

      const c = new ConvoMemClient({ apiKey: "test-key", fetch: mock.fetch });
      const result = await c.memories.lookup("cust-123", {
        topic: "delivery preferences",
      });

      assertEquals(result.memories.length, 1);
      assertEquals(
        mock.calls[0].url.includes("topic=delivery+preferences"),
        true,
      );
    });

    it("sends PATCH /customers/{id}/memories/{memId}", async () => {
      const mock = mockFetch(null, 200);

      const c = new ConvoMemClient({ apiKey: "test-key", fetch: mock.fetch });
      await c.memories.update("cust-123", "mem-1", { fact: "Updated fact" });

      assertEquals(mock.calls[0].init?.method, "PATCH");
      assertEquals(mock.calls[0].url.includes("/memories/mem-1"), true);
    });

    it("sends DELETE /customers/{id}/memories/{memId}", async () => {
      const mock = mockFetch(null, 200);

      const c = new ConvoMemClient({ apiKey: "test-key", fetch: mock.fetch });
      await c.memories.delete("cust-123", "mem-1");

      assertEquals(mock.calls[0].init?.method, "DELETE");
      assertEquals(mock.calls[0].url.includes("/memories/mem-1"), true);
    });
  });

  describe("Conversations", () => {
    it("sends POST /customers/{id}/conversations", async () => {
      const mock = mockFetch({
        id: "conv-123",
        customerId: "cust-123",
        channel: "VOICE",
        status: "ACTIVE",
      });

      const c = new ConvoMemClient({ apiKey: "test-key", fetch: mock.fetch });
      const result = await c.conversations.start("cust-123", "VOICE");

      assertEquals(result.channel, "VOICE");
      assertEquals(result.status, "ACTIVE");

      const body = JSON.parse(mock.calls[0].init?.body as string);
      assertEquals(body.channel, "VOICE");
    });

    it("sends GET /customers/{id}/conversations", async () => {
      const mock = mockFetch({
        data: [{ id: "conv-1", channel: "CHAT", status: "ACTIVE" }],
        page: 1,
        limit: 20,
        total: 1,
      });

      const c = new ConvoMemClient({ apiKey: "test-key", fetch: mock.fetch });
      const result = await c.conversations.list("cust-123");

      assertEquals(result.conversations.length, 1);
      assertEquals(
        mock.calls[0].url.includes("/customers/cust-123/conversations"),
        true,
      );
    });

    it("sends PATCH /customers/{id}/conversations/{cid}", async () => {
      const mock = mockFetch({
        id: "conv-123",
        status: "COMPLETED",
        endedAt: "2026-01-15T11:45:00.000Z",
      });

      const c = new ConvoMemClient({ apiKey: "test-key", fetch: mock.fetch });
      const result = await c.conversations.end("cust-123", "conv-123", {
        outcome: "Resolved",
      });

      assertEquals(result.status, "COMPLETED");
      assertEquals(mock.calls[0].init?.method, "PATCH");
    });

    it("sends POST /customers/conversations/end (flat)", async () => {
      const mock = mockFetch(null, 200);

      const c = new ConvoMemClient({ apiKey: "test-key", fetch: mock.fetch });
      await c.conversations.endFlat({
        customerId: "cust-123",
        conversationId: "conv-123",
        outcome: "Resolved",
      });

      assertEquals(mock.calls[0].init?.method, "POST");
      assertEquals(
        mock.calls[0].url.includes("/customers/conversations/end"),
        true,
      );
    });

    it("sends PATCH /customers/{id}/conversations/{cid}/escalate", async () => {
      const mock = mockFetch({ id: "conv-123", status: "ESCALATED" });

      const c = new ConvoMemClient({ apiKey: "test-key", fetch: mock.fetch });
      const result = await c.conversations.escalate("cust-123", "conv-123", {
        reason: "Customer requested supervisor",
      });

      assertEquals(result.status, "ESCALATED");
      assertEquals(mock.calls[0].url.includes("/escalate"), true);
    });
  });

  describe("Handoff", () => {
    it("sends GET /customers/handoff with query params", async () => {
      const mock = mockFetch({
        found: true,
        customer: { id: "cust-123" },
        journey: [],
        keyMemories: [],
        sentimentTrend: { direction: "stable", current: 0 },
        openIssue: { isOpen: false },
        narrative: null,
        narrativeSource: "skipped",
      });

      const c = new ConvoMemClient({ apiKey: "test-key", fetch: mock.fetch });
      const result = await c.customers.handoff({ customerId: "cust-123" });

      assertEquals(result.found, true);
      assertEquals(mock.calls[0].url.includes("/customers/handoff"), true);
      assertEquals(mock.calls[0].url.includes("customerId=cust-123"), true);
    });

    it("sends GET /customers/{id}/handoff", async () => {
      const mock = mockFetch({
        found: true,
        customer: { id: "cust-123" },
        journey: [],
        keyMemories: [],
        sentimentTrend: { direction: "stable", current: 0 },
        openIssue: { isOpen: false },
        narrative: null,
        narrativeSource: "skipped",
      });

      const c = new ConvoMemClient({ apiKey: "test-key", fetch: mock.fetch });
      const result = await c.customers.handoffById("cust-123");

      assertEquals(result.found, true);
      assertEquals(
        mock.calls[0].url.includes("/customers/cust-123/handoff"),
        true,
      );
    });
  });

  describe("Embed", () => {
    it("sends POST /embed/tokens", async () => {
      const mock = mockFetch({
        token: "embed-token-123",
        expiresIn: 3600,
        scope: "handoff:read",
      });

      const c = new ConvoMemClient({ apiKey: "test-key", fetch: mock.fetch });
      const result = await c.embed.createToken({
        customerId: "cust-123",
        ttlSeconds: 3600,
      });

      assertEquals(result.token, "embed-token-123");
      assertEquals(result.scope, "handoff:read");
      assertEquals(mock.calls[0].url.includes("/embed/tokens"), true);
    });

    it("sends GET /embed/handoff with token", async () => {
      const mock = mockFetch({ found: true, customer: null });

      const c = new ConvoMemClient({ apiKey: "test-key", fetch: mock.fetch });
      await c.embed.getHandoff("my-token");

      assertEquals(mock.calls[0].url.includes("/embed/handoff"), true);
      assertEquals(mock.calls[0].url.includes("token=my-token"), true);
    });
  });

  describe("Error handling", () => {
    it("throws ConvoMemApiError on non-2xx response", async () => {
      const mock = mockFetch({ error: "Unauthorized" }, 401);

      const c = new ConvoMemClient({ apiKey: "test-key", fetch: mock.fetch });

      const err = await assertRejects(
        () => c.customers.get("cust-123"),
        ConvoMemApiError,
        "401",
      );
      assertEquals(err.status, 401);
    });

    it("includes response body in error", async () => {
      const mock = mockFetch({ error: "Not found", code: "NOT_FOUND" }, 404);

      const c = new ConvoMemClient({ apiKey: "test-key", fetch: mock.fetch });

      const err = await assertRejects(
        () => c.customers.get("cust-123"),
        ConvoMemApiError,
        "404",
      );
      assertEquals(err.status, 404);
      assertEquals(err.body, { error: "Not found", code: "NOT_FOUND" });
    });
  });

  describe("Auth headers", () => {
    it("sends X-API-Key header", async () => {
      const mock = mockFetch({ id: "cust-1" });

      const c = new ConvoMemClient({
        apiKey: "sk-org-my-key",
        fetch: mock.fetch,
      });
      await c.customers.get("cust-1");

      const headers = mock.calls[0].init?.headers as Record<string, string>;
      assertEquals(headers["X-API-Key"], "sk-org-my-key");
    });
  });
});
