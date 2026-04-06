export class ZaloBotError extends Error {
  readonly errorCode?: number;
  readonly method: string;

  constructor(method: string, message: string, errorCode?: number) {
    super(message);
    this.name = 'ZaloBotError';
    this.method = method;
    this.errorCode = errorCode;
  }
}
