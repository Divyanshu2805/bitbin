# Coding Conventions

The patterns the codebase already follows. Match them rather than introducing a second way of doing the same thing.

## Layering

- Pages (`src/app/**/page.tsx`) are server components: call `auth()`, redirect when signed out, load data with `Promise.all` over `lib/db` functions, render.
- Client components call **server actions** for writes, or `fetch` a route handler when HTTP is required (uploads, the drawer's item fetch, Stripe redirects).
- Queries live in `src/lib/db/`. Integrations live in thin wrappers in `src/lib/`. See the [module map](../architecture/module-map.md#layering-rules).

## Server actions

A new action looks like the existing ones:

```ts
'use server';

const renameSchema = z.object({ title: z.string().trim().min(1, 'Title is required') });

export async function renameItem(itemId: string, input: z.infer<typeof renameSchema>): Promise<ActionResult<ItemDetail>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const idError = validateId(itemId, 'item ID');
  if (idError) return idError;

  const parsed = renameSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Validation failed', fieldErrors: parseZodErrors(parsed.error) };
  }

  const updated = await renameItemQuery(session.user.id, itemId, parsed.data);
  if (!updated) return { success: false, error: 'Item not found or access denied' };

  return { success: true, data: updated };
}
```

- Session first, then validation, then plan / rate-limit checks, then the query.
- `safeParse`, never `parse`. Never `throw` to the client.
- Pass `session.user.id` to `lib/db`; never accept a user id in the input.
- Error strings are user-facing sentences.

## Route handlers

- `auth()` first; return `401` JSON without a session.
- Return `NextResponse.json({ error }, { status })` for every failure, with the status that matches the [error table](../api/errors-and-rate-limits.md#route-handlers).
- Wrap the body in `try/catch`, `console.error` the real error with context, and return a generic `500` message.
- Only add a route handler when a server action can't do the job — a public URL (auth emails, webhooks), streaming bytes, or a non-browser caller.

## Queries (`lib/db`)

- Every function takes `userId` as its first parameter and filters or checks ownership with it. Return `null` / `false` for "not found or not yours" and let the caller turn that into a message.
- List queries `select` only what the card renders; load full content only for detail views.
- Clamp caller-supplied limits (`MAX_QUERY_LIMIT` = 100) and use the constants in `lib/constants/pagination.ts`.
- Use `connectOrCreate` for tags, and a transaction when several writes must succeed together.

## Validation

- Zod schemas live next to the action that uses them. Shared pieces (`safeUrlSchema`, `validateId`, `parseZodErrors`) are in `lib/validation.ts`.
- Any URL that will be rendered as a link goes through `safeUrlSchema`.

## Components

- Server components by default; add `'use client'` only for state, effects or event handlers.
- shadcn/ui primitives in `components/ui/` keep their APIs; restyle, don't fork.
- After a successful mutation: toast (Sonner), then `router.refresh()`.
- Use the shared pieces — `PageHeader`, `EmptyState`, `ConfirmDeleteDialog`, `Pagination`, `ItemTypeIcon` — before writing a new one. See the [design system](design-system.md).

## Naming and style

- Files are kebab-case (`item-card.tsx`), except the homepage sections, which are PascalCase.
- Types for query results are exported from the `lib/db` module that produces them (`ItemWithType`, `ItemDetail`).
- The `@/` alias points at `src/`.
- `npm run lint` must pass; the React Compiler is on, so follow the rules of hooks strictly.

## What to avoid

- Importing `prisma` in a component or a new page — add a `lib/db` function.
- `prisma db push` — see [migrations](../schema/migrations-and-seeding.md).
- Checking Pro in the UI only. Every limit is enforced on the server.
- Logging secrets, tokens or full request bodies.
- Adding a global client store — a small context next to the feature is the pattern.
