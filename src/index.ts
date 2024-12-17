import { authorizer } from "@openauthjs/openauth"
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare"
import {
  type ExecutionContext,
  type KVNamespace,
} from "@cloudflare/workers-types"
import { subjects } from "./subjects.js"
import { PasswordAdapter } from "@openauthjs/openauth/adapter/password"
import { PasswordUI } from "@openauthjs/openauth/ui/password"

interface Env {
  CloudflareAuthKV: KVNamespace
}

async function getUser(email: string) {
  // Get user from database
  // Return user ID
  return "123"
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return authorizer({
      storage: CloudflareStorage({
        namespace: env.CloudflareAuthKV,
      }),
      subjects,
      providers: {
        password: PasswordAdapter(
          PasswordUI({
            sendCode: async (email, code) => {
              console.log(email, code)
            },
          }),
        ),
      },
      success: async (ctx, value) => {
        if (value.provider === "password") {
          return ctx.subject("user", {
            id: await getUser(value.email),
            email: value.email,
            name: "John Doe",
            providers: "password",
          })
        }
        throw new Error("Invalid provider")
      },
    }).fetch(request, env, ctx)
  },
}