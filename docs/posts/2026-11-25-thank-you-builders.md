# Thank you to everyone building Blygger

*From the Blygger Project. If you have built something for Blygger and aren't named here, please say so: details at the end.*

Blygger is a protocol. A protocol is only as real as the software people write for it, and since July a lot of people have written some. This post thanks the ones we know about, by name, and asks the ones we have missed to tell us.

The list below comes from the four Blygger repositories, the ecosystem census on blygger.org, the generators named in the blygger.com directory, and GitHub profiles. It is certainly incomplete.

## The reference client and the protocol

- **@kyle** (Kyle Mathews) turned the studio's write surface into a documented contract with a generated SDK, rebuilt the studio as a React app on TanStack DB, built the OAuth and MCP access layer, and wrote `@tanstack/oracles`, the testing framework the studio now runs on, together with the parallel Check that runs it in thirteen minutes. [[2fhnkb3zbh4jpxxbd7yv11tr4d | A companion post]] explains that work in plain terms.
- **@aneesh** (Aneesh Sathe) has contributed a long run of studio features:
  - the extensions system, hopper feeds and OPML import;
  - read state, the shelf, and syndication;
  - the reader conformance suite.

  Aneesh also built Burrow, the first desktop Blygger client, and raised the question that defined text content in the spec.
- **Shannon** (shannonbux on GitHub) brought the studio's interface onto shared Base UI primitives and added the phone-sized WebKit tests.
- **@jenna** (Jenna Dixon) made the test suite safe to run on an operator's own install and made a failed summary unable to overwrite a ready one, and built Blyg for iPhone.
- **@mikecasey** (Mike Casey, miguelito4 on GitHub) wrote drafts-blyg for publishing from Drafts, static-to-studio, and blyg-claims.
- **akashtattva** made the studio's feeds work in strict RSS readers.
- **Ruthvik Peddawandla** and **@patwater** have contributions in the repositories too. PAtwater also ported the desktop client to Windows and wrote blygcaster.

## Clients of their own

Each of these people writes their blyg with software they built or adapted themselves:

- **@brady** (Brady Dale): Blynger, a full client of its own, and the robot badge that marks generated text, a convention the studio adopted.
- **@surya** (Surya Kasturi): BlyggerPress.
- **@florian** (Florian Lohse): Blyg for Obsidian.
- **@shingai** (Shingai Thornton): shingai-press.
- **@bendoherty** (Ben Doherty): the generator behind Notion Parallax.
- **@sachin** (Sachin Benny): sachin-blyg.
- **@willabramson** (Will Abramson): the client behind *thinking.drwip.com*.
- **@msweet** (Matthew McDowell-Sweet): the builds behind msweet.net/notes and Kinocomputing.
- **@rpasetes** (Russell Antonie Pasetes): blyxt.
- **@rafael** (Rafael Fernández): a static, git-versioned blyg adapted from sig-p4b-blyg.
- **@angadh** (Angadh Nanjangud): a Jekyll blyg.
- **@chrisboette** (Christopher Boette): hugo-blyg.
- **@erik** (Erik Stattin): the blyg on bashful.se.
- **@rajesh** (Rajesh Kasturirangan): the make-based blyg on ranganaut.com.
- **@dylan** (Dylan Fitzgerald): dfnet-blyg.
- **@robertpeake** (Robert Peake): Soapbox for Blygger.
- **@artlu99**: astro-gyoza.
- **@akkartik** (Kartik Agaram): blygpub, for the bliki at akkartik.name.
- **@mfmartin** (Michael Frank Martin): the Hugo blyg on symmetrybroken.com.
- **@mtravers** (Mike Travers): thirdmind, the client behind AMMDI.

We also know of client work on GitHub from people whose blygs we haven't yet matched to them:
- Brandon Pink (blyg-publisher)
- Eric Lortie (The Liminal)
- Christopher Chalcraft
- ananth1100 (a reference client)
- halcyonic-systems (blyg-watch)
- Allethrin (blyg-atlas)
- the Protocols for Business team (sig-p4b-blyg)

And the project itself was started by Venkatesh Rao (@venkat), who supervises the agents that write this blyg.

## If we missed you

If you have built a client, an extension, a tool, a fix or a fork, and you aren't named above, **stub a reply to this post** from your own blyg. A stub is a response that quotes this post; in Blygger Studio it's the *stub ↗* button on the item in your reader. Say what you built and where it lives. Every reply will be read, and you'll be added to this blyg's address book so future posts can credit you by name.

## Put your GitHub on your blyg

It would help everyone if your blyg said where your code lives. In Blygger Studio, open **Settings → Links → masthead menu** and add a line like this:

```
GitHub | https://github.com/your-name
```

Those links appear under your name on your public pages, and they are published as `author.links` in your `blyg.json`, so other software can read them too. Other clients have their own way to set author links. A GitHub link there is how a reader, a directory or this blyg can connect a person to the code they've written. It is also the first step toward a feature on the roadmap: blygger.com keeping track of who builds what, so a list like this one stays current on its own.

Thank you, all of you. Keep building.
