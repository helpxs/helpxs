import { betterAuth } from "better-auth"
import { organization } from "better-auth/plugins"

type Env = {
  DB: D1Database
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
}

export function createAuth(env: Env) {
  return betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    // Vite dev runs on :5173 and proxies /api to :8787; the browser sends the
    // :5173 Origin, which better-auth otherwise rejects. Production is
    // single-origin (Worker serves both SPA + /api), so the prod URL is the
    // baseURL itself.
    trustedOrigins: [
      "http://localhost:5173",
      "http://localhost:8787",
      env.BETTER_AUTH_URL,
    ],
    emailAndPassword: {
      enabled: true,
    },
    plugins: [organization()],
  })
}

export type Auth = ReturnType<typeof createAuth>
