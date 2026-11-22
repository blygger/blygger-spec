# TN-8 — Where does my change belong? A contributor's map

**Technical note · non-normative · 2026-11-21 (session 78).** First written for the
2026 hackathon as `blygger-studio/docs/where-does-it-go.md` (session 74, 2026-11-18) and
published at [blygger.org/contribute/](https://blygger.org/contribute/); made a note so
that it is numbered, cited and announced like the others (Venkat, session 78). It maps
where a change belongs across the four repositories, with the Studio as the worked
example: the protocol decides nothing here, and other clients may draw their own ladder.
Revised as the Studio changes; the studio file is now a pointer to this one. **v2, the same
day** (Fable 5.2 review): rung 1 no longer gives part of §16.8's list as the whole.

You have an idea for a blyg: a feature, a fix, a tool, a different look. Before you write any code, decide where it goes. There are eight places, from a request for a protocol ruling to a client of your own. Each has a different cost to you and to everyone else, and a change built in the wrong place is usually rebuilt later.

This page is the map. It links to the documents that explain each place and does not repeat them. If you are new, read the ladder below, then do the [first hour](#your-first-hour).

## The ladder

Answer these questions in order and **stop at the first yes**.

| # | Question | Then it is | It goes to |
|---|---|---|---|
| 1 | Would it change the bytes another blyg or reader receives (an item document, the feed, `blyg.json`, `content_html`), or would another client have to change to work with it? | **A spec question.** Nothing is built until it is ruled | An issue on [blygger-spec](https://github.com/blygger/blygger-spec/issues/new/choose) |
| 2 | Is it a bug, or something every blyg would want with no setting? | **A pull request to the Studio** | [blygger-studio](https://github.com/blygger/blygger-studio) |
| 3 | Can it be done from outside, with a token, through `{mount}/api` and Settings, with no code inside the Studio? | **A tool or configuration** | Your own repository |
| 4 | Is it interface for one owner, in the browser, in a slot that already exists? | **An extension** | [blygger-studio](https://github.com/blygger/blygger-studio), or your own repository, vendored in |
| 5 | Does it need a slot or setting the Studio lacks, in a form any blyg could use? | **A hook, proposed upstream** | A pull request to [blygger-studio](https://github.com/blygger/blygger-studio) |
| 6 | Is it several of 3 to 5 together, making a kind of blyg (a book, a course, a lab notebook)? | **A mod** | Its own repository |
| 7 | Does it only make sense on your node (your branding, your infrastructure), with no general form? | **A local patch** | Your own deployment |
| 8 | Does it need to change what the Studio is? | **Another client** | A fork with its own name |

The order matters. The cheapest place that works is the right one. A tool on a token costs the Studio nothing. A hook costs every future release a little. A local patch costs you a little at every upgrade.

### 1. A spec question

This question comes first because **most ideas that sound like features are changes to the wire**: a reaction, a tag, a reply, a like, a follower count, a new field on an item. If another blyg would see it or have to understand it, it belongs to the protocol, and the protocol is decided in [blygger-spec](https://github.com/blygger/blygger-spec), not built first and argued about afterwards.

Expect to hit these refusals in your first hour. [`protocol-v0.4.md` §16.8](https://github.com/blygger/blygger-spec/blob/main/docs/protocol-v0.4.md) lists what will never appear on the wire, among them reply primitives, follower graphs, addressable authors, metrics of any kind, a relation that names a person, AI constructs beyond the provenance §5.7 already carries, and any markup for how much a version matters. Identity is deliberately left out of the protocol. These refusals are not oversights. Blygger is a network of soapboxes, not a conversation medium. That said, a well-argued case against a locked decision is welcome, and several have won. File it with the **Protocol proposal** template and describe the problem before the solution.

**What a page looks like is not a spec question.** The project polices the wire, not the page. A layout, a theme, a reading view or a count shown on your own page belongs to the client. It might be a theme, a mod or the Studio's own style, which is written down (in draft) in [`studio-style.md`](https://github.com/blygger/blygger-studio/blob/main/docs/studio-style.md).

### 2. A pull request to the Studio

Bugs, and anything every blyg would want with no setting. **The Studio should be boring.** It is the reference client: it shows each protocol construct in its plainest form, so that other clients do not mistake its interface for the expected design. A pull request that adds an opinion will be asked to become an extension.

What review looks like:
- `npm test` must pass.
- CI also runs the browser suite (`npm run test:e2e`) and `npm run check:template`, which checks that the committed repository carries nobody's deployment.
- A reviewer may push a small fix to your branch and say so.
- Your PR description may carry instructions for the reviewer, such as "demo this before merging", and will be read in full before merge.

### 3. A tool or configuration

A tool that acts as an editor would. It creates items, edits settings and pins versions through `{mount}/api` on a [scoped token](https://github.com/blygger/blygger-studio/blob/main/docs/client-access.md), from anywhere and in any language, and the Studio never knows it exists. To react to changes, poll the resources you need with conditional GETs and their ETags. There are no webhooks. See [`mods.md`](https://github.com/blygger/blygger-studio/blob/main/docs/mods.md#1-configuration-through-the-owner-api) and the [owner API guide](https://github.com/blygger/blygger-studio/blob/main/docs/api.md).

### 4. An extension

Code compiled into a Studio build that fills a slot: a reading byline, an action in the ⋯ menu, a sheet, a page of its own, owner reads under `/api/ext/<name>/`, a home page order. Nothing loads at run time, server routes are reads only, and nothing reaches the wire. Copy `extensions/example/`. See [`extensions.md`](https://github.com/blygger/blygger-studio/blob/main/docs/extensions.md), and [`extension-vendoring.md`](https://github.com/blygger/blygger-studio/blob/main/docs/extension-vendoring.md) for one kept in your own repository.

### 5. A hook, proposed upstream

When a tool or an extension can't reach far enough, propose the missing slot or setting as a pull request. A hook must pass all three of these tests ([`mods.md`](https://github.com/blygger/blygger-studio/blob/main/docs/mods.md#the-bar-a-hook-must-clear)):

- [ ] **General.** It is named for what it does, not for the mod that wants it. A "book layout" slot is refused; an owner stylesheet would be considered.
- [ ] **Wire-silent.** It does not change the bake, `feed.xml`, item documents or `blyg.json`.
- [ ] **Read-only on the server.** Writes happen in the browser through the extension's `client`, or from outside on a token.

Say which mod needs it and why rungs 3 and 4 do not reach.

### 6. A mod

A mod is a kind of blyg, not a pile of settings. [blykker](https://github.com/blygger/blykker), the first, keeps a blyg arranged as a book. It began as a `book.json` and a script on the owner API, added extensions second, and proposed hooks upstream third. A mod keeps three promises ([`mods.md`](https://github.com/blygger/blygger-studio/blob/main/docs/mods.md#three-promises-a-mod-keeps)): the generator string stays `blygger-studio/x.y.z`, model text it inserts is disclosed, and it does not fork.

### 7. A local patch

Something that makes sense only on your node. People patch their Studio anyway, then put off upgrading because the upgrade means redoing the patch. The rules in [Local patches](#local-patches) below make that cheap.

### 8. Another client

If you need to change what the Studio is, fork it, give it its own name, and tell us it exists. That is fine; several clients already exist. See [If you fork this](https://github.com/blygger/blygger-studio/blob/main/README.md#if-you-fork-this).

## Your first hour

Tested on Node 24 and npm 11 with the v0.62.0 release on a clean machine. Develop locally, never against a live blyg (see below).

```sh
git clone https://github.com/blygger/blygger-studio.git
cd blygger-studio
git switch -c my-work
npm ci
```

`npm ci` also builds the Studio. npm 11 warns that the install scripts of `esbuild`, `fsevents` and `workerd` are not covered by `allowScripts`. The build and the dev server work anyway. If a fresh `npm install` without the lockfile crashes in the peer resolver (npm 10.9 does), add `--legacy-peer-deps`.

Create `.dev.vars`, which is ignored by git, with a local password and cookie secret:

```sh
printf 'OWNER_PASSWORD=pick-a-local-password\nCOOKIE_SECRET=%s\n' "$(openssl rand -hex 32)" > .dev.vars
```

Compile in the `example` extension. `extensions.local.json` is ignored by git too:

```sh
echo '{ "compile": ["example"] }' > extensions.local.json
```

**Apply the database migrations by hand before the first run.** `wrangler dev` does not apply them, and the test suite applies its own, so nothing else will tell you:

```sh
npx wrangler d1 migrations apply DB --local
npm run dev
```

Open `http://localhost:8787/studio`, sign in with your local password, write a fragment and publish it. It appears at `http://localhost:8787/feed.xml`. In **Settings → extensions**, check `example` and save: it fills every slot with something visible and harmless, so you can see where yours would go.

When you add migrations later, run `wrangler d1 migrations apply DB --local` again. To run the browser tests, `npx playwright install chromium` once, then `npm run test:e2e`. The suite starts its own server on port 8789, so run only one copy at a time on one machine.

### Never develop against a live blyg

Use a local database and `npm run dev`. Extension code runs in the owner's session, where it can publish, withdraw and mint tokens, so a bug in it is a bug with the owner's authority, and a published item cannot be unpublished, only withdrawn. That is also why nothing loads at run time: an operator has to choose to compile your code in.

## Local patches

A source installation's `npm run upgrade` already merges the newest release into your checkout. A patch kept as a commit survives every upgrade that does not touch the same lines. These seven rules make the most of that.

1. **Try the places that are not patches first.** Settings, a theme, the local files (`extensions.local.json`, `models.local.json`, `wrangler.private.jsonc`) and an extension all survive every upgrade by construction.
2. **One patch, one commit, on your own branch,** with a message that starts `local:` and says why in a line. Never leave a patch uncommitted or in a stash. A stash is how a patch gets lost.
3. **Add rather than edit where you can.** A new file never conflicts. Keep an edit to a shared file to as few lines as possible, with no reformatting around it.
4. **Harmless means three things.** The patch does not change what the blyg serves to others (item documents, the feed, `blyg.json`, `content_html`). It adds no migration and changes no table. It does not rename the client (`generator`). A patch that fails one of these is not a local patch. The first makes it a spec question (rung 1). The second will collide with upstream's schema: if you truly need a table, number the migration from `9000_` as [the README asks](https://github.com/blygger/blygger-studio/blob/main/README.md#if-you-fork-this) and read every release's `Migrations:` line. The third breaks the ecosystem census and update notices.
5. **Every patch names its exit:** the upstream issue or pull request it is waiting for, or one line on why it will never be general. A patch with an exit is a bridge. A patch without one is a slow fork.
6. **Upgrade often.** One release at a time means a small conflict or none; five at once is an afternoon. Security fixes arrive only by upgrading.
7. **Tell us what you patched**, in the [local patches issue](https://github.com/blygger/blygger-studio/issues/150). New hooks are added when there is measured need, and this is the measurement: when three nodes carry the same patch, it should be a hook.

`npm run patches` lists your local commits since the release you are on, flags any without the `local:` label, and warns about any that touch the files rule 4 is about. `npm run upgrade` prints the same list before it merges and names the commits that conflicted after. Studio's **Settings → updates** shows how many local patches the build carries, and the bug template asks for that number. Nothing about patches appears on any public page or in `blyg.json`.

A Worker archive installation has no source, so it cannot carry a patch. If you want one, the first step is to move to a [source installation](https://github.com/blygger/blygger-studio/blob/main/README.md#install-from-source).

## Ideas to start from

One for each of the main rungs, so you can see the ladder applied:

- **Rung 1, answered no: suggested edits.** It sounds like a protocol change: "propose a change to someone else's post". It isn't. The protocol already carries it (decision #110). A suggester forks and edits a pinned item, or writes a stub quoting passages of an unpinned one, and a verified mention reaches the author. Acceptance is the author's own next version. What is missing is interface: an extension that offers "suggest an edit", and a view that shows incoming `fork` mentions as diffs against the owner's pin. Reasoning in the spec's [`v0.4-plan.md` §25](https://github.com/blygger/blygger-spec/blob/main/docs/v0.4-plan.md); the backlog entry is in [`backlog.md` §2](https://github.com/blygger/blygger-spec/blob/main/docs/backlog.md).
- **Rung 1, answered yes:** any wire idea (a new item field, a typed relation), written up as a proposal issue with the problem first, and not built.
- **Rung 3:** a script that imports a folder of Markdown notes as drafts through the owner API.
- **Rung 4:** a reading-view extension, such as a byline badge or a sheet that summarizes a thread's sources. `reading-time` and `word-count` are small working examples.
- **Rung 5:** an owner stylesheet for the public pages. It was accepted in principle for blykker and is not built yet; the public pages take a custom palette today.
- **Rung 6:** a mod for a different kind of blyg, such as a course with ordered lessons or a lab notebook, starting from a config file and a script, as blykker did.

## Working with an AI agent

Point your agent at [`AGENTS.md`](https://github.com/blygger/blygger-studio/blob/main/AGENTS.md) and at this page before it starts. The same ladder applies to what an agent proposes, and agents are especially prone to building a wire change as if it were a feature. Ask it which rung its change is on before it writes code.

## Where to ask

- **A protocol question or proposal:** an issue on [blygger-spec](https://github.com/blygger/blygger-spec/issues/new/choose).
- **A Studio bug or feature:** an issue on [blygger-studio](https://github.com/blygger/blygger-studio/issues/new/choose).
- **Something you built that speaks Blygger,** to have it listed: [blygger-org](https://github.com/blygger/blygger-org/issues/new/choose).

When an issue is accepted, it gets a row in the [public roadmap](https://blygger.org/roadmap/) linking back to it, and the issue stays open for discussion until the work ships. Unsure which repository? File it anywhere; a misfiled issue is moved, and is much better than an unfiled one.
