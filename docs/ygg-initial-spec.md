> **Ygg initial spec (v0) — open for comments.** This is the original concept spec, preserved verbatim. Comment via [Issues](../../../issues) or [Discussions](../../../discussions), quoting the section and clause number. Successor drafts (protocol spec, architecture) will land in `docs/` as separate documents; this file stays frozen as the reference point.
>
> **Naming note (session 6, 2026-07-24):** the project has since been renamed `ygg` → **blygger** (see `RENAME.md`), and the default publish path from `/ygg` → `/blygg`. This file — including its filename — is deliberately **not** updated: it's the historical record of the original concept under its original name, exactly as `Yggdrasil` prompted the name in the first place. Every other document in this repo uses the current name.

# Basic premise

Ygg, named for Yggdrasil the cosmic tree, is an idea for a new AI-native decentralized public social medium that is a mashup of blogs, wikis, twitter, and git style changelogs. Ygg will comprise a single type of client that will host a mix of twitter-like short-form atomic items called FRAGMENTS and longform items called THREADS that use markdown syntax alongside a special TK-TRANSCLUSION operation, for a AI context-based summarization transform, based on a special markdown operator that summarizes the target for the destination context. The goal is to support generation-based contextualized composability of longer documents from shorter ones. The feed will comprise changelog updates to the atomic items. Feeds will be published over RSS, but the client will use both AI and procedural composition to produce a personalized feed of new and updated items. The client UI will comprise quasi-static pages that can live on static websites under a /ygg directory that presents as a visual feed as well as offering an RSS feed, and a way to add other clients' RSS feeds, which can be subjected to various input filters, or held in a private state unless a manual action or automated action publishes them to the output feed.

# Key features

1. A FRAGMENT is a length-constrained item that does not transclude any other items. Fragments are composed similarly to tweets, and can include URLs and media attachments.
1. A THREAD is an essay-like construct composed out of a hopper of FRAGMENTS and existing threads, through a mix of AI generation, procedural operations, and manual editorial additions. Threads will generally be created from hoppers, but it will be possible to create a thread based on an empty hopper. The TK-TRANSCLUSION operation will be the main load-bearing AI component.
1. Both fragments and threads are published at individual URLs with slugs that are not dependent on dates or titles, but ideally in a global namespace such as a long (but not too long) hash that can be a search target regardless of the domain on which it's hosted.
1. Both fragments and threads can be arbitrarily edited. The only exception is that a fragment can't be promoted to a thread. But trivially, a fragment can be added to a hopper as a singleton and that hopper can be turned into a derived thread.
1. Fragments are published to the public feed and RSS by default but can be made private to the client owner, and optionally, a privileged group that can only access it by visiting the feed while authenticated, not via RSS
1. Threads are not directly published on the feed, but can be published via a fragment that links to them, similar to tweeting out a link.
1. Threads and fragments in a single client will be a DAG, so threads can't create circular TK-transclusion.
1. The READING UX for the owner of the client will feel like browsing a reverse chronological feed of fragments, both self-authored and imported via RSS. Any item can be added to any of a list of named hoppers. New hoppers can be created at any time. A fragment can be added to any number of hoppers, making them like tags. Hoppers are only visible to the client owner.
1. Hoppers can be automated using filter criteria, so that new inbound fragments that are judged by AI to be relevant to the hopper theme are automatically added to it.
1. The inbound RSS feeds can be both traditional, or ygg-specific. The ygg-specific ones will feature a tunneling markup that allows for special interpretation, as changelog entries for an existing original fragment published by that feed. This will not be published as-is but instead a meaningfully rolled-up latest-version will be presented.
1. Traditional RSS feeds will be grandfathered into ygg format via a thin wrapper that converts them into a summary fragment and a link.
1. The aggregated feed of items will be put through a flexible, modular set of filters. A few default filters will be made available, but this is meant to function as a plugin/customization interface.
1. There will be a secondary tab of threads, indexed chronologically by most-recently updated. The reader will be able to get to tk-transcluded original fragments via threads. If they are the owner, they'll be able to edit them as well, which will trigger a regeneration of the thread.
1. Imported items will feature thumbs up and thumbs down actions that will be saved as a training signal, and available for any filtration modules. If an imported item is added to a hopper, a copy is saved locally. If a future fragment updates it, the local copy is also updated.
1. By default imported fragments via RSS will only be visible to the owner unless they choose to make it public, which would be like a retweet.
1. There will be no "quote" type primitive action, but there will be a one-click "stub" action that a) adds a fragment to a hopper b) publishes a stub thread with a trivial tk-transclusion that's just a straight quote, along with an editorial note c) publishes a fragment that renders like a familiar quote, but isn't a quote under the hood. We will call this action "stubbing"
1. There will be no "reply" type primitive action. This is not a conversational medium, more like a network of soapboxes. The quote-like stubbing action will be the only way to respond to an imported fragment.
1. There will be a "detect stubs" special filter that will detect stubs that are responses to fragments originally published on the local clients. These are visually highlighted and can be stubbed again, allowing for arbitrarily tall stubbing stacks. Since stubs are threads, such a stack will always look like a link to a local thread. It will not break the DAG requirement (I think)
1. The non-owner reader of the page will not see any actions available except to copy the RSS feed URL to paste into their own ygg client.
1. For fragment composition, the main feed will feature a twitter like posting UI for the client owner to compose fragments. These then show up on the feed as usual, but without the  Non-owners do not get to post.
1. For thread composition, the owner will start with a blank authoring interface somewhat like Roam or Notion, supporting markdown. They will be able to add fragments as they type, using Roam style search while typing [[]].
1. The key new operator will be something to indicate a TK transclusion section. It might be something like [TK][/TK] shortcode tags. Any fragments included in the tk-transclusion scope will be processed by a generative AI api call at save time, but will remain editable, so each time text in that scope is edited, it will regenerate. Included fragments will always be linked so the author can choose to edit the fragment instead.
1. This special TK-transclusion operator will do pure generation if there are no included fragments. If the human author wants to make a TK annotation for themselves without invoking AI support, they'll use a non-special TK annotation.
1. New or updated threads can be shared on the feed as fragments via a "share" action which will post a link with an editable summary text.
1. There should be a simple profile feature that assumes a single author and is reachable via the RSS feed.
1. In the core spec, there will be no support for multi-tenancy (ie, there is no separate "server" or "instance" abstraction as in ActivityPub or Bluesky), but the spec shouldn't foreclose that possibility. Others should be free to implement overloaded clients that respect the basic ygg spec, but overload it to produce community sites. But individual RSS feeds should be assumed/restricted to a single user. So if someone wants to implement a multitenancy system, they'll have to publish one RSS feed per user. There will be no 2-level namespace like userid@servername unlike on AP. We will rely on unique DNS to render the namespace global
1. The system will be highly RAG friendly, and clients should expect to support some sort of local RAG system based on the local content, that is also integrated into the authoring interface. There should be a recommended plan for a default RAG implementation and stubs/hooks to use it in the authoring, but minimalist.
1. There should be very simple default visual presentation, but a system for arbitrary styling so long as minimal valid features are respected for the client.

