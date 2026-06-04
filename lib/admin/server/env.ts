import { z } from 'zod'

const AdminEnvSchema = z.object({
  adminSessionSecret: z.string().min(32, 'ADMIN_SESSION_SECRET must be at least 32 chars'),
  adminSessionTtl: z.coerce.number().int().positive().default(86400),
})

export type AdminEnv = z.infer<typeof AdminEnvSchema>

export function readAdminEnv(): AdminEnv {
  return AdminEnvSchema.parse({
    adminSessionSecret: process.env.ADMIN_SESSION_SECRET,
    adminSessionTtl: process.env.ADMIN_SESSION_TTL_SECONDS,
  })
}
