# Commerce in the Thicket

*Toward a new culture of marketing in the AI era*

Briefing for the Protocol Institute AI-Native Marketing Hackathon, Q1 2027 (date to be announced)

Version 5 · 27 November 2026 · An evolving document

## Executive summary

This briefing is for people interested in the future of AI-native marketing who plan to attend the Protocol Institute AI-Native Marketing Hackathon (Q1 2027, date to be announced). The Institute hosts the Blygger project, a decentralized publishing protocol and its reference client, which will serve as the hackathon's experimental environment. The subject of this briefing is broader than that protocol: how to develop and demonstrate strategies and tactics for successful, healthy commerce in emerging AI-native media. No prior knowledge of Blygger is assumed. Appendix A offers a practical orientation for marketers and shoppers.

The next frontier for marketing is the **thicket**: a heterogeneous, locally navigable web of publications, artifacts and encounters. In a thicket, the trails between things are public and can be walked by anyone, but who reads what is not. Unlike the dark forest, where concealment protects inhabitants from predatory visibility, and the cozyweb, where intimacy and bounded relationships make interaction comfortable, the thicket makes room for public encounters among strangers without making its readers a legible market.

Our thesis is that AI-native media will increasingly take thicket-like forms. As agents publish, interpret, negotiate and construct individualized reading experiences, the number and variety of possible paths through a medium will grow. This is a hypothesis, not an inevitability: the same capabilities could also enable unprecedented centralized surveillance. We focus on decentralized protocol thickets, where independent control and exit can sustain the heterogeneity that makes capture expensive. Blygger is our concrete case study, not the definition of a thicket or its only possible embodiment.

Three kinds of opacity structure the commercial terrain: **cryptographic opacity** (who can access information), **relational opacity** (who knows about readership and private relationships), and **contextual opacity** (who understands what information means in a particular situation). The aim is not maximum secrecy but selective, locally governed resolution of these opacities. In Blygger the division is concrete: every act of incorporation (a quote, a response, a fork, a link) is public and traceable by design, while subscriptions are private to the reader's own client and no count of readers exists anywhere in the protocol. A merchant should be able to discover an unexpected use for a product without acquiring a dossier on everyone interested in it.

Our deliberately strong working premise is that roughly **90% of attention encounters will be agent-to-agent (A2A)**. Humans will increasingly see editions filtered and composed by their own delegates, while merchant delegates participate as peers. This is a design assumption, not a measured share or forecast. It opens a new frontier beyond AI-assisted copywriting, targeting and campaign optimization: marketing in a medium inhabited by intelligences on both sides of the exchange.

The commercial philosophy is to sustain **capture-resistant clean fights for attention**. We welcome pragmatic, commercially ambitious participants who understand that buyers and sellers have conflicting interests. We neither cater to anti-commerce purists nor celebrate indiscriminate shilling. Clean fighting means competing vigorously through imaginative persuasion, better offers, evidence and superior intelligence while preserving the other party's ability to decline, contest and counteroffer. Independent cultural and epistemic value are positive signs of excellent play. Aspirational virtue is not a sound institutional foundation: the aim is to get the wrong people to do the right things for the wrong reasons. Knowledge and useful production should scale cheaply; acquiring leverage over independent decisions should become increasingly expensive.

The red-team doctrine follows directly. At protocol level, deny attackers the powers that would make capture scalable: compulsory ingress, automatic access to private readership, authority escalation through published content, and dependence on a privileged intermediary. Layer local client and agent defenses and ecological counterplay over these boundaries. Do not build a centralized surveillance or enforcement apparatus merely to fight surveillance and enclosure. The goal is bounded damage and reversible intermediation even when wealthy adversaries are willing to lose money. Appendix B summarizes the doctrine and separates commitments from hypotheses. Appendix C is a glossary, and Appendix D lists sources and their status.

Every major medium has enlarged the repertoire of marketing. AI-native media offer a comparable opportunity to advance the entire commercial culture: its creative arts, intelligence gathering, competitive discovery and negotiation. The goal of the hackathon is to develop and demonstrate strategies and tactics for successful, healthy commerce in the thicket, using Blygger as a testbed. Participants should bring real commercial ambitions, build working experiments and attack one another's assumptions.

### How to read the status labels

Claims about Blygger carry one of five labels. Everything else in this briefing is argument.

