import { ZodError, ZodType } from 'zod';

export class RequestValidationError extends Error {
  statusCode: number;
  details: ReturnType<ZodError['flatten']>;

  constructor(message: string, error: ZodError, statusCode = 400) {
    super(message);
    this.name = 'RequestValidationError';
    this.statusCode = statusCode;
    this.details = error.flatten();
  }
}

export function parseWithSchema<TSchema extends ZodType>(
  schema: TSchema,
  data: unknown,
  message = 'Invalid request payload'
) {
  const parsed = schema.safeParse(data);

  if (!parsed.success) {
    throw new RequestValidationError(message, parsed.error);
  }

  return parsed.data;
}
