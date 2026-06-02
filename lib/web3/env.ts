import { z } from 'zod'

const PublicEnvSchema = z.object({
  wcProjectId: z.string().min(1, 'NEXT_PUBLIC_WC_PROJECT_ID is required'),
  rpcUrl: z.string().url('NEXT_PUBLIC_RPC_URL must be a URL'),
})

const ServerEnvSchema = z.object({
  sessionSecret: z.string().min(32, 'SESSION_SECRET must be at least 32 chars'),
  nonceSecret: z.string().min(32, 'NONCE_SECRET must be at least 32 chars'),
  sessionTtl: z.coerce.number().int().positive().default(604800),
})

export type PublicEnv = z.infer<typeof PublicEnvSchema>
export type ServerEnv = z.infer<typeof ServerEnvSchema>

export function readPublicEnv(): PublicEnv {
  return PublicEnvSchema.parse({
    wcProjectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID,
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
  })
}

export function readServerEnv(): ServerEnv {
  return ServerEnvSchema.parse({
    sessionSecret: process.env.SESSION_SECRET,
    nonceSecret: process.env.NONCE_SECRET,
    sessionTtl: process.env.SESSION_TTL_SECONDS,
  })
}
