import { z } from 'zod';

export const createAuditSchema = z.object({
  url: z.string().url('A valid HTTP/HTTPS URL is required'),
  focusKeyword: z.string().trim().max(100).optional().default('')
});

export const auditIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Audit ID must be a positive integer').transform(Number)
});
