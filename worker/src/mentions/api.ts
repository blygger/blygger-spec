// Owner API for mentions — the two editorial controls over the public
// responses list (§3.4). Neither touches items/versions: showing responses is
// a property of the item's *page*, and hiding one is a property of the
// mention row, so neither is a publish event and neither bumps a version.

import { Hono } from "hono";
import { getItem } from "../model.ts";
import type { Env } from "../types.ts";
import { getInbound, setMentionHidden } from "./store.ts";

export const mentionsApi = new Hono<{ Bindings: Env }>({ strict: false });

/** Opt in (or back out of) showing verified responses on one item's page. */
mentionsApi.put("/items/:id/responses", async (c) => {
  const item = await getItem(c.env.DB, c.req.param("id"));
  if (!item) return c.json({ error: "not found" }, 404);
  const body = await c.req.json<{ show?: boolean }>().catch(() => ({}) as { show?: boolean });
  if (typeof body.show !== "boolean") return c.json({ error: "show must be a boolean" }, 400);
  await c.env.DB.prepare("UPDATE items SET show_responses = ? WHERE id = ?").bind(body.show ? 1 : 0, item.id).run();
  return c.json({ ok: true, show_responses: body.show });
});

/**
 * Take one response off the page, or put it back. Deliberately reversible and
 * deliberately not a delete: the row stays in the studio, because "I don't
 * want this on my page" and "this never happened" are different claims.
 */
mentionsApi.put("/mentions/:id/hidden", async (c) => {
  const row = await getInbound(c.env.DB, c.req.param("id"));
  if (!row) return c.json({ error: "not found" }, 404);
  const body = await c.req.json<{ hidden?: boolean }>().catch(() => ({}) as { hidden?: boolean });
  if (typeof body.hidden !== "boolean") return c.json({ error: "hidden must be a boolean" }, 400);
  await setMentionHidden(c.env.DB, row.id, body.hidden);
  return c.json({ ok: true, hidden: body.hidden });
});
