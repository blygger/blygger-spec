// Studio: login/logout (task 3) + a placeholder shell. The full studio UI
// (composer, list, edit, settings — task 9) is GATED on the wireframe review
// round with Venkat; do not build it here until that gate clears.

import { Hono } from "hono";
import { checkPassword, clearSessionCookie, issueSessionCookie, verifySession } from "./auth.ts";
import { layout } from "./pages.ts";
import type { Env } from "./types.ts";

function loginPage(error?: string): string {
  return layout(
    "ygg studio — login",
    `<h1>ygg studio</h1>
${error ? `<p style="color:#c00">${error}</p>` : ""}
<form method="post" action="/studio/login">
<p><input type="password" name="password" placeholder="password" autofocus required></p>
<p><button type="submit">log in</button></p>
</form>`,
  );
}

export const studio = new Hono<{ Bindings: Env }>({ strict: false });

studio.get("/login", async (c) => {
  if (await verifySession(c.env, c.req.header("cookie"))) return c.redirect("/studio");
  return c.html(loginPage());
});

studio.post("/login", async (c) => {
  const form = await c.req.formData();
  const password = String(form.get("password") ?? "");
  if (!(await checkPassword(c.env, password))) {
    return c.html(loginPage("Wrong password."), 403);
  }
  c.header("Set-Cookie", await issueSessionCookie(c.env));
  return c.redirect("/studio");
});

studio.post("/logout", (c) => {
  c.header("Set-Cookie", clearSessionCookie());
  return c.redirect("/studio/login");
});

// Auth-gated shell. Replaced by the real studio UI after wireframe review.
studio.get("/", (c) =>
  c.html(
    layout(
      "ygg studio",
      `<h1>ygg studio</h1>
<p>The studio UI lands after the wireframe review round (v0.1 task 9).
The API is live: <code>/api/items</code>, <code>/api/media</code>, <code>/api/settings</code>.</p>
<form method="post" action="/studio/logout"><button type="submit">log out</button></form>`,
    ),
  ),
);
