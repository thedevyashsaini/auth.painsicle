import { z } from 'zod'
import { createSubjects } from "@openauthjs/openauth"

export const subjects = createSubjects({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    providers: z.string(),
    pfp: z.string(),
  }),
})