import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { assertEquals, assertExists, assertNotEquals } from "@std/assert";
import { ConvoMemClient } from "../../mod.ts";

// Destructive live fixtures must target an explicitly selected environment.
const API_KEY = Deno.env.get("CONVOMEM_API_KEY");
const BASE_URL = Deno.env.get("CONVOMEM_BASE_URL");
describe({
  name: "ConvoMemClient Integration",
  ignore: !API_KEY || !BASE_URL,
  fn: () => {
    let client: ConvoMemClient;
    let customerId: string;
    const customerEmail = `test-${crypto.randomUUID()}@example.com`;

    beforeAll(() => {
      client = new ConvoMemClient({
        apiKey: API_KEY!,
        baseUrl: BASE_URL!,
      });
    });

    describe("Customers", () => {
      it("creates a new customer", async () => {
        const customer = await client.customers.create({
          name: "Test User",
          email: customerEmail,
          phone: `+1555${String(Date.now()).slice(-7)}`,
          metadata: { source: "sdk-test" },
        });

        assertExists(customer.id);
        assertEquals(customer.name, "Test User");
        customerId = customer.id;
      });

      it("gets a customer by ID", async () => {
        const customer = await client.customers.get(customerId);
        assertEquals(customer.id, customerId);
        assertEquals(customer.name, "Test User");
      });

      it("lists customers", async () => {
        const result = await client.customers.list({ page: 1, limit: 10 });
        assertExists(result.customers);
        assertEquals(Array.isArray(result.customers), true);
      });

      it("updates a customer", async () => {
        const updated = await client.customers.update(customerId, {
          name: "Updated Test User",
          metadata: { source: "sdk-test", updated: true },
        });
        assertEquals(updated.name, "Updated Test User");
      });

      it("looks up customer by email", async () => {
        const result = await client.customers.lookup({
          email: customerEmail,
        });
        assertEquals(result.found, true);
      });
    });

    describe("Conversations", () => {
      let conversationId: string;

      it("starts a conversation", async () => {
        const conv = await client.conversations.start(customerId, "CHAT");
        assertExists(conv.id);
        assertEquals(conv.channel, "CHAT");
        assertEquals(conv.status, "ACTIVE");
        conversationId = conv.id;
      });

      it("lists conversations", async () => {
        const result = await client.conversations.list(customerId);
        assertExists(result.conversations);
        assertEquals(Array.isArray(result.conversations), true);
      });

      it("ends a conversation", async () => {
        const conv = await client.conversations.end(
          customerId,
          conversationId,
          {
            outcome: "Test conversation completed",
          },
        );
        assertEquals(conv.status, "COMPLETED");
      });
    });

    describe("Memories", () => {
      it("ingests a conversation for memory extraction", async () => {
        const result = await client.memories.ingest(customerId, {
          messages: [
            {
              role: "user",
              content: "I prefer morning deliveries before 9 AM",
            },
            {
              role: "assistant",
              content:
                "Got it! I'll note your preference for morning deliveries.",
            },
          ],
          channel: "CHAT",
        });
        assertExists(result.captureId);
        assertEquals(result.status, "queued");
      });

      it("lists customer memories", async () => {
        const result = await client.memories.list(customerId);
        assertExists(result.memories);
        assertEquals(Array.isArray(result.memories), true);
      });
    });

    describe("Capture", () => {
      it("captures a single message", async () => {
        const result = await client.capture({
          message: "Hello from SDK test",
          customerId: customerId,
          channel: "CHAT",
        });
        assertExists(result.conversationId);
        assertExists(result.customerId);
        assertNotEquals(result.status, undefined);
      });
    });

    describe("Handoff", () => {
      it("gets handoff context by customer ID", async () => {
        const result = await client.customers.handoffById(customerId, {
          narrative: "false",
        });
        assertExists(result.found);
      });
    });

    describe("Embed", () => {
      it("creates an embed token", async () => {
        const result = await client.embed.createToken({
          customerId: customerId,
          ttlSeconds: 300,
        });
        assertExists(result.token);
        assertExists(result.expiresIn);
        assertEquals(result.scope, "handoff:read");
      });
    });

    afterAll(async () => {
      // Cleanup: delete test customer
      if (customerId) {
        try {
          await client.customers.delete(customerId);
        } catch {
          // Ignore cleanup errors
        }
      }
    });
  },
});
