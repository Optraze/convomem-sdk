/**
 * Error classes for the ConvoMem SDK.
 *
 * Provides structured error types for handling API and client-level failures.
 *
 * @module
 */

/**
 * Base error class for all ConvoMem SDK errors.
 *
 * This is the parent class for all errors thrown by the SDK. Use this
 * to catch any ConvoMem-related error regardless of its specific type.
 *
 * @example
 * ```ts
 * import { ConvoMemError } from "convomem";
 *
 * try {
 *   await client.memories.list();
 * } catch (err) {
 *   if (err instanceof ConvoMemError) {
 *     console.error("ConvoMem error:", err.message);
 *   }
 * }
 * ```
 */
export class ConvoMemError extends Error {
  /**
   * Creates a new ConvoMemError.
   *
   * @param message - A human-readable description of the error.
   */
  constructor(message: string) {
    super(message);
    this.name = "ConvoMemError";
  }
}

/**
 * Error thrown when the ConvoMem API returns a non-success HTTP status code.
 *
 * Extends {@link ConvoMemError} with additional context about the failed
 * API response, including the HTTP status code and optional response body.
 *
 * @example
 * ```ts
 * import { ConvoMemApiError } from "convomem";
 *
 * try {
 *   await client.customers.get("nonexistent_id");
 * } catch (err) {
 *   if (err instanceof ConvoMemApiError) {
 *     console.error(`API error ${err.status} on ${err.url}: ${err.message}`);
 *     if (err.body) {
 *       console.error("Response body:", err.body);
 *     }
 *   }
 * }
 * ```
 */
export class ConvoMemApiError extends ConvoMemError {
  /** The HTTP status code returned by the API (e.g., 400, 404, 500). */
  readonly status: number;

  /** The request URL that returned the error response. */
  readonly url: string;

  /** The parsed response body from the API, if available. */
  readonly body?: unknown;

  /**
   * Creates a new ConvoMemApiError.
   *
   * @param status - The HTTP status code from the API response.
   * @param message - A human-readable description of the error.
   * @param url - The request URL that returned the error response.
   * @param body - The parsed response body from the API, if available.
   */
  constructor(status: number, message: string, url: string, body?: unknown) {
    super(message);
    this.name = "ConvoMemApiError";
    this.status = status;
    this.url = url;
    this.body = body;
  }
}