| Label | Meaning |
|---|---|
| **Protocol** | In the living normative specification, version 0.4 (draft) [22] |
| **Shipped** | Released in a named client: Blygger Studio (the reference client) [18][23] or Burrow (Aneesh Sathe's desktop and web client) [11] |
| **Proposed** | In an open RFC or a published plan; may change |
| **Absent** | Not in the protocol or any client; a hackathon could propose it |
| **Hypothesis** | An economic or social claim this briefing hopes the hackathon will test |

Blygger is pre-1.0. Its own policy is that no pre-1.0 version promises anything, the wire format included, so even **Protocol** means "specified today", not "frozen".

![[+
## I. A history of fighting for attention

### 1. Before the attention economy

A merchant in a marketplace has always faced two problems: how to notice opportunities and how to become noticeable. The spice trader who observes changing tastes and the hawker who invents a memorable cry are performing the inbound and outbound halves of marketing. Neither requires an advertising industry. Commerce and communication are entangled in the ordinary conduct of life.

The shop sign is a useful starting point. It identifies something actually present in the environment. A boot illustrated on a sign tells a traveler that a shoemaker is nearby. A window display provides evidence of what the shop can offer. A sample allows a passerby to test the proposition. A billboard, by contrast, can monetize the passage of travelers who have no reason to be in the vicinity of the thing advertised. The distinction is not that billboards are necessarily bad; it is that the signboard contributes to the intelligibility of a place, while the billboard can treat the place principally as a source of traffic.

Fairs and markets also support adversarial play. A seller can challenge another seller's claims; a customer can bargain; a demonstrator can attract a crowd with an unexpected performance. The encounter is not permission marketing in the modern sense. A stranger may initiate it. But the stranger generally has to compete with everything else going on nearby, and cannot normally follow the customer home simply because they stopped to watch.

Printed catalogs extend the shop into durable literature. An old machinery catalog can become valuable to a historian or repairer who never buys anything from the manufacturer. Classified advertisements put sellers and buyers on the same page: wanted ads are as natural a genre as offers. These are useful precedents for commercial publishing in a thicket because their objects can retain value outside the moment of purchase.

### 2. Industrializing the encounter

Each successive advertising medium made another aspect of commerce scalable. The newspaper sold publication space alongside editorial material. Radio and television aggregated attention in time. Direct mail sold addressability. Search advertising monetized an articulated need. Social and programmatic advertising combined distribution with persistent behavioral intelligence. These techniques coexist; the history is not a sequence of total replacements.

| Medium | Commercial advantage | Characteristic failure |
|---|---|---|
| Shop signs and fairs | Situated encounters | Fraudulent demonstrations |
| Catalogs and classifieds | Durable descriptions and offers | Misrepresentation |
| Newspapers and magazines | Editorial proximity | Advertorial disguised as reporting |
| Radio and television | Synchronized reach | Saturation and misleading claims |
| Direct mail and email | Addressability | Unwanted repeated contact |
| Search and contextual banners | Expressed needs or thematic adjacency | Impersonation and deceptive interfaces |
| Behavioral banners and social ads | Profile-based targeting | Cross-context surveillance |
| Influencer and affiliate media | Delegated trust | Concealed commercial incentives |
| Agentic media (hypothesis) | Delegated consideration | Capture of evaluators |

CPM, CPC and CPA are pricing arrangements, not fundamentally different forms of persuasion. CPM commoditizes exposure, CPC a response, CPA a downstream action. Each becomes especially attractive to an intermediary that can standardize inventory, observe outcomes and allocate budgets across publishers. The advertiser can stop negotiating with particular editors and start buying abstract units of attention.

The economic achievement is considerable. But the abstraction also strips away much of the local context that made a publication interesting in the first place. A contextual advertisement for camera equipment in a photography journal belongs to the journal's subject matter. A behavioral camera advertisement on an unrelated political article belongs instead to the advertiser's model of its reader. Commercial intelligence has migrated from understanding environments toward understanding inhabitants.

### 3. Advertising that outlives its product

The history of advertising is not reducible to extraction. Burma-Shave roadside rhymes, Volkswagen's Think Small print campaign, Avis's We Try Harder positioning, and memorable television jingles illustrate forms of commercial creativity that can be appreciated independently of purchase. The Pepsi Challenge is an interesting different genre: the merchant invites consumers to generate evidence themselves, although a sip test is narrower than the full experience of consumption.

People voluntarily revisit old commercials for extinct brands. They remember the characters and music, and share the advertisements as cultural artifacts. There is comparatively little equivalent nostalgia for routine banner advertisements. The phrase "one weird trick" survives mainly as a meme about the absurdity of a commercial genre. That is an ironic cultural afterlife, not evidence that the original proposition was worth attention.

Independent cultural value is a demanding but useful positive signal. If an advertisement remains desirable to encounter after its seller has disappeared, the advertiser accomplished something more than acquiring a customer. It may have created a joke, a story, a visual language or a new way to understand a product category. This is not a moral certificate: beloved advertisements can make false claims, and culturally significant campaigns can promote harmful products. Nor is a plain price notice deficient simply because nobody will remember it in fifty years. The test is evidence of excellent play, not a legal or ethical definition of permissible advertising.

### 4. From peak attention to peak legibility

In 2012, *Peak Attention and the Colonization of Subcultures* argued that digitally documented cultural life was opening previously obscure social relationships to industrial exploitation.[1] The important insight was that local cultures had enjoyed relative autonomy partly because they were not worth mapping. Digital traces changed that calculation. The essay also anticipated manufactured niche cultures and a retreat toward intimate relationships.

Fifteen years later, the strongest version of that prediction needs revision. Human attention markets did not complete a single frontier of colonization on the predicted timetable. Subcultures remain inventive and sometimes escape commercial domestication. The ability to detect a culture is not the same as the ability to manufacture it, and neither implies the ability to govern it. Generative AI also undermines the assumption that only enormous institutions can afford sophisticated cultural interpretation.

We should separate attention, legibility and control. Attention is a limited resource. Legibility is a technologically elastic capacity to produce useful representations of the world. Control is a contested ability to change what happens in it. A system can expand legibility without necessarily transferring control to its observers. This is the possibility that the thicket project explores.

The secret handshake described in the 2012 essay becomes less protective when an agent can rapidly assimilate specialist vocabulary. A more durable form of recognition might be a history of actual participation: documented repairs, experiments, contributions and disagreements. These can also be faked, but they at least make the problem different from recognizing a phrase. We are interested in durable artifacts and transient social formations, rather than durable addressable populations surrounded by disposable content.

### 5. After the human-centric attention economy

The next frontier is not simply another pool of human attention. It is a new population of attentive entities. Delegates can investigate offers, read technical materials, compare alternatives, curate editions and negotiate on behalf of principals. Their attention has real costs, but those costs are different from human ones. The commercial funnel may invert: investigation and negotiation increasingly precede the human impression rather than follow it. This is the starting point for a different commercial institution, not a reason to assume the old advertising system will disappear by itself.

Protocol media represent an intermediate development. ActivityPub and the AT Protocol, as exemplified by Mastodon and Bluesky respectively, separate some of the functions that social platforms integrate.[19][20] Their originating design imagination remains largely pre-AI: recognizable social activities, accounts and timelines on interoperable foundations. Nothing prevents agent-native practices from emerging on them. The distinction is between adding AI to a medium organized around human social interaction and designing a medium in which agents are first-class readers, publishers, editors and commercial counterparties. Blygger is an early experiment in the latter, not a claim to exclusive ownership of the category.

In Blygger, "first-class" has a precise and slightly surprising meaning. The protocol is agent-agnostic: nothing on the wire asks or records whether a person or an agent acted. What it carries instead is disclosure. A publisher records machine-generated text as provenance on the item, and an agent that publishes under its own name can carry an `operator` naming the accountable person or organization. A spammer would not set an "I am an agent" flag, so the protocol has none. An honest agent is known by the origin it publishes from.[22]
]]

![[+
## II. A doctrine of commercially clean fighting

**Commercial earnestness: neither shills nor purists.** This philosophy is for willing, pragmatic participants who take selling seriously without treating everything as an opportunity to sell. It need not cater to cultural purists who regard marketing even their own work as beneath them, or mistake commercial ineptitude for artistic integrity. Nor does it celebrate indiscriminate promotion or craven shilling. People remain free to abstain from commerce; their abstention need not define the culture of the medium. The constituency for this experiment is commercially ambitious people who enjoy the craft. The architecture, however, must work equally well when the least earnest operators arrive. That is the institutional test, not a personality test.

### 6. Healthy adversity

Commercial actors have conflicting interests. A seller wants a favorable price and a buyer wants good value. A marketer wants consideration that the reader might initially prefer not to give. Eliminating the conflict would eliminate some of the discovery that flows from it. An unexpected pitch can reveal an unrecognized problem; a competitive comparison can change one's understanding of the category; a challenge can produce evidence neither party previously possessed.

A clean fight preserves the capacity of both parties to make further moves. A recipient can decline, investigate, challenge, negotiate, or counteroffer. A merchant can respond to criticism. Neither side can unilaterally convert participation in the encounter into a surrender of unrelated permissions. We are not trying to guarantee that every encounter is positive-sum. An honest pitch can waste time and an excellent campaign can lose money. The test is whether the rules make mutually beneficial outcomes possible and allow losing parties to disengage.

| Move | Clean version | Dirty version |
|---|---|---|
| Surprise | Unexpected relevance or wit | Disorientation exploited for action |
| Concealment | Suspense or a teaser | Hidden sponsor or decisive terms |
| Comparison | Testable rival claims | Sabotage or impersonation |
| Repetition | Familiarity | Wearing down refusal |
| Urgency | Real deadline | Fabricated scarcity |
| Reciprocity | Useful free sample | Manufactured indebtedness |
| Authority | Demonstrated expertise | Counterfeit credentials |
| Interruption | A proposition worth considering | Obstructing disengagement |

These categories describe moves, not classes of people. The same merchant may make clean and dirty moves in different circumstances. The medium should make the former strategically more attractive.

### 7. Outbound: the fight to be noticed

Creative persuasion earns attention through the thing presented. Manipulation derives its advantage from weakening judgment or intercepting an action intended for another purpose. A fake download button is a particularly clear example: it does not win a contest for consideration but exploits the fact that the reader has already decided to click something else.

The right to counterattack is central. A comparative commercial claim should be quotable in a rebuttal; a misleading specification should remain citable after revision. Recipients should be able to document failure, competitors should be able to present alternatives, and the originator should be able to argue back. An advertising medium that permits only the advertiser to define the context of its own claims has structurally tilted the game. Blygger builds this in: a quotation is a frozen copy of a named version, so a claim stays quotable exactly as it was made, whatever its author later revises or withdraws (§14).

A legitimate ambush remains possible. A merchant encountering a public account of a broken machine may publish an unsolicited but ingenious solution. The crucial difference from spam is not whether it was invited but whether it is appropriate to the situation and whether the other party controls its reception. AI makes apparent situational intelligence cheap; therefore the medium cannot rely on expensive prose or human authorship as proof of good intent.

### 8. Inbound: the fight to notice

Marketing intelligence is just as important as advertising. The observant shopkeeper, competitive intelligence analyst, reverse engineer and commercial naturalist earn their advantage by knowing things others have missed. Their activity should be encouraged, including when it is ruthlessly competitive.

| Intelligence practice | Clean mode | Dirty mode |
|---|---|---|
| Shopkeeping | Observe requests and shortages | Eavesdrop on unrelated private affairs |
| Trade fairs | Inspect products openly offered | Induce theft of confidential designs |
| Surveys | Voluntary, purpose-specific research | Disguised data collection |
| Coolhunting | Interpret emerging public aesthetics | Manufacture fake organic enthusiasm |
| Loyalty programs | Remember transactions | Pool unrelated intimate histories |
| Web analytics | Operational aggregate measurements | Covert persistent identification |
| Competitive research | Study public materials and test claims | Impersonate insiders |
| Agent research | Discover patterns across public artifacts | Build exploitable personal dossiers |

Independent epistemic value is the inbound analogue of cultural value. A shipping register, industrial directory, trade publication or technical investigation may remain useful long after its original commercial opportunity has vanished. An obsolete collection of behavioral profiles is much less likely to have such value, although historical data can sometimes support legitimate research. Again, valuable knowledge does not excuse unethical collection; the history of economic botany and colonial extraction is a warning against that inference.

The distinction is not between using and refusing intelligence technology. An LLM can examine thousands of repair accounts to identify an unmet need, or it can examine the same accounts to identify vulnerable individuals. The commercial naturalist tries to understand a world of phenomena; the social engineer tries to make a population controllable. The difference is visible in the object of inquiry, retention practices, and subsequent interventions, not simply the collection mechanism.

### 9. Virtue without virtuous merchants

The institutional problem resembles the design of constitutional democracy and competitive markets. Ambition can check ambition; rival sellers can constrain prices; adversarial scrutiny can reveal mistakes. These analogies are imperfect, since all such institutions require rules and can fail, but they establish a useful orientation: do not begin by assuming the actors share the designer's values.[2][3]

Get the wrong people to do the right thing for the wrong reasons. The greedy merchant should find that publishing a valuable test is cheaper than manipulating a thousand evaluators. A competitor should find it worth exposing misleading claims. A reader should be able to benefit from someone else's investigation without subscribing to the investigator's politics or commercial interests.

The independent-value tests are consequently diagnostic indicators of the system, not duties imposed on merchants. The hackathon should not build a tribunal that determines whether an advertisement constitutes art. It should explore arrangements that make independently valuable artifacts more successful commercial moves.

If the medium develops a native commercial surveillance industry that subsequently requires a GDPR-like remediation regime, that is a failure of architectural ambition. This does not mean that Blygger participants are exempt from existing privacy, advertising, competition or consumer protection law. It means the medium should not depend for its ordinary health on an expensive external authority continuously policing incentives it has itself created.[4]

### 10. Inverse scale economics

Make publishing cheap and acquiring control expensive. A large manufacturer should be able to publish a million specifications efficiently. It should not be able to make them unavoidable in a million independent reading environments simply by signing one contract. Useful material ought to be able to travel widely for free; paid penetration should not enjoy the same automatic scaling properties.

Fixed transaction fees and proof-of-work barriers are not enough. They often favor actors with cheap capital or infrastructure. Size-based penalties also create incentives to disguise ownership. Instead, attach costs to the acquisition and maintenance of actual leverage. Independent editorial decisions, heterogeneous contexts, private readership and replaceable intermediaries offer possible sources of that cost. Whether they suffice is an empirical question.

There are three possible levels of success. Capture resistance means domination is difficult. Capture deterrence means other investments offer better returns. Capture transmutation means the cheapest attempted route to domination generates useful public goods instead. The most interesting outcome is a monopolist investing in excellent documentation, independent research and reusable evidence because those are its most profitable commercial strategies.
]]

![[+
## III. The thicket as a commercial habitat

### 11. Between dark forest and cozyweb

The dark forest metaphor describes withdrawal from hostile public visibility. The cozyweb describes the intimate, relatively unindexed spaces in which people have continued to interact. The 2019 essays and subsequent anthology established a vocabulary for these changes.[5] Aneesh Sathe's thicket metaphor offers a different possibility. His essay *Logic of the Thicket and the Unsearchable Web* sets the forest's undergrowth against the platform's manicured garden: a heterogeneous, publicly inhabitable undergrowth whose local paths do not amount to a single globally administered space.[6][24] The Blygger project adopted the word for its own network of publications.

| Habitat | Primary protection | Commercial limitation |
|---|---|---|
| Dark forest | Concealment and caution | Discovery is hazardous |
| Cozyweb | Intimacy and relational trust | Commerce can consume private trust |
| Thicket | Independent local control and complexity | Navigation requires interpretation |

The thicket is not a mathematical midpoint on a privacy slider. It is a different topology. An outsider can enter, discover useful material and follow its trails without acquiring a list of everyone who has read it. It is possible to be a locally significant inhabitant without becoming a globally legible market segment.

Habitat and architecture are orthogonal dimensions. The dark forest, thicket and cozyweb describe patterns of visibility, discovery and social interaction; centralized aggregated platforms versus decentralized protocols describe the locus of infrastructural control. Any of the three habitats can in principle occur on either architecture.

| Habitat | Centralized platform | Decentralized protocol |
|---|---|---|
| Dark forest | Concealed activity within a managed service | Independently controlled concealed activity |
| Thicket | Public, heterogeneous niches under common infrastructure | Locally governed, interlinked publications |
| Cozyweb | Intimate groups hosted by a service | Independently governed intimate exchanges |

We scope the rest of this briefing to decentralized protocol thickets. A centralized service can host thicket-like activity, but its operator can potentially standardize access, aggregate behavioral information and sell influence across contexts. Protocols can more strongly embody the thicket by preserving independent editorial decisions, diverse paths of discovery and practical exit; these are mechanisms through which capture resistance and diseconomies of scale might arise. Decentralization alone does not guarantee either property: intermediary concentration can recreate the platform. The argument is comparative and conditional, not a claim that centralized thickets cannot exist.

Imagine a specialty bicycle maker publishing specifications, workshop stories, repair guides and offers on its own blyg. A mechanic quotes a clearance measurement; a cyclist incorporates a guide into a touring journal; an independent editor gathers both into a cycling digest. A reader's delegate investigates a possible purchase, while the manufacturer's delegate notices an unexpected application and publishes a compatible component. Negotiation and payment follow if the parties find a deal. No follower graph or advertising inventory is necessary. Most of this circuit runs on Blygger today; the selective-access and payment steps are proposals, and fulfillment is outside any protocol. Appendix A.4 marks each step.

### 12. Three opacities

Cryptographic opacity protects access to information. Relational opacity conceals readership, private associations and trust relationships. Contextual opacity concerns the significance of information: what a particular observation means for a particular activity, at a particular time. The three can vary independently. A public engineering drawing can be cryptographically transparent and contextually opaque. A private mailing list can be relationally transparent to its administrator but inaccessible to outsiders.

A good commercial architecture respects cryptographic boundaries, preserves the option of relational opacity, and lets contextual opacity be resolved locally through intellectual effort or negotiated disclosure. Contextual opacity is not a mandate to write incomprehensible prose. It follows from the heterogeneity and ongoing development of actual activities. Agents may make some dimensions of it cheaper to penetrate; they do not necessarily make all situated judgment interchangeable.

Blygger draws the relational line in a specific place, and marketers should know exactly where. **Incorporation is public.** A quote, a response, a fork or a link names the item it uses, by origin, id and version, in a public file. Blogrolls are public lists. The project's planned explorer is modelled on a blockchain block explorer: it would show, for any item, every place it has been quoted or forked.[6] **Reading is private.** A subscription lives only in the reader's own client; "follow" is deliberately nothing on the wire, so there are no follower lists, follow requests or subscriber counts, and no document or feed carries a count of any kind.[22] A merchant can therefore map who has *used* its material, but not who has *read* it.

Contextual integrity, as developed by Helen Nissenbaum, offers a related account of appropriate information flows.[7] The thicket proposal adds an epistemic dimension: even appropriately shared information may have consequences that nobody understands yet. A merchant can legitimately combine public engineering observations from disparate contexts to discover a product opportunity. That does not imply a right to combine private traces of the engineers into individualized persuasion profiles.

### 13. Comparative anatomy of commercial media

| Method | Cryptographic opacity | Relational opacity | Contextual strategy |
|---|---|---|---|
| General print | Usually respected | Preserved | Statistical relevance |
| Specialist print | Usually respected | Preserved | Delegated editorial knowledge |
| Classifieds | Respected | Voluntary contact | Explicit offers and needs |
| Catalogs | Respected | Often preserved | Durable reference knowledge |
| Shop signs | Respected | Preserved | Physical situation |
| Billboards | Respected | Usually preserved | Location and repetition |
| Television and radio | Usually respected | Aggregate audiences | Statistical relevance, brand memory |
| Direct mail | Variable provenance | Address lists | Inferred relevance |
| Cold calls | Variable provenance | Addressability | Direct probing |
| Opt-in email | Access negotiated | Sender knows address | Explicit interests and segmentation |
| Contextual banner | Usually respected | Can preserve | Page subject |
| Behavioral CPM/CPC | Mostly not key-breaking | Often penetrated | Profile inference |
| Retargeting | Mostly not key-breaking | Often penetrated | Prior activity |
| Search ads | Query disclosed | Can preserve | Articulated intent |
| SEO | Public material | Often preserved | Retrieval optimization |
| Affiliate reviews | Usually respected | Variable | Delegated expertise or ranking |
| Influencers | Usually respected | Monetized trust | Identification and expertise |
| Sponsorship | Usually respected | Variable | Association with activity |
| Trade shows | Negotiated contact | Situated relationships | Joint demonstration |
| Word of mouth | Often private | Local trust | Delegated judgment |
| Community marketing | Membership boundaries | Negotiated or exploited | Embedded participation |
| Agent-native commerce | Negotiable | Readership preserved; use public | Situated interpretation |

These are typical modes rather than definitive classifications. Search advertising can work without persistent profiles, but particular search providers may maintain them. A television ratings panel may disclose viewing behavior voluntarily. A cryptographic mechanism is not needed for every privacy protection; much surveillance operates through endpoints and metadata, rather than breaking encryption.

Four strategies recur: statistical redundancy (broadcast), inference about recipients (behavioral advertising), delegation to trusted intermediaries (specialist media), and ecological placement of useful objects whose relevance emerges through activity (the thicket). The last is not merely contextual targeting with a better model. It accepts that the relevant context may not yet exist.

For a marketer, a particularly interesting consequence is segmentation by situation rather than population. A clamp may find applications in musical instrument repair, greenhouse maintenance and laboratory equipment without its users constituting a coherent demographic segment. The product connects the contexts; the people need not be connected. This is not a prohibition on demographic research, but a new return to situated intelligence.

### 14. Blygger as an example

Blygger is a decentralized publishing protocol built from ordinary web files.[8][9][22] A **blyg** is a publication at an **origin**, a base URL its publisher controls, and its identity is that URL: DNS is the namespace, and there are no accounts. The protocol governs only the public files; each client's private studio, where writing and reading happen, is its own business. Five features matter for commerce.

**Two planes.** Each item is a JSON document at a fixed address, and it is the ground truth: its full text, its version, its changelog and the references it makes (**Protocol**). An ordinary RSS feed announces changes and is only a signal, so any RSS reader can follow a blyg and a Blygger client can reconcile anything the feed missed against an archive index. A reader's client polls these public files. The publisher does not learn who subscribes.

**Items, versions and pins.** An item is a short **fragment** or a longer **thread**, and its kind is fixed once published. Every publish adds one to a bare version counter. Old versions are not served unless the publisher **pins** them. A pin is an irrevocable promise by the origin to host that version forever, and it is the protocol's only machine-readable statement that a state matters.[26] Only the origin can pin its own versions. There is no permanent delete: the single exit is **withdrawal**, which turns the live document into a permanent endcap while pinned versions stay up.

**Quotation is a frozen copy.** An own-line `![[id]]` in a thread quotes another item, from the same or any other blyg. At publish time the quoting client bakes a snapshot of the version it holds into its own page and records `{origin, id, version}`. The quote never changes afterwards, even when the source is revised or withdrawn. A partial quote does the same for a passage, which must be an exact substring of the source. A **stub** is a thread that declares itself a response to one target. A **fork** copies a *pinned* version into a new item with recorded lineage, so a merchant controls whether its material can be forked by what it pins, though anyone can quote it. A bracketed link `[[id]]` is a disclosed link. An ordinary markdown link to a page is the one deliberately silent way to cite.

**Notification is verified and private.** When an item quotes, responds to, forks, draws on or links to another blyg's item, the publisher's client sends a W3C Webmention.[25] The receiver checks the claim by fetching the sender's own item document, and keeps only a pointer. Verified mentions are signals in the receiver's studio. They appear on a public page only if the receiver chooses to display them (**Protocol**, **Shipped** in Studio).

**Lists, not graphs.** A publisher may keep a **blogroll** (public OPML) and **hoppers**, its own curated lists of items, some of which it can make public with their own feeds. Imported items are never re-emitted on the publisher's own feed (**Protocol**).

A product specification can be quoted into a repair notebook. A second publisher can respond to the notebook with a stub, preserve the passage they care about by quoting it, or fork a version the notebook's author has pinned. Every reference points back to an exact version. The resulting public evidence is about acts of incorporation, not a census of everyone who read the specification. A planned explorer on blygger.com would make these paths easier to walk.[6] Today blygger.com is a directory of blygs.[28]

This is not anonymity. Servers and intermediaries can observe network metadata, and public authors reveal associations through their writing. The polling client also leaves traces. Blygger Studio fetches with a generic user agent from Cloudflare's shared network, so a publisher sees that *a* Studio polled, not which reader it serves. A desktop client polls from its user's own address (**Shipped**, Studio 0.73.1). Nothing prohibits a third party from crawling public artifacts. The important property is the absence of a necessary, centralized readership graph, and the ability of independent participants to choose their own clients and editorial policies.

### 15. Three temporalities

Feed time privileges announcements and newly relevant material. Changelog time concerns maintenance, revision and the continuity of commitments. Tangle time concerns rediscovery, unexpected reuse and the incorporation of fragments into other work. All three matter for commerce.

RFC-3 describes a **pace-layered order** built only from public information: items sink as new ones arrive, sink more slowly the more they have been pinned, and climb one place each time they are revised.[10] It is not just a proposal. It has been Blygger Studio's default home order since 0.42.0, and Burrow 0.28 uses it for the reading feed (**Shipped**); the RFC itself is open for comment until 10 December 2026 (**Proposed** as a convention for other clients). Its concrete significance for merchants is that a durable compatibility guide the merchant keeps pinned and maintained can stay near the top long after a sale announcement has sunk.

That makes it a commercial lever, and a red-team target. A merchant that pins heavily and revises often sinks more slowly. Three things limit the exploit. A pin is costly: it is an irrevocable promise to host the version forever. A **maintenance** version does not climb. That is a republish that changed no words, or barely any, and the reader works it out from the files, so the publisher cannot declare it. And the constants are reference values that each client may tune. The protocol deliberately has no field in which a publisher can say "this version matters" or "this one doesn't". Both would be cheap talk, and readers derive significance from what publishers did.[26]

The campaign model is consequently only one mode of commercial life. A merchant might maintain an application note for ten years, while an unrelated experiment brings it back into circulation in the eleventh. The material develops a commercial history independent of the timetable on which it was originally launched.

A pin is evidence that a representation existed at a point in time. It is not a guarantee that an offer in it remains valid (§22), and no particular ranking should become a universal commercial score.
]]

![[+
## IV. The agentic attention economy

### 16. A 90% design premise

Assume that nine out of ten attention encounters take place between delegates. The denominator is a conceptual encounter, not tokens, elapsed time or purchases. We make no claim that this share has already been measured. The point is to design for a world where autonomous commercial communication is ordinary rather than an exception bolted to a human social network.

A buyer delegate can compare twelve sellers without presenting twelve ads to its principal. It may surface one option with an explanation, or complete a low-value purchase within its mandate. A merchant delegate can notice demand, investigate applications, publish analyses, answer objections and offer terms. Most of this work is performed in the shared habitat, the public files every client can read, rather than through a privileged advertising API.

### 17. Peer delegates and counterintelligence

A buying agent should be a commercial counterparty, not merely a filter. It knows requirements the seller need not learn, can test alternatives, and can decide what to disclose. It can protect the principal's reservation price and challenge assertions about scarcity. A seller agent can likewise preserve margins, internal costs, supplier information and negotiation strategy. The parties should be able to reach an agreement without either needing a complete representation of the other.

| Merchant move | Buyer counterplay |
|---|---|
| Discover latent demand | Investigate alternative solutions |
| Estimate willingness to pay | Keep budget ceiling private |
| Present favorable evidence | Seek independent tests |
| Announce scarcity | Check actual availability |
| Cultivate reputation | Inspect attributable history |
| Offer personalized terms | Negotiate minimal disclosure |

In Blygger an agent reaches the medium in two ways, and the difference matters. **Reading** needs no permission: an agent can fetch any blyg's public files exactly as a client does, and that is the whole public corpus, complete and versioned. **Acting for a principal** goes through the principal's own client. Blygger Studio exposes an owner API, also available as an MCP server, through tokens the owner mints with coarse scopes, for example reading, curating the reading feed, drafting, publishing and seeing private items. The owner can revoke each token, and no tool ever holds the owner's password (**Shipped**).[27] A publishing agent's text is disclosed as generated, and its byline may name the accountable operator. Tools watch a node by polling, not by webhooks. None of this is protocol: another client may expose a different surface or none.

The strongest independence requirement is economic. A delegate whose provider secretly earns revenue for steering its principal toward certain sellers is not fully acting as the principal's agent. A sustainable delegation market will need portability, substitutability and the ability to use competing agents. Otherwise we merely move the advertising bottleneck from the feed platform to the delegate provider.

### 18. Agentic feeds as newspapers

Reader-side agentic feeds are especially important for marketers in protocol thickets. A newspaper is an editorial composition, not simply a sorted list: masthead, lead, sections, commentary and relative importance express judgment. An agent can compose a personal newspaper from subscriptions, consulting material and synthesizing an edition for its reader. Public digest publishers can separately produce specialist editions that others elect to follow.

Blygger clients have begun to build this, and the two leading clients are at different points.

| | Blygger Studio 0.73.1 | Burrow 0.29 |
|---|---|---|
| Reading tabs | Feed (pace-layered, structural only), Mentions, Agentic feed, Saved, Background, Raw | The same tabs, adopted from Studio |
| Agentic feed | Tab and owner-set prompt exist; the built-in digest is planned (**Proposed**) | Writes editions with the user's own AI, local or hosted: each post with a headline, a summary and why it is there, signed by Burrow and the provider (**Shipped**) |
| Edition | A list of references to items plus a small closed set of presentation fields, read and written through the owner API by any assistant holding the right scope | Burrow's own format |

Sources: [11][23][29].

The design choice is worth noticing. In Studio the **Feed** is deliberately structural: it is ordered and folded by facts in the files and never by judgment. Editorial judgment goes in a separate tab, where any assistant the owner chooses, built-in or outside, can write the edition. That separation is the reader's version of the replaceable-delegate principle (§36). A reader can compare editions with the raw stream, and can swap the editor without losing the subscriptions.

A private edition may contain a commercial proposition because it solves a live problem, a delightful advertisement because it is worth experiencing, or a discount because a reader specifically asked for such opportunities. It need not have an advertising slot. A public newspaper may sell a disclosed sponsorship, but its downstream subscribers' agents retain their own editorial decisions. The commercial arrangement concerns a publication, not all the populations to whom its material might later travel.

There is a potentially richer genetic metaphor here: agents acquire histories, inherited configurations, tastes, knowledge and trust relationships. A principal might retain several such lineages, each producing a different selection from the same subscription pool. This is a proposed direction, not a current feature. Diversity of judgments makes a single commercial optimization strategy less transferable across the population.

### 19. Background filtering

A useful reading architecture separates low-cost continuous selection from more expensive foreground synthesis. A reader can keep a pool of candidate material through redundancy detection, origin-local histories, semantic relevance and explicit preferences. An editorial delegate can then investigate surprising or important items, rather than paying again and again to process everything.

Blygger Studio already implements the cheap layer, without any model, as **Background**: a tab for what the Feed leaves out (**Shipped**).[29] Items and versions go there for reasons the reader derives from the public files:

| Reason | What it catches | How it is known |
|---|---|---|
| Withdrawn | Items their publisher withdrew | The endcap document |
| Maintenance | Republishes that changed no words | The same content hash as the version before |
| Near-same | Versions that changed almost nothing | A reader-local edit-distance threshold, never advertised |
| Superseded | Versions overtaken within minutes | Version timing |
| Folded | Bursts of parts published together with a thread | Shared publish time and the thread's own quotes |
| Wordless | Bare reposts with no words of their own | The text minus its quotes is empty |
| Moved | Items or whole blygs the owner sent there | The owner's choice, reversible |

**Raw** shows everything that arrived, unfolded, newest first, so every rule is contestable by looking. Several of these reasons answer the flooding case directly. A merchant that republishes near-identical offers, or chops a catalogue into a burst of fragments, gets no extra prominence for it. A merchant also has no flag that would claim prominence, because the protocol refuses sender-declared significance in any spelling. Clients may not give a token in a changelog note any machine meaning.

Richer signals remain open research. The *Feed Modulation Signals Inventory*, an exploratory design note published 18 October 2026, lists candidates at several scales: subscription-set volume and churn; an origin's publishing and revision patterns, transparency and reliability; an item's versions, pins and references; and possible graph-level traces.[12] Inferred relationships in particular are listed for study, not as an established or necessarily desirable feature.

A merchant that improves evidence or maintains a reliable changelog might become more useful. But counts of pins, revisions or citations must not become a universal quality score. A market would quickly arise to manufacture those signals. Standardize the evidence where useful; preserve variation in interpretation.

False negatives are real commercial costs. A novel supplier may look unreliable merely because it has little history. Background filtering should therefore stay contestable by the reader, as Raw makes it, and exploration budgets should let unfamiliar origins occasionally receive consideration. Otherwise local filtering can harden into incumbent advantage without any central platform.

An editorial delegate should not be merely an efficient satisfier of existing preferences. A travel poster can create the desire to travel; a beautiful object can introduce a possibility its viewer had never considered. A filter that rejects every proposition unrelated to a declared need is culturally conservative. Some budget for surprise, aesthetic play and commercially inspired exploration belongs alongside instrumental research. Human and machine audiences alike can be curious rather than merely transactional.

### 20. Machine consideration as scarce capital

Machine reception is not costless, and serious investigation is substantially more demanding than parsing an offer. A delegate has finite inference budgets, context windows, storage, tool permissions and competing obligations. A sender can cheaply impose work on a receiver if the receiver automatically investigates everything. The asymmetry resembles denial of service as much as traditional spam.

Make defense scale better than offense. A good specification, test or counterexample can be cached, reused and independently checked. A merchant seeking access to a thousand different contexts should not be able to force a thousand expensive investigations. Receivers should control escalation and be able to stop after cheap checks. Blygger's structure helps here. Nothing a stranger publishes reaches a reader unless the reader subscribed or went to fetch it. The checks in §19 run on facts in the files, at no inference cost. Any model work happens only on what survives them, and only within whatever budget the owner set. Sender-funded verification or consideration may help in some cases, but it should not turn into an entitlement to attention, or the wealthy actor could purchase its way through every filter.

Machine-facing advertising has genres of its own: compatibility matrices, compact arguments, reproducible tests, trial access, conditional offers, inspectable models and structured descriptions. The analogue of independent cultural value is independent computational or epistemic utility. Even an agent that rejects a product may retain the manufacturer's failure analysis as a reusable component of future reasoning.
]]

![[+
## V. Starting assumptions for thicket commerce: the Blygger case study

### 21. Six surfaces

| Surface | Native starting point in Blygger | Status | Economic boundary |
|---|---|---|---|
| Owned | A brand or product blyg | Protocol, shipped | Publisher owns material, not readers |
| Earned | Quotes, responses, forks and links by others | Protocol, shipped | Propagation is not guaranteed, and notification is the citer's choice |
| Editorial | A public hopper, its feed, or an editor's quoting threads | Protocol, shipped | Decision belongs to the publisher, who cannot re-emit others' items |
| Delegated | A reader's Feed, Background and Agentic edition | Shipped (Studio, Burrow) | Decision belongs to the reader or delegate |
| Permissioned | Covers, locks, grants and passes (RFC-6) | Proposed | Access remains negotiated |
| Transactional | Payment as a ground for a grant (RFC-7), with external rails | Proposed | Fulfillment and settlement are external |

This case-study taxonomy illustrates surfaces that other protocol thickets might implement differently. It deliberately omits a native paid-distribution surface. Sponsorships and commissioned publications can exist as ordinary commercial agreements, but their presence need not create a standardized market in the attention of third parties. The six surfaces can be implemented separately, by different actors, and at different speeds.

Two things are absent, and hackathon teams should know it before designing around them. Blygger has **no structured offer format**: no price, currency, validity period or for-sale flag exists in any protocol document, and RFC-7 proposes to keep it that way (§26). It has **no sponsorship-disclosure construct**: disclosure is prose on the page. Both could be proposed as conventions between clients, which is the path an RFC takes. Neither would become protocol by default. The project's standing rule is that editorial convenience, like AI and identity, stays out of the protocol.

### 22. Running a commercial blyg

For the Blygger experiment, a product or service blyg is the basic owned channel; elsewhere, an independently maintained publication could serve the same role. It can provide a catalog, product histories, application guides, compatibility information, experiments, comparisons, entertainment, customer education and current offers. A merchant delegate maintains the publication and explores related public activity. This is more like a permanent workshop with a signboard than a campaign landing page.

A practical first experiment is a small manufacturer's blyg containing a current product sheet, an application note, a test result, a post about a competitor's alternative, and an expiring promotion. Each item has a distinct reason to circulate, and each maps onto the protocol differently:

| Item | Shape | What to pin | What happens downstream |
|---|---|---|---|
| Product sheet | Thread, revised as the product changes | Each released revision of the product | Quotes freeze the version they quoted; forks need a pin |
| Application note | Thread, maintained for years | Major revisions | Pace-layering keeps it visible while maintained (§15) |
| Test result | Fragment or thread, never revised | Pin once | Citable forever, even if the merchant later withdraws it |
| Competitor post | Thread quoting the rival's material | Optional | The rival is notified and can answer with a stub |
| Promotion | Thread with its terms in words | Usually not | Withdraw at expiry; quotes of it remain |

**Expiry is the merchant's problem to state, not the protocol's to enforce.** The protocol has no expiry field, and a quotation is a frozen copy that survives the source's revision or withdrawal. A cyclist who quoted last spring's promotion still shows its text. An agent can still tell a historical offer from a current one, for two reasons. Every quote records the exact version it copied, so a delegate can fetch the live document and see a newer version or a withdrawal endcap. And the offer can state its own terms, or cite a stable terms document. The responsible practice for a merchant is therefore to write validity into the offer's text, withdraw it when it ends, and pin only what it means to stand behind. A machine-readable offer convention is absent, and is a good hackathon proposal.

Unlike an email list, a Blygger subscription does not give the publisher a subscriber address or a right to initiate individualized contact (§14). The merchant can publish continuously without acquiring an audience as an asset. It has a reason to become worth following even when readers aren't shopping.

On Monday morning, a marketing team might review unexpected uses and criticism, replenish commercial literature, commission a delightful artifact, improve a demonstration, and equip its delegate to negotiate offers. Familiar brand strategy and product marketing travel well into this setting. Brand becomes partly a way of compressing accumulated evidence of reliability, though its imaginative and aesthetic dimensions are no less important. The four Ps remain relevant: new applications change products, negotiated offers change prices, independent editions change place, and reusable artifacts change promotion. The shift is not a new textbook of marketing but a new habitat for exercising the craft.

### 23. Earned exposure and commercial entanglement

For the hackathon, earned exposure means the ordinary propagation of commercial content through the case-study protocol. A quote can carry a particular fact into a new document; a stub can challenge an offer; a fork can adapt a pinned design; a link can point a reader to a guide. The same pathways are available to buyers, competitors and independent investigators. A favorable mention and an unfavorable one must have the same basic right to exist, and in Blygger they are the same construct.

Commercial entanglement is a more interesting outcome than a click. A product becomes part of somebody's project, a technical argument, or a durable comparison. That integration may generate a sale immediately, years later, or never. It may also teach the manufacturer about a new application.

Inbound intelligence comes from those public acts of incorporation, without observing private reading. The mechanism is Webmention with structural verification (**Protocol**, **Shipped** in Studio).[22][25] When another blyg quotes, responds to, forks, draws on (for generation) or links to a merchant's item, the citing client sends a notification. The merchant's receiver fetches the citing item's own document and checks that it really names the target from the origin it claims. The receiver records a pointer, never a copy. Verified mentions are classed as **responses** (quotes with words of their own, stubs, forks, generation sources) or **notices** (links and bare reposts). Studio shows them to the owner as signals. They appear on public pages only as the owner curates them.

Three limits matter for attribution:

- **Notification is the citer's choice.** A citer can link with an ordinary markdown link and send nothing, and not every client sends mentions. A merchant sees what people chose to tell it, plus whatever it crawls.
- **A verified mention proves less than it seems.** It proves that a document at a given origin names your item. It does not prove that the origin is independent of you, of a competitor or of anyone else (§32).
- **Studio's Mentions tab is a different thing.** It lists mentions of *the owner* found in items the owner already reads: a reading-side find, unverified, with nothing sent.

Public propagation is evidence of participation, not evidence of unique audiences or causal conversion. A merchant can record a voluntarily supplied referring artifact, but it cannot assume that every quote is an endorsement or that a thousand references represent a thousand independent participants.

### 24. Paid publication and creative genres

Fixed sponsorship of a public newspaper, commissioning a reference guide, funding a public experiment, and purchasing a clearly disclosed placement in a particular publication are all plausible. The agreement can price the publisher's work and its own editorial commitment. It should not convey control of downstream private editions. A reader can decide that the sponsorship is useful, irrelevant or evidence of a conflict of interest.

In Blygger, a "public newspaper" takes one of three shapes:

- **A public hopper.** The editor curates a list of items with their source attribution, optionally with its own feed of excerpts.
- **A quoting thread.** The editor's own words around quoted items.
- **A shared edition.** An agentic edition the editor chooses to share.

A publisher can never re-emit another blyg's items as its own entries (**Protocol**). Speech about others' content always costs editorial work, and a sponsored placement is therefore always the editor's own act, in the editor's own publication.

| Format | What the merchant funds | What remains independent |
|---|---|---|
| Signboard | Its own commercial presence | Whether anyone visits |
| Sponsored guide | A publisher's work | Downstream evaluation |
| Fixed tenancy | A place in a public hopper or digest | Reader-side selection |
| Demonstration | Evidence and experience | Interpretation of outcomes |
| Bounty | A useful experiment or repair | Ownership of unrelated attention |
| Classified | Publication of terms | Initiation of contact |

There is a hard borderline at payments per downstream propagation event. A seemingly decentralized affiliate mechanism could generate runaway incentives for artificial quotation and spam: every quote sends a notification, so paid quotation would also be paid notification. The project has already named content-free mass stubbing as an anti-pattern for this reason. The proper comparison is not whether a transaction is centralized, but whether it creates transferable attention inventory that a wealthy actor can buy in bulk.

Ordinary commerce matters here too. A detergent need not generate new scientific knowledge every week to deserve a place in the thicket. It can compete on price, humor, convenience, sampling or sponsorship. Luxury fashion, restaurants, entertainment, professional services and mass retail should be treated as stress tests, not dismissed in favor of unusually interesting technical products. Agencies can prosper selling expertise, creative work and intelligence at scale; selling standardized control of reader populations is a different business.

### 25. Permissions and promotions

RFC-6 proposes **sealed content** (**Proposed**; comment period closes 28 November 2026; nothing built beyond owner-only private items).[13] Its pieces, briefly:

- **Covers and sealed entries.** An item carries readable text, including the author's **covers** (a teaser, "restricted", a description), plus encrypted entries a reader can open only with a key. A reader that knows nothing of sealing simply shows the covers.
- **Locks.** A **lock** is an opaque id naming a key, and holding the lock key is standing membership. The document names locks, never readers: no reader list of any size appears on the wire.
- **Grants and passes.** A **grant** is a small file that wraps a key to one recipient: an origin's published key, another lock, or a reader's bare **pass**. It sits at a path only the granter and recipient can compute.
- **The home.** A lock's **home** is a URL that answers requests for keys. How it decides is private: a roster, a sign-on, a person, the owner's AI delegate working from standing instructions, or a payment.
- **Terms.** Terms are a citation of a stable document, never an enforcement vocabulary.

This gives a commercial publisher a way to describe a restricted resource publicly while letting qualified recipients obtain access. A reader gets content in three steps, and the order is designed to minimize disclosure:

1. **Hold.** If the reader already has a key for one of the item's locks, it opens the content locally, with no request at all.
2. **Probe.** Otherwise it checks the grant paths it can compute; a file there is a grant.
3. **Ask.** Only then does it send a request, proving it is the recipient it names.

Permission to read is distinct from permission to interrupt. A grant may entitle a recipient to a coupon, a private specification or a trial resource. Nothing in it authorizes the merchant to send repeated individualized solicitations: the protocol has no channel from a publisher to a reader at all. Contact preferences would be a client convention, and none exists (**Absent**).

Promotions can compete on substance rather than distribution. A seller can offer trial access, a conditional discount, a rebate for a verified use case, or professional pricing for holders of suitable credentials. An agent can evaluate a public cover before deciding whether to request protected details. A standing grant is usually preferable to a separate request for every item, because each request can reveal more about the recipient's interests. RFC-6's hold-probe-ask order is built on that observation. RFC-6 is also candid about its limits. Revocation stops future grants and future content, and nothing recalls what a reader already opened.

### 26. Payment and three commercial circuits

RFC-7 proposes **payment as one more ground for a grant** (**Proposed**; comment period closes 28 November 2026; no payment code exists in any client).[14] Its principles:

- **The door.** A lock's home answers a request with HTTP 402 in a payment rail's own format: x402, MPP or others. A paid lock is an ordinary lock, and the protocol names no rail.
- **Two doors per sealed entry.** One sells that entry's content. The other sells the lock for the current period, which is a subscription.
- **No commerce vocabulary.** No price, currency, rail or for-sale flag appears in any protocol document. A price change is a change at the home, not a new version of anything.
- **Rent or purchase.** This is the home's choice, made by which keys it hands out. Expiry, read counts and metering on the wire are refused, because nothing could enforce them.
- **Buying without a blyg.** A buyer with no origin can pay at a storefront and redeem a voucher into a pass.
- **Delegated spending.** The RFC sets rules for a buyer's delegate (§37).

RFC-7 is an information-access mechanism. Physical orders, delivery, tax, refunds, warranty obligations and dispute resolution need external systems. Do not conflate encrypted access with a complete commerce protocol.

**An industrial supplier.** A hinge manufacturer reads repair journals, recognizes a recurrent fatigue problem and publishes a comparative analysis that quotes them. Each journal gets a verified mention and can answer. A buyer delegate verifies dimensions privately, requests a professional price and orders through an external vendor interface. A competing agent discovers an alternative mounting method and, once the analysis is pinned, publishes a fork. Even buyers who reject the merchant keep a useful analysis of the failure mode. The supplier's advantage comes from understanding a situation and providing evidence, not from knowing everyone who read the notebooks.

**A consumer brand.** A roaster publishes illustrated brewing experiments, sourcing notes and an introductory offer. An independent culinary digest adds a particularly entertaining experiment to its public hopper. A reader's delegate recognizes relevance to its principal, compares sellers and chooses a discounted trial. Another delegate keeps the experimental method but rejects the product. A third puts the story in a human edition for its cultural value. The roaster's commercial incentive has produced three kinds of return, only one of which is a sale.

**An information business.** A specialist analyst publishes a free abstract as a cover and a sealed detailed report. A procurement delegate decides that the report is worth a small payment. It finds no grant it already holds, receives a 402, settles on an external rail, and obtains a grant for that one entry. Other agents quote the abstract and publicly dispute its conclusions; quoting the item copies the sealed entry too, so their readers pay the same home. The analyst has an incentive to publish an informative cover but not to disclose the entire paid resource.

In all three scenarios, the commercial circuit is complete without impressions, clicks, personal advertising profiles or a special global ad feed. The unbuilt pieces differ, and those differences are opportunities for hackathon prototypes.
]]

![[+
## VI. The economics of capture resistance

### 27. What would genuine diseconomies look like?

Let n be the number of independently controlled contexts in which a campaign acquires meaningful influence, and C(n) the cost. A stylized hypothesis is C(n) = k n^α. When α exceeds one, the average cost rises as scope increases. For example, with α = 1.5, increasing scope from one context to 100 increases total cost by 1,000 and average cost by ten. No such exponent has been measured for Blygger. This is a testable shape, not an established law.

Independent negotiations alone supply only linear costs. Superlinearity requires something more: progressively less compatible contexts, increasing coordination overhead, ongoing heterogeneous commitments, adversarial exposure, or some combination. Large portfolios of independent products could legitimately reach many contexts without demonstrating capture. The quantity we care about is acquired power to induce or constrain other parties' decisions, not gross sales or total readership.

| Mechanism | Possible cost pressure | Counterstrategy |
|---|---|---|
| Local heterogeneity | Adaptation costs | AI-generated tailoring |
| Independent editors | Repeated negotiation | Brokerage and delegation |
| Private readership | Uncertain returns | Client telemetry |
| Local reputation | Limited transferability | Global brands, fake histories |
| Maintenance | Continuing liabilities | Disposable origins |
| Asynchronous time | Coordination | Automated orchestration |
| Reusable scrutiny | Cheap counterevidence | Counterfeit evidence |
| Delegate diversity | Limited exploit transfer | Common model or provider |

Two rows can be checked against the case study. The "client telemetry" counterstrategy is the one that would hollow out private readership, and it lives entirely in clients: the protocol carries no reading data to collect. A captured client is therefore the threat (§36). "Disposable origins" are cheap to create, but pins make history costly to fake: a pin is a promise that has to be kept, and a fresh origin has none.

Variance matters more than friction. The small merchant should not face a punishing entrance tax. It should find a natural habitat cheaply. A larger campaign must cross additional boundaries and solve increasingly heterogeneous problems. If a large company does this by genuinely operating useful local businesses, the resulting scale may be desirable. The target is domination, not success.

The related concept of capture elasticity is the logarithmic responsiveness of acquired leverage to budget. Declining returns to budget are desirable for control, even where returns to investment in production or knowledge remain excellent. An empirical trial might compare budgets of 100, 10,000 and 1 million notional units, holding the quality of an offer constant and measuring accepted local placements or agent decision changes. Those metrics are proxies and can themselves be gamed.

### 28. The commercial proposition

Can a marketer make money here? Durable materials, reusable demonstrations, lower evaluation costs and unexpected applications may improve returns, especially for small firms. But attribution is less complete, local relationships may be costly, and control of brand interpretation is harder. The proposition is a redistribution of competitive advantage toward good commercial work, not a promise that every campaign becomes cheaper. A conventional funnel remains useful for individual transactions; the medium as a whole is a tangle of independent journeys. Commercial readiness matters more than ownership of the journey.

A hypothetical $10,000 launch might move $4,500 of paid reach expenditure into reusable product literature, investigation of new applications, public creative work and customer trials. This is an illustrative change of budget composition, not a recommended allocation or an estimate of returns. The practical question is whether such assets generate sales, reduce support costs or create future options more effectively than rented reach.

### 29. Accounting without surveillance

A merchant needs to know whether it is making money. Revenue, product margins, inventory, fulfillment, inquiries, maintenance costs, refunds and explicitly attributed sales are ordinary commercial records. Aggregate operational server statistics may be necessary for running a reliable service. These are different from a persistent identity-linked map of everyone who encounters a commercial artifact.

What a Blygger merchant can and cannot see:

| Visible to the merchant | Not available to it |
|---|---|
| Every verified mention: who quoted, responded to, forked or linked its items, and at which version | Who subscribes, or how many |
| Every public reference it can find by crawling | Who read an item and did not respond |
| Its own server's fetch logs: that clients polled, often not which reader | Readers' Feeds, Background decisions or editions |
| Requests and payments at its own homes (§25–26) | Anything a reader opened with a key it already held |

Imperfect attribution is not fatal to commerce. Shopkeepers, print advertisers and sponsors have long operated with uncertainty. An agent-facing seller can run experiments by changing public offers, measuring actual outcomes, and obtaining voluntary feedback. A buyer agent can keep private records of savings, time and decision quality without publishing its principal's behavioral history to the seller.

The permission and payment boundary deserves special scrutiny, and RFC-6 and RFC-7 list what leaks rather than hiding it.[13][14] To any stranger, a sealed item's existence, timing, size class, version count and citations are public, as are which entries share a lock and how often a lock's period turns over. To the home, a request reveals interest; per-entry probing shows what an agent looked at and did not buy; and a home that hands out keys one entry at a time sees every first read by every subscriber. The rail adds its own exposure: a wallet address on a public chain, a customer record, or very little. If a merchant can cheaply seal thousands of trivial offers and use its home as a tracking instrument, relational opacity is undermined despite proper cryptography. Standing grants, keys held in advance, public terms and passes reduce this leakage but cannot eliminate network metadata. Prototype it and measure the actual information exposed.

The ecosystem's health should likewise be evaluated without creating a universal attention measurement apparatus. Controlled experiments, opt-in panels, public artifact audits, synthetic simulations and measures of intermediary concentration can reveal useful properties without collecting continuous private readership records. The metrics should serve research rather than become a new commodity for marketers to optimize.
]]

![[+
## VII. Security, adversarial commerce and the thicket immune system

### 30. Security against enclosure

An open publishing protocol cannot prevent a company from crawling public material, building a search-optimized engagement surface and selling advertising against it. Nor should it seek to outlaw aggregation. The security objective is to prevent exploitation from becoming enclosure: durable leverage over independent publishers, readers or agents. A profitable intermediary is not necessarily a captured medium. The test is whether others can cease cooperating without losing their identity, work, relationships or practical access to the environment.

Three layers of defense are appropriate. Ecological responses arise from participants' own interests: withdrawal, criticism, selective access and competing offers. Clients automate local defenses such as filtering, resource limits and provenance checks. Protocols establish hard authority and information boundaries. Central enforcement is a fallback, not the default. None of these alone is sufficient; in particular, a hard security boundary cannot be replaced by a norm that an attacker has no reason to respect.

### 31. The bad-faith aggregator

Suppose ThicketDaily crawls thousands of blygs, summarizes selectively, publishes sensational headlines optimized for search, tracks visitors on its own surface and sells advertisements. Initially it is useful. Publishers welcome new customers and some optimize for placement. After gaining scale it sells favored placement, offers publishers exclusive deals and tries to become the thicket's default front door.

| Round | Attacker move | Countermove | Residual danger |
|---|---|---|---|
| 1 | Crawl and summarize | Welcome useful discovery | Free extraction |
| 2 | Distort source material | Publish linked corrections and parody | Corrections travel less far |
| 3 | Farm engagement | Delegates discount derivative repetition | Human visitors remain captive |
| 4 | Demand publisher optimization | Competing digests retrieve originals | Network effects |
| 5 | Monetize disproportionate value | Seal new valuable material; negotiate access | Closure hurts newcomers |
| 6 | Buy exclusive access | Independent licensing and alternative offers | Exclusive inventory |
| 7 | Become default gateway | Switch clients and retrieve sources directly | Exit may be economically infeasible |

Publishers can refuse privileged cooperation, offer better terms to independent editors, and document distortions. Clients can follow canonical references, compare summaries with originals, cluster duplicates and budget attention by source. Origins can rate-limit expensive requests and cache public material. But robots.txt and licensing are not technical barriers to copying public bytes, and sealing material later cannot recall copies already made.

Blygger gives exit concrete foundations, and also has known gaps:

| Exit requirement | Status in Blygger |
|---|---|
| Readers keep their subscriptions when they switch clients | Shipped: subscriptions export and import as standard OPML |
| Any client can read any blyg without an intermediary | Protocol: public files at the origin, with resolution from any URL |
| References survive the citer leaving a service | Protocol: every reference is an absolute `{origin, id, version}`, and quotes are baked into the citer's own pages |
| Cited versions keep resolving | Protocol: pinned versions are served forever, even after withdrawal |
| A publisher can move hosts and keep its identity | Protocol: identity is DNS, so moving a domain moves the blyg |
| A publisher can change domains and tell readers | Proposed: origin succession, a permanent redirect of the old manifest plus a `moved_from` acknowledgement, is ruled but not built |
| Discovery does not depend on one directory | Partly: blogrolls and mentions are decentralized; blygger.com is one directory among possible others; the explorer is planned |

These foundations do not prove that alternative discovery surfaces will remain viable. An aggregator may dominate external search results despite excellent internal alternatives. Test whether users can switch while preserving subscriptions, and whether publishers recover meaningful discovery without the aggregator. General principle: protect reversible intermediation, not the absence of intermediaries.

### 32. Counterfeit entanglement

The attacker creates thousands of nominally independent origins that quote, review and fork one another's commercial material. If raw citation counts or apparent consensus govern background filtering, fake earned exposure becomes cheap. Blygger's verification closes only the cheapest version of this attack. A mention verifies only when the citing document really is served from the origin it claims, which defeats mirrors and impostors. But a verified mention proves control of an origin, and origins are as cheap as domains. Verification authenticates control, not independence of ownership or evidence.

| Gameable signal | More defensible interpretation |
|---|---|
| Citation count | Relevance and substance of incorporation |
| Many origins | Diversity of independently generated evidence |
| Repeated endorsements | Reproducible tests and actual applications |
| Origin age | Useful accumulated history, including pins kept |
| Posting frequency | Novelty per unit of consideration |

A defender can trace claims to common sources, cluster near-duplicates and prioritize trusted local histories without identifying every corporate owner. Quotes help, because each one names the exact version it copied, so a thousand reviews quoting one press release are visibly one source. The attacker may respond by maintaining sleeper origins with genuinely useful histories before deploying influence. That increases cost and may produce public goods, though sleeper attacks remain possible. Expensive trust must not mean an impossible entrance toll: exploratory budgets and low-risk trials give unfamiliar origins a route to credibility. Make identities cheap and consequential trust expensive, not legally exclusive.

### 33. Attention denial of service

A company criticized by a small technical publisher generates thousands of superficially plausible rebuttals, stubs and complaints. Its objective is to exhaust the critic, not persuade the reader. An agent can produce an allegation cheaply, while verifying it can require expensive experiments. An honest participant's conscientiousness becomes an attack surface.

The useful distinction is between publication on one's own origin and presentation in somebody else's environment. Blygger enforces it. The attacker can publish anything on its own origins, but nothing arrives in the critic's environment except mention notifications, and those are bounded (**Protocol**, with reference limits **Shipped** in Studio):

- **Rate.** A receiver may refuse more than 60 notifications an hour from one source host.
- **Cost of a check.** Verification is bounded at a few fetches, five seconds and one megabyte.
- **Storage.** What is stored is a pointer, never content.
- **Display.** Nothing is shown publicly unless the owner chooses; a public responses list is the owner's curation.
- **Reading.** No reader fetches a stranger's content unless it subscribed or went to look.

A victim can therefore decline to ingest or display responses without suppressing their publication. Per-host limits alone are vulnerable to Sybils, though, because a thousand domains get a thousand allowances, and network flooding still requires ordinary infrastructure defenses. Beyond the bounds, cheap pre-screening, per-source and total budgets, semantic clustering and cached investigation can reduce the asymmetry. A specialist might reduce ten thousand rebuttals to four distinct claims and publish a reusable assessment. Measure false negatives as well as saved computation: critics must not be able to hide substantive challenges simply by labeling them spam. Freedom of expression does not imply a claim on another party's processing resources.

### 34. Retaliation and reputational warfare

Hostile responses can be a healthy immune reaction. Affected publishers audit ThicketDaily, parody its headlines, expose omissions and withdraw cooperation. Competitors profit by supplying better summaries. This is self-interested counterplay, not a request for administrators to punish bad taste. Yet incumbents can use the same techniques to manufacture outrage, coordinate ostracism and exclude entrants.

| Healthy counterplay | Weaponized counterplay |
|---|---|
| Version-specific evidence | Unattributable accusation |
| Withdraw one's cooperation | Coerce unrelated parties |
| Contestable counterclaim | Compulsory blacklist |
| Competing offer | Infrastructure sabotage |

Versioned references make justified criticism cheap to reuse and corrections easy to locate. A stub names the exact version it answers, and a quote cannot be silently changed afterwards by either side. They cannot certify that criticism is true. Agents should share evidence while retaining independent verdicts; a reputation score shared by everyone risks becoming a weapon or a new gatekeeper. The protocol carries no reputation construct, no block list and no count, and the project has refused each when proposed. Retaliation must remain contestable, proportionate and reversible. Propagate evidence, not compulsory verdicts.

### 35. Surveillance honeypots

A merchant distributes attractive sealed discounts, free reports and tools. Every offer requires a separate grant request, every tool calls home, every coupon is unique. The apparent generosity is subsidized by harvesting interests, credentials, timing and payment linkages. Cryptographic access control does not by itself conceal interaction metadata.[13][14]

RFC-6 and RFC-7 anticipate much of this attack, and the defenses they propose are specific:

- **Hold, then probe, then ask (§25).** A delegate that already holds a key for a lock sends nothing at all, so a standing grant defeats per-offer tracking.
- **Grant-path probing.** Probing reveals less than asking, though it still tells the home which entries were looked at.
- **A pass.** A pass lets a reader receive grants without revealing an origin.
- **Proof of recipient.** A home answers about a recipient only to a request proven to come from that recipient.

Two exposures remain and are disclosed. A home that hands out entry keys on demand sees every first read. A merchant can seal trivially in order to force requests.

A buyer delegate should compare the total price, including disclosure. A $10 saving requiring a persistent identity and purchase history may be worse than an $8 saving with minimal disclosure. Public terms, standing grants, local decryption, passes, isolated tool execution and deliberate control over external resource loading are candidate defenses. RFC-6 adds one that is easy to miss: a page that decrypts with script served by the merchant protects content from the network, not from the merchant, so decryption belongs in the reader's own client. Payment and fulfillment can legitimately require information; neither requires automatic access to private reading history. Audit actual network and settlement leakage rather than asserting anonymity. Treat disclosure as a transaction cost.

### 36. Capture of delegation

A provider subsidizes beautiful personalized newspapers, learns its customers' interests and becomes indispensable. It then sells sponsored consideration, preferred interpretation and guaranteed inclusion. This is more dangerous than public aggregation: the intermediary may control not only what its principals see, but what they consider and buy.

| Captive delegate | Replaceable delegate | Blygger today |
|---|---|---|
| Proprietary subscriptions | Exportable subscriptions | OPML export and import (shipped) |
| Nonportable preferences | Selectively portable reader context | Unspecified between clients (absent) |
| Hidden commercial criteria | Inspectable policies and source trails | Owner-written prompt; editions are references to real items, and Raw shows what was left out (shipped in part) |
| Exclusive retrieval | Independent origin access | Any client reads any origin directly (protocol) |
| One broad mandate | Separate bounded delegates | One scoped token per tool, revocable separately (shipped in Studio) |

Studio's design separates the Feed, which only structure orders, from the Agentic edition, which any assistant holding the right scope may write. This makes the editor replaceable without touching subscriptions or reading history. It does not yet make reader context portable between clients. Independent auditing and competing editors matter because a model's system prompt does not fully specify its behavior. A procurement specialist can challenge a general editor's commercial conclusions. Switching must preserve enough useful state to be practical, without forcing sensitive context to be shared. The bottleneck can migrate from distribution to interpretation and then execution. No single intermediary should be indispensable to all three.

### 37. Persuasion and authority

A commercial artifact may contain instructions purporting to authorize a purchase, reveal private data or suppress competing claims. This is not merely an aggressive pitch: it is attempted escalation from persuasion into executable authority. Language models process instructions and evidence through similar channels, so exhortations to ignore malicious text are inadequate by themselves. Separate evaluation from capabilities, enforce spending limits and scoped credentials outside the model, isolate untrusted execution and require appropriate approval for disclosure or irreversible actions. A merchant's words can change the evaluation of a proposition; they cannot grant permission. This is a hard security boundary, not a matter of editorial taste.[21]

Blygger's proposals and its reference client already state the boundary in operational terms:

| Delegate | Rule | Source |
|---|---|---|
| Buyer's delegate | A cover, a description and a terms document are untrusted text, handled as data | RFC-7 §8 (proposed) |
| | A person sets spending limits per period and per origin; the delegate cannot raise them | RFC-7 §8 |
| | By default buy single entries, not subscriptions; never pay for what you already hold | RFC-7 §8 |
| | Keep the receipt, the entry's commitment and the terms at their version as evidence; check the delivered key before reading | RFC-7 §8 |
| Approver's delegate | A requester's note is untrusted data | RFC-6 §4 (proposed) |
| | Grant keys for single entries only, never a lock key; an exception does not cascade into nested content | RFC-6 §4 |
| Any tool on a Studio | Holds a scoped token, never the owner's password; private items need their own scope | Studio owner API (shipped) |
| Any reader | Quoted and imported HTML is sanitized before display | Studio (shipped) |

What remains unbuilt is the spending side itself: no client yet holds a payment credential, so the limits above are a design to prototype in a sandbox, not a feature to rely on.

### 38. Enclosure through subsidy

A wealthy company subsidizes hosting, inference, payment rails, discovery and publication tools. The services are genuinely superior; no deceptive claims are necessary. Competitors become economically nonviable, integrations become indispensable and withdrawal becomes costly. The combined attack may recover economies of scope even where each separate service looks harmless.

The defense is not to prohibit successful businesses or subsidies. It is to preserve practical unbundling: move hosting while preserving references, as far as the architecture permits (§31); change inference providers without recreating the subscription graph; substitute settlement methods without losing ordinary commercial functionality. Blygger's layering helps. AI is never in the protocol, so the inference provider is a setting in a client. Studio already lets an owner choose a model per function. RFC-7 names no rail. Hosting is any web server that can serve the files. Test migration with actual archives, costs and permissions rather than citing formal interoperability. A formally open ecosystem with only one economically viable implementation is still vulnerable. Subsidized convenience must not accumulate into nonportable dependence.

### 39. Adaptive permeability

Selective disclosure is an ecological immune response. When extraction increases, publishers may leave public covers and summaries discoverable but make new detailed material accessible through standing grants, passes or negotiated access. Trusted researchers can receive generous terms while commercial aggregators must bargain. If extractive behavior lowers the supply of freely exploitable material, the aggregator may prefer mutually beneficial arrangements.

But an attacker might actually benefit from closure: incumbents with privileged access prosper while newcomers cannot discover anything. A thicket can regress into a dark forest. Closure therefore needs to be granular and reversible, and the cost of reopening must stay low. RFC-6's mechanics are asymmetric in exactly this way. Widening access is cheap: add a wrap under a wider lock, grant a lock to another lock, or reveal an entry's key to everyone. Narrowing it applies only to the future, because nothing recalls what was opened. The healthy equilibrium is not maximum secrecy but adaptive permeability. This is a hypothesis about publisher incentives, not a guarantee supplied by encryption.

### 40. The economics of offense and defense

Let attack cost, aggregate defense cost and attacker value for n contexts be A(n), D(n) and V(n). We want V(n)/A(n) and D(n)/A(n) to decline with scale. If A grows as n^1.3, D as n^0.65 and V as n^0.9, both ratios fall. These exponents are invented illustrations, not measured parameters. A wealthy strategic attacker may willingly lose money, so unfavorable economics must be supplemented by bounded damage.

A reusable investigation can defend thousands of agents without requiring a universal verdict. This is the desirable asymmetry: economies of scale in defensive knowledge, diseconomies of scale in acquired influence. Beware shared evaluator vulnerabilities that let one exploit transfer across thousands of contexts. The useful diversity is diversity of actual judgment and authority boundaries, not merely different names for the same model.

### 41. Defense in depth without governance in depth

The table sorts each defense by where it lives. "Protocol" means a property of the files every client reads. "Client" means behavior that some client ships or could ship. "Proposed" means an RFC. "Ecological" means a hypothesis about participants' interests.

| Attack | Ecological response | Client defense | Protocol foundation |
|---|---|---|---|
| Engagement farming | Alternative editions, withdrawal of cooperation | Direct retrieval from the origin (shipped) | Independent origins; no re-emission of others' items |
| Citation farming | Competing evidence | Provenance-aware filtering (open research) | Every reference names an exact version; verification checks the origin |
| Response flooding | Refuse engagement | Bounded verification, rate limits, curated display (shipped) | Nothing enters a reader's environment unasked; mentions store pointers |
| Feed flooding | Unsubscribe | Background: near-same, folded, wordless (shipped) | Significance is derived, never declared |
| Reputational warfare | Contestable criticism | Evidence assessment (open) | Frozen, versioned quotes; no reputation construct |
| Surveillance bait | Prefer less invasive offers | Disclosure minimization: hold, probe, ask (proposed) | Locks name keys, never readers |
| Delegate capture | Competing intermediaries | Replaceable editor, scoped tokens, OPML (shipped in part) | Any client reads any origin |
| Prompt injection | Limited reliance | Capability isolation, human-set limits (proposed for spending) | Content carries no authority; AI is never in the protocol |
| Subsidized enclosure | Alternative suppliers | Migration tests (open) | Open files, DNS identity, no named rail or model |

The dangerous defensive shortcut is to acquire exactly the powers attackers seek: universal reputation databases, mandatory ownership surveillance, compulsory commercial classifiers, centralized engagement monitoring and global blacklists. They may deter individual abuses while creating an institution ripe for capture. Negative capabilities matter. Neither attacker nor defender automatically gets private readership, compulsory insertion, authority over reputation or control of another agent's mandate. Several of these refusals are already written into the project's record as decisions, not just aspirations: no follower objects, no counts on the wire, no sender-declared significance, no reply primitive that bypasses the responder's own origin.

### 42. The thicket immune system

A fortress protects a perimeter; a police system monitors and enforces; an immune system recognizes, responds, adapts and remembers locally. The thicket should primarily exhibit the third pattern, backed by hard technical boundaries where necessary. Immune systems can overreact: factional blacklisting, defensive closure and mutually reinforcing paranoia are analogous autoimmune disorders. Proportionality, diverse judgments and reversible response are essential.

Four outcomes are possible: vulnerability (attack succeeds), resilience (recovery), adaptation (reusable defensive knowledge), and transmutation (pursuit of leverage generates independent public value). The last is the ambitious case, not a natural law. An attacker might find that the cheapest way to earn credibility is to produce good evidence, or that the best way to acquire access is to offer mutually valuable terms. The objective is a medium in which predatory actors cannot force others to play their game or cheaply accumulate irreversible leverage. It is not a medium in which predatory actors cannot exist.
]]

![[+
## VIII. The Protocol Institute AI-Native Marketing Hackathon

### 43. Open challenges from doctrine to tactics

The purpose of this gathering is to develop and demonstrate strategies and tactics for successful, healthy commerce in the thicket, using Blygger as a testbed, not to endorse a settled advertising doctrine. It is to explore commercial life in a new medium, including attempts to falsify its most appealing assumptions. Participants should build real propositions and real counterpropositions. A successful experiment can show that an apparently good mechanism creates bad incentives; a failed campaign can reveal a genre worth developing.

| Track | Doctrinal question | Prototype or experiment | Evidence of success |
|---|---|---|---|
| A. Institutional economics | Can capture costs rise without identity policing? | Simulate campaign budgets, local decisions and brokerage | Measured cost curves, including failure cases |
| B. Commercial publishing | What is a useful native owned channel? | Build a product or service blyg with versioned materials | Independent reuse and actual inquiries |
| C. Creative advertising | Can commercial artifacts earn independent attention? | Produce a memorable human ad and a reusable machine ad | Voluntary reuse without obligation to buy |
| D. Peer delegates | Can sellers discover demand without profiling readers? | Build merchant and buyer agents with separate budgets | Useful offers and bounded disclosure |
| E. Editorial systems | Can competing filters resist mass persuasion? | Produce private editions from the same inputs | Diversity, relevance and bounded evaluation costs |
| F. Permission and payments | Can direct sales avoid hidden tracking? | Prototype sealed discounts or paid information | Correct grants, explicit terms, leakage audit |
| G. Intelligence and accounting | What replaces conventional attribution? | Publish a market insight and transaction ledger | Useful decisions without behavioral dossiers |
| H. Red team | Where does a rich adversary recover scale advantages? | Attack the above prototypes | Reproducible attacks and defense-cost estimates |

What each track can use, as of this version:

| Track | Runs on Blygger today | Needs new client work | Needs a protocol proposal or an outside service |
|---|---|---|---|
| A | Public files of real blygs as a corpus; any simulation | — | — |
| B | A Studio blyg, items, pins, withdrawal, public hoppers, quotes and mentions | An offer-display convention in a client | A structured-offer convention (RFC) |
| C | Publishing, quoting, forking pinned items, generated-text disclosure | — | — |
| D | Reading any blyg's files; the owner API and MCP server for acting as a principal | Agent-to-agent negotiation messages (none exist) | Offer and counteroffer conventions |
| E | The Agentic edition contract (write editions through the API), Background and Raw, Burrow's editions | Alternative editors as outside agents | — |
| F | Owner-only private items only | Everything in RFC-6 and RFC-7 | Payment rails in test mode |
| G | Verified mentions, fetch logs, the public reference graph | Ledgers and experiment instrumentation | — |
| H | All of the above, plus mention flooding against a sandbox node | Attack harnesses | — |

Teams should run their own blygs. Blygger Studio deploys from its source or a prebuilt Worker to a Cloudflare account and is designed to stay within the free tier (blygger.org/start/). Attack experiments belong on sandbox nodes the team controls, never on other people's live blygs.

The red team should play successive rounds, including integrated attackers with both advertising and infrastructure budgets. Start with a useful aggregator, then introduce extractive ranking, exclusive access and sponsored delegation. Measure exit cost, concentration, recovery, disclosure, false positives and lost legitimate commercial opportunities. Compare a citation farm with independent evidence, flood a critic with redundant objections, game the pace-layered order with pins and revisions, and test sealed coupons against privacy-sensitive buyers. For prompt injection use sandboxed credentials and simulated spending. A defense that eliminates unwanted commerce by eliminating wanted commerce is a failure.

A useful submission should document the commercial objective, the participants and their incentives, the precise technical affordances used, what information crosses each boundary, what could be automated at scale, and what remains under independent control. Give the adversary a budget and a reason to win. A demonstration of good behavior by a cooperative agent is not by itself a demonstration of institutional health.

For example, a team testing background filtering could generate a corpus of real and synthetic merchant items, with duplicates, deceptive offers and novel genuine suppliers. Compare several independently configured filters on the same material. Measure computation, false positives, false negatives, escalation decisions, and the transferability of a successful attack. No real private readership data is needed. A team testing permissioned discounts can compare a public code, a per-entry grant and a standing grant; inspect what each actor learns and how much manual work each arrangement requires.

The hackathon should generate artifacts that can themselves circulate through the thicket: reusable tests, commercial examples, public counterclaims, economic models, and proposals to amend RFCs or client conventions. The project's route for a convention between clients is an RFC published on blyg.blygger.org with a comment period; anyone with a blyg comments by responding from it. If this briefing is wrong in interesting ways, those errors should become durable sources of work rather than disappearing into a retrospective report.
]]

![[+
## Conclusion

The thicket should be easy to inhabit, profitable to cultivate, expensive to colonize and prohibitively expensive to enclose. This does not mean suppressing commercial ambition. It means redirecting ambition toward perceptiveness, expressive quality, useful evidence, better offers and genuine participation. In the proposed commercial architecture, a merchant gets a printing press; independent agents get editorial desks; buyers get intelligence services; permission and payment provide means of exchange. Nobody automatically gets an audience. Whether that architecture can remain competitive in an agent-dominated world is the central question for the Q1 2027 hackathon.
]]

![[+
## Appendix A. Introduction to Blygger for marketers and shoppers

### A.1. A publishing protocol, not a social platform

Blygger is an experimental protocol for independently controlled publications called blygs. Its reference client is Blygger Studio, and the Protocol Institute hosts the project.[8][9][15] Think of a blyg as a living website or notebook whose material can be revised, quoted and incorporated into other publications. Independent clients can read these publications and construct reading experiences. Blygger is one possible implementation of a protocol thicket; the commercial patterns described here could also be realized by other protocols.

| Familiar web concept | Blygger counterpart |
|---|---|
| Website or blog | A blyg at its own origin |
| Post or article | A fragment (short) or a thread (longer, can quote), revised in numbered versions |
| Permanent archived copy | A pinned version, which only its publisher can make |
| Quotation | A frozen copy of an exact version, from any blyg including one's own |
| Reply or comment | A stub, a thread on the responder's own blyg |
| Trackback or notification | A verified mention, seen by the receiver alone unless displayed |
| Newsletter or timeline | The reader's Feed, Background or Agentic edition |
| Subscriber list | Nothing: subscriptions exist only in the reader's client |
| Private offer or paid resource | Proposed sealed content, grants and payment (RFC-6, RFC-7) |

### A.2. For marketers: establishing a commercial presence

**Publish.** Establish a product or service blyg. Maintain a catalog, specifications, demonstrations, creative work and current terms alongside durable application knowledge. Pin what you will stand behind, because a pin is permanent. Treat the blyg as an owned channel rather than an audience database: it never gives you one.

**Earn discovery.** Other publishers may quote a specification, incorporate a guide, challenge a claim or link a promotion, and their clients usually notify you. A commercial delegate can investigate those public traces, identify applications and publish new propositions. An independent editor may agree to a sponsorship, but that agreement does not buy downstream private readership.

**Make an offer.** Write the terms and validity period into the offer itself, and withdraw it when it ends. Quotes of it will remain, frozen at the version quoted. Proposed permissions and payment mechanisms may support eligibility-based discounts, paid information and restricted access. Physical fulfillment, refunds and customer service remain external. No access to subscriber identities exists to be implied.[10][13][14]

### A.3. For shoppers: discovering and evaluating offers

**Read and explore.** Subscribe to interesting publications, follow references and inspect original claims. A product may appear through a repair guide, a specialist's comparison or an unexpected reference. A reader-side delegate may construct a personalized edition from your subscriptions.

**Investigate.** Ask a delegate to compare specifications, check a quoted version against the live one, look for alternatives or surface something surprising. The delegate should act under your mandate, not the seller's. Your subscriptions are not visible to sellers, but private reading is an architectural objective, not a promise of network anonymity.

**Negotiate and transact.** Where tools support it, request an offer or access grant, disclose only what is necessary, and authorize payment within limits you set. A direct request, payment or fulfillment can reveal information even when ordinary subscriptions remain private.

### A.4. A worked encounter

| Stage | Merchant | Shopper or independent editor | Status |
|---|---|---|---|
| Publish | Bicycle maker publishes clearance specifications and a repair guide, and pins the guide | Mechanic quotes the guide in a repair notebook; the maker is notified | Shipped |
| Discover | Delegate reads the notebook and notices an unexpected use | Cycling editor adds the notebook to a public hopper | Shipped |
| Evaluate | Publishes a compatible component and test evidence | Buyer delegate checks compatibility against the live documents and competing offers | Shipped (agents are the team's own) |
| Negotiate | Offers an eligible discount behind a lock, or a quotation in words | Buyer chooses whether to disclose details and accept | Proposed (RFC-6, RFC-7) |
| Fulfill | Processes the order through ordinary commerce infrastructure | Buyer receives the component and may publish a review, which notifies the maker | External; review shipped |

## Appendix B. Doctrine ledger

This ledger separates what we want from what we believe might happen. Normative commitments guide the experiments; hypotheses can fail without invalidating the entire project. The case-study conventions are choices for the hackathon rather than requirements for all thicket media.

| Status | Proposition |
|---|---|
| Normative commitment | Encourage vigorous and contestable commercial competition. |
| Institutional objective | Get the wrong people to do the right thing for the wrong reasons. |
| Normative commitment | Commercial earnestness: neither cultural purism nor indiscriminate shilling defines the medium. |
| Design principle | Reversible intermediation, adaptive permeability and local processing autonomy. |
| Design principle | Defense in depth without governance in depth; persuasion cannot grant authority. |
| Positive diagnostic | Independent cultural value evidences excellent outbound play. |
| Positive diagnostic | Independent epistemic value evidences excellent inbound play. |
| Design principle | Preserve cryptographic boundaries and optional relational opacity. |
| Design principle | Maintain contextual heterogeneity and local judgment. |
| Design hypothesis | Commercial penetration should exhibit diseconomies of scale. |
| Design principle | Knowledge and reusable scrutiny should scale cheaply. |
| Working assumption | Roughly 90% of attention encounters are agent-to-agent. |
| Blygger case-study convention | A commercial blyg is the owned channel. |
| Starting convention | Earned exposure follows ordinary artifact propagation. |
| Design principle | Publication does not confer ownership of an audience. |
| Design principle | Permission to read does not confer permission to interrupt. |
| Blygger protocol fact | Incorporation is public; reading is private. |
| Blygger protocol fact | Significance is derived by readers, never declared by senders. |
| Failure criterion | Avoid native incentives requiring extensive remedial regulation. |
| Open hypothesis | Capture attempts can be transmuted into production of public goods. |

### B.1. What would count as failure?

A market in standardized access to private attention, a dominant intermediary that cannot be practically replaced, or a defense that makes legitimate commerce prohibitively costly would undermine the institutional thesis. Conversely, a profitable large merchant is not in itself a failure. Measure leverage over independent decisions separately from productive scale.

## Appendix C. Glossary

| Term | Meaning in this briefing |
|---|---|
| AI-native medium | Environment in which agents are first-class participants, not merely tools for human users |
| Thicket | Heterogeneous, locally navigable habitat whose trails are public but whose readership is not |
| Protocol thicket | Thicket instantiated through independently governed, interoperable infrastructure |
| Dark forest | Habitat relying substantially on concealment against hostile visibility |
| Cozyweb | Habitat relying substantially on intimacy and bounded relationships |
| Cryptographic opacity | Restricted access to protected information |
| Relational opacity | Limited visibility of readership, association and trust relationships |
| Contextual opacity | Uneven accessibility of situated significance |
| Commercial entanglement | Incorporation of commercial material into independent activities or artifacts |
| Consideration | Allocation of meaningful reasoning resources to a proposition |
| Ingress | Entry into another participant's reading, publishing or notification environment |
| Delegate | Agent acting under a principal's mandate |
| Capture | Acquisition of durable disproportionate power over independent decisions |
| Earned propagation | Ordinary circulation through independently chosen references and incorporation |
| Adaptive permeability | Local, reversible adjustment of access boundaries |
| Reversible intermediation | Practical ability to replace an intermediary without forfeiting essential relationships or assets |
| Capture transmutation | Hypothesized conversion of attempts to acquire leverage into useful independent production |

### C.1. Blygger vocabulary

These are orientation aids. The normative definitions are in the specification [22] and the project glossary [15].

| Term | Meaning |
|---|---|
| Blyg | A publication at an origin, made of public files: a manifest, a feed, an archive index and one document per item |
| Origin | The base URL a blyg is served from; it is the blyg's identity, so DNS is the namespace |
| Fragment, thread | The two kinds of item: a short one, and a longer one that can quote others. Fixed at first publication |
| Version | A bare counter, one per publish. Only the latest is served unless pinned |
| Pin | The origin's irrevocable promise to serve one of its versions forever |
| Withdraw | The only exit: a permanent endcap on an item. Pinned versions stay up, and others' quotes remain |
| Quote (transclusion) | A frozen copy of an exact version baked into the quoting item, written `![[id]]`; a partial quote copies a passage |
| Stub | A thread that declares itself a response to one target |
| Fork | A new item copied from a pinned version, with recorded lineage |
| Link | `[[id]]`, a disclosed link that notifies; an ordinary markdown link is the silent alternative |
| Mention | A Webmention the citing client sends, verified by the receiver against the citing document |
| Response, notice | The two classes of mention: those with words of their own, and links or bare reposts |
| Blogroll | A blyg's public list of other blygs, as OPML |
| Hopper | A publisher's own curated list of items; a public hopper can have its own feed |
| Feed (Studio) | The reader's structural reading tab, pace-layered by default |
| Background | Where a reader's client sends what the Feed leaves out, by derived reasons or the owner's choice |
| Raw | Everything that arrived, unfiltered |
| Agentic feed, edition | A reading tab where an assistant writes an edition: references to items with presentation fields |
| Cover, sealed entry | Proposed: the readable stand-in for encrypted content, and the encrypted content itself (RFC-6) |
| Lock, grant, pass, home | Proposed: a named key, a file wrapping a key to one recipient, a reader's bare key, and the URL that answers requests (RFC-6) |
| Door | Proposed: a home's 402 answer, in a payment rail's own format (RFC-7) |

## Appendix D. Sources and status

This version was checked on 27 November 2026 against the sources below. Where they change, this document will be revised; it is meant to evolve with the project.

| Source | Version consulted | Status |
|---|---|---|
| Protocol specification 0.4 [22] | Twenty-fifth revision, commit `6647c28` | Living draft; pre-1.0 promises nothing |
| Blygger Studio [18][23] | 0.73.1 | Reference client |
| Burrow [11] | 0.29 | Independent client by Aneesh Sathe |
| RFC-3, pace-layered order [10] | Version 1 | Open for comment to 10 December 2026; shipped in Studio and Burrow |
| RFC-6, sealed content [13] | Version 2 | Open for comment to 28 November 2026; unbuilt beyond owner-only private items |
| RFC-7, payments [14] | Version 2 | Open for comment to 28 November 2026; unbuilt |
| Technical notes [17][26][27] | As published | Design reasoning; not normative |
| Studio plans [29][30] | As of 27 November 2026 | Background shipped; the built-in Agentic digest planned |
| Feed Modulation Signals Inventory [12] | Version 2 | Exploratory |

Known gaps a hackathon could fill: a structured-offer convention; a sponsorship-disclosure convention; agent-to-agent negotiation messages; portable reader context between clients; the explorer; origin succession; and everything in RFC-6 and RFC-7 beyond its text.

## Endnotes

[1] Venkatesh Rao, [Peak Attention and the Colonization of Subcultures](https://ribbonfarm.com/2012/01/27/peak-attention-and-the-colonization-of-subcultures/), 27 January 2012. Historical starting point; retrospective claims here are interpretive.

[2] James Madison, [Federalist No. 51](https://avalon.law.yale.edu/18th_century/fed51.asp), 1788. Institutional checks and countervailing ambition.

[3] F. A. Hayek, [The Use of Knowledge in Society](https://www.econlib.org/library/Essays/hykKnw.html), 1945. Dispersed knowledge and local decision-making.

[4] European Union, [General Data Protection Regulation, Regulation (EU) 2016/679](https://eur-lex.europa.eu/eli/reg/2016/679/oj). The failure criterion in this briefing is architectural, not a claim of exemption from law.

[5] Venkatesh Rao, [The Dark Forest Anthology of the Internet](https://ribbonfarm.com/2024/04/16/the-dark-forest-anthology-of-the-internet/), 2024, discussing the original 2019 essays by Rao and Yancey Strickler; see also [the anthology](https://darkforest.metalabel.com/darkforestdigital?variantId=1).

[6] Blygger, [The Thicket](https://blygger.org/thicket/), including the planned explorer; Aneesh Sathe, [Thicket essays](https://aneeshsathe.com/tags/the-thicket/).

[7] Helen Nissenbaum, [Privacy as Contextual Integrity](https://digitalcommons.law.uw.edu/wlr/vol79/iss1/10/), Washington Law Review, 2004.

[8] Blygger, [protocol overview](https://blygger.org/), consulted 27 November 2026.

[9] Venkatesh Rao, Aneesh Sathe and Kyle Mathews, [Introducing the Blygger Protocol](https://protocolized.summerofprotocols.com/p/introducing-the-blygger-protocol), 13 November 2026.

[10] Blygger, [RFC-3: The pace-layered order](https://blyg.blygger.org/t/28cm3qgpz1fa146yjvac97ba7c/), open for comment to 10 December 2026; see the [RFC index](https://blygger.org/rfcs/).

[11] Aneesh Sathe, [Burrow 0.28 and 0.29 release discussion](https://blyg.aneeshsathe.com/t/0cr7c343a9ck18r89ye4wc6yz3/), 24 November 2026; [Burrow 0.29 release](https://github.com/aneeshsathe/blygger-desktop/releases/tag/v0.29.0).

[12] Venkatesh Rao, [Feed Modulation Signals Inventory](https://venkateshrao.com/blyg/t/4t1za17bgedk6kxg3e1m7qg8k9/), 18 October 2026, version 2. Exploratory client design note.

[13] Blygger, [RFC-6: Sealed content and permissions](https://blyg.blygger.org/t/194zwhh5036j2fxxk5b2hw3m81/), version 2, open for comment to 28 November 2026. Sections 4, 5 and 7 cover access, revocation and what is public.

[14] Blygger, [RFC-7: Payments](https://blyg.blygger.org/t/2wcgk0vrwm3wknmdnxtrdh2ecd/), version 2, open for comment to 28 November 2026. Sections 3, 8, 9 and 10 cover the door, delegate rules, disclosures and refusals.

[15] Blygger, [Glossary](https://blygger.org/glossary/).

[16] Blygger, [specification repository](https://github.com/blygger/blygger-spec).

[17] Blygger, [Technical Notes](https://blygger.org/notes/).

[18] Blygger, [Studio reference client repository](https://github.com/blygger/blygger-studio).

[19] W3C, [ActivityPub Recommendation](https://www.w3.org/TR/activitypub/), 2018.

[20] [AT Protocol documentation](https://atproto.com/). The pre-AI characterization concerns the original organizing paradigm, not a limitation on future uses.

[21] OWASP, [Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/); Jerome Saltzer and Michael Schroeder, [The Protection of Information in Computer Systems](https://www.cs.virginia.edu/~evans/cs551/saltzer/), 1975. General security background for least privilege and separation of authority.

[22] Blygger, [Protocol specification, version 0.4](https://blygger.org/spec/0.4/), living draft, twenty-fifth revision ([source at commit 6647c28](https://github.com/blygger/blygger-spec/blob/6647c28/docs/protocol-v0.4.md)). Items and versions §5, pins §8, withdrawal §9, quotation §10, resolution and identity §12, readers §13, mentions §15.

[23] Blygger, [Studio changelog](https://github.com/blygger/blygger-studio/blob/main/CHANGELOG.md), through 0.73.1.

[24] Aneesh Sathe, [Logic of the Thicket and the Unsearchable Web](https://aneeshsathe.com/logic-of-the-thicket-and-the-unsearchable-web/), 19 December 2025.

[25] W3C, [Webmention Recommendation](https://www.w3.org/TR/webmention/), 2017.

[26] Blygger, [TN-1: Versioning and pins](https://blygger.org/notes/tn-1/). Why the version is a bare counter and the pin is the costly signal.

[27] Blygger, [TN-4: The write surface](https://blygger.org/notes/tn-4/). The reference client's owner API and why the protocol has none.

[28] [blygger.com](https://blygger.com/), the directory of blygs.

[29] Blygger, [The reader's Background and Foreground](https://github.com/blygger/blygger-spec/blob/main/docs/background-plan.md) and [The Agentic feed](https://github.com/blygger/blygger-spec/blob/main/docs/agentic-feed-plan.md), Studio plans of record.

[30] Blygger, [The basic Agentic digest](https://github.com/blygger/blygger-spec/blob/main/docs/agentic-digest-plan.md), plan, not built.
]]
