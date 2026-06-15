export class ConvoMemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConvoMemError";
  }
}

export class ConvoMemApiError extends ConvoMemError {
  readonly status: number;
  readonly body?: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ConvoMemApiError";
    this.status = status;
    this.body = body;
  }
}
