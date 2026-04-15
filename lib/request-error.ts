export class AppRouteError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "AppRouteError";
    this.status = status;
  }
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export function getErrorStatus(error: unknown, fallback = 500) {
  if (error instanceof AppRouteError) {
    return error.status;
  }

  return fallback;
}
