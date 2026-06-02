// Test env vars for routes/server modules that read process.env.
// Real values live in .env.local (gitignored).
process.env.SESSION_SECRET ||= '0'.repeat(64)
process.env.NONCE_SECRET ||= '1'.repeat(64)
process.env.SESSION_TTL_SECONDS ||= '604800'
process.env.NEXT_PUBLIC_WC_PROJECT_ID ||= 'test_project_id'
process.env.NEXT_PUBLIC_RPC_URL ||= 'https://eth-mainnet.test/v2/test'