# Implementation

1. The client spec should be flexibly implementable in many ways, and defined as much as possible in terms of a protocol spec for the overloaded RSS feed mechanism and rules specifying the presentation of the /ygg page to readers unambiguously. The owner view should also be specified, but can be more flexible.
1. There should be a reference implementation in the form of a Cloudflare worker. If more persistent processing is needed, a python or node server on exe.dev can be used, but ideally, a CF native worker solution with R2 buckets for storagte and D1 for database should be the reference implementation.
1. If no use is made of the special TK-transclusion and AI features, a ygg page should simply look like a regular RSS feed publishing a twitter-like feed.
1. All filtration capabilities should be via a clean plug-in module type architecture.
1. All AI capabilities should use a suitably configurable API call key that is stored securely.
1. The publishing target should be assumed to be a typical static site, under a /ygg directory. For example, venkateshrao.com/ygg
1. The implementation should try to be IPFS-friendly for persistence of the raw content.
1. The implementation should try to be friendly to encrypted/permissioned content, where client owners can share decryption keys for their feeds with trusted parties, and revoke/rotate them easily if compromised. This aspect should be roadmapped but not initially implemented. It should be aware of potential for use of advanced technologies like ZK proofs etc for advanced forms of privacy management (eg. ability to define rules like "private content visible up to FOAF")
1. This aims to be "sufficiently decentralized" as in the principle "decentralize till it hurts, recentralize till it works"

# Design philosophy

1. This is a medium designed for people who want to write in public. It's not a cozy/private medium. But neither is it a conversational medium. People can cross-post fragments and threads to conversational media if they want to talk about it.
1. The assumed technical level is no/low-code writers comfortable maintaining their own static sites and able to use coding agents to configure and deploy simple software on sites like cloudflare, netlify, vercel etc., but not necessarily with the technical intuitions to vibecode nontrivial decentralized systems like this one
1. There is no discovery as such. People find each other's ygg pages and add them to their own, creating a network of ygg pages. This network can be traversed by following fragments to originating clients. The feel should be like old school blogrolls
1. Though the content will evolve wiki style, the published content is meant to be rendered highly readable as an index of serial documents, not as a network.
1. The key difference from the blog is that threads are meant to be constantly updated and evolved.
1. The key difference from twitter type feeds is that fragments can be updated and the reverse chronological ordering reflects the latest update timestamps
1. The key difference from github is that changelogs aren't unreadable diff points, but rolled up into presentations of the latest versions.
1. The AI native part is the TK-transclusion mechanism that integrates text generation in a structured way.
1. The whole thing should gracefully degrade if no AI is available for filtration and authorship support.
1. The entire UX should be as familiar as possible for reading/authoring. Only minimalist UX evolution should be done to reflect the actually novel elements of the architecture.
1. When none of the novel features are used, this system should simply default to a network of p2p RSS readers of tweet-sized content + an ordinary page authoritng system.
1. Some of the inspiration for this has come from Robin Sloan's Spring 83 specification
