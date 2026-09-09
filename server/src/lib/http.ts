import { z, type ZodTypeAny } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ValidationError } from './errors.js';

/** Valide une entree avec zod et convertit l'echec en 422 structure. */
export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(
      result.error.issues.map((i) => ({
        field: i.path.join('.') || '(racine)',
        message: i.message,
        code: i.code
      }))
    );
  }
  return result.data;
}

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20)
});

export type Pagination = z.infer<typeof paginationSchema>;

export function toSkipTake({ page, pageSize }: Pagination) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export interface Paginated<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

export function paginated<T>(data: T[], total: number, { page, pageSize }: Pagination): Paginated<T> {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    data,
    meta: { page, pageSize, total, totalPages, hasNextPage: page < totalPages }
  };
}

/** Genere le JSON Schema OpenAPI a partir d'un schema zod. */
export function jsonSchema(schema: ZodTypeAny) {
  return zodToJsonSchema(schema, { $refStrategy: 'none', target: 'openApi3' }) as Record<
    string,
    unknown
  >;
}

/** Bloc `schema` Fastify (documentation Swagger uniquement, la validation reste zod). */
export function doc(options: {
  summary: string;
  description?: string;
  tags: string[];
  body?: ZodTypeAny;
  querystring?: ZodTypeAny;
  params?: ZodTypeAny;
  security?: boolean;
}) {
  return {
    summary: options.summary,
    description: options.description,
    tags: options.tags,
    ...(options.body ? { body: jsonSchema(options.body) } : {}),
    ...(options.querystring ? { querystring: jsonSchema(options.querystring) } : {}),
    ...(options.params ? { params: jsonSchema(options.params) } : {}),
    ...(options.security === false ? {} : { security: [{ bearerAuth: [] }] })
  };
}

export const idParamSchema = z.object({ id: z.string().min(1) });
