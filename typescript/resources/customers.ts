import type { ConvoMemClient } from "../client.ts";
import type {
  CustomerLookupParams,
  CustomerLookupResponse,
  CustomerCreateRequest,
  Customer,
  CustomerListResponse,
  CustomerUpdateRequest,
  HandoffParams,
  HandoffResponse,
} from "../types.ts";

export class CustomersResource {
  #client: ConvoMemClient;

  constructor(client: ConvoMemClient) {
    this.#client = client;
  }

  /**
   * Lookup customer by identifier with optional semantic memory.
   */
  async lookup(params: CustomerLookupParams): Promise<CustomerLookupResponse> {
    const query: Record<string, string> = {};
    if (params.customerId) query.customerId = params.customerId;
    if (params.phone) query.phone = params.phone;
    if (params.email) query.email = params.email;
    if (params.externalId) query.externalId = params.externalId;
    if (params.topic) query.topic = params.topic;
    if (params.autoCreate) query.autoCreate = params.autoCreate;
    if (params.userName) query.userName = params.userName;

    return this.#client.request<CustomerLookupResponse>(
      "GET",
      "/customers/lookup",
      { params: query },
    );
  }

  /**
   * Create a new customer.
   */
  async create(request: CustomerCreateRequest): Promise<Customer> {
    return this.#client.request<Customer>("POST", "/customers", {
      body: request,
    });
  }

  /**
   * List customers (paginated).
   */
  async list(opts?: {
    page?: number;
    limit?: number;
  }): Promise<CustomerListResponse> {
    const params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.limit) params.limit = String(opts.limit);

    return this.#client.request<CustomerListResponse>("GET", "/customers", {
      params,
    });
  }

  /**
   * Get a single customer by ID.
   */
  async get(id: string): Promise<Customer> {
    return this.#client.request<Customer>("GET", `/customers/${id}`);
  }

  /**
   * Update a customer.
   */
  async update(id: string, request: CustomerUpdateRequest): Promise<Customer> {
    return this.#client.request<Customer>("PATCH", `/customers/${id}`, {
      body: request,
    });
  }

  /**
   * Delete a customer permanently.
   */
  async delete(id: string): Promise<void> {
    return this.#client.request<void>("DELETE", `/customers/${id}`);
  }

  /**
   * Cross-channel agent handoff context.
   */
  async handoff(params: HandoffParams): Promise<HandoffResponse> {
    const query: Record<string, string> = {};
    if (params.customerId) query.customerId = params.customerId;
    if (params.phone) query.phone = params.phone;
    if (params.email) query.email = params.email;
    if (params.externalId) query.externalId = params.externalId;
    if (params.narrative) query.narrative = params.narrative;
    if (params.fresh) query.fresh = params.fresh;

    return this.#client.request<HandoffResponse>("GET", "/customers/handoff", {
      params: query,
    });
  }

  /**
   * Cross-channel agent handoff context (by customer ID).
   */
  async handoffById(
    id: string,
    opts?: { narrative?: "true" | "false"; fresh?: "true" | "false" },
  ): Promise<HandoffResponse> {
    const params: Record<string, string> = {};
    if (opts?.narrative) params.narrative = opts.narrative;
    if (opts?.fresh) params.fresh = opts.fresh;

    return this.#client.request<HandoffResponse>(
      "GET",
      `/customers/${id}/handoff`,
      { params },
    );
  }
}
