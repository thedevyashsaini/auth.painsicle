import { db } from './db/index.js';
import { usersTable, SelectUser } from './db/schema.js';
import { authorizer } from "@openauthjs/openauth"
import { MemoryStorage } from "@openauthjs/openauth/storage/memory"
import { PasswordAdapter } from "@openauthjs/openauth/adapter/password"
import { GithubAdapter } from "@openauthjs/openauth/adapter/github";
import { PasswordUI } from "@openauthjs/openauth/ui/password"
import { handle } from "hono/vercel"
// import { serve } from "@hono/node-server"
import { subjects } from "./subjects.js"

async function getUser(email: string): Promise<SelectUser> {
  // Get user from database
  // Return user ID
  return { id: "1", email, name: "Test User", providers: JSON.stringify(["password"]), password: null }
}

const app = authorizer({
  subjects,
  storage: MemoryStorage({
    persist: "./persist.json",
  }),
  providers: {
    password: PasswordAdapter(
      PasswordUI({
        sendCode: async (email, code) => {
          console.log(email, code)
        },
      }),
    ),
    github: GithubAdapter({
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      scopes: ["user:email", "user:name"],
    })
  },
  success: async (ctx, value) => {
    if (value.provider === "password") {
      return ctx.subject("user", {
        id: (await getUser(value.email)).id,
        email: value.email,
        name: "sasa",
        providers: JSON.stringify(["password"]),
      })
    } else if (value.provider === "github") {
      console.log(value.tokenset);
      return ctx.subject("user", {
        id: "1",
        email: "test@gmail.com",
        name: "Test User",
        providers: JSON.stringify(["github"]),
      });
    }
    throw new Error("Invalid provider")
  },
})

console.log("Server started")

export const handler = handle(app)
// serve(app)