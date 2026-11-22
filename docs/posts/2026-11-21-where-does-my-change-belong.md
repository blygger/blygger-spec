# Where does my change belong? TN-8, a map for contributors

The hackathon is in its second day. Before building anything, it pays to decide where it should go, and the map for that now has a number: **[TN-8, Where does my change belong?](https://blygger.org/notes/tn-8/)**, also [an item on this blyg](https://blyg.blygger.org/t/2d244a6ff5tz7mfe5gd4m41a4p/).

It is a ladder of eight questions, asked in order, stopping at the first yes:

1. Would another blyg or reader receive different bytes? Then it is a spec question, and it is ruled before it is built.
2. Is it a bug, or something every blyg would want? A pull request to the Studio.
3. Can it be done from outside, with a token? A tool of your own.
4. Is it interface for one owner, in a slot that exists? An extension.
5. Does it need a slot the Studio lacks? A hook, proposed upstream.
6. Is it several of those together, making a kind of blyg? A mod.
7. Does it only make sense on your node? A local patch.
8. Does it change what the Studio is? Another client.

The cheapest place that works is the right one. A tool on a token costs the Studio nothing; a hook costs every future release a little; a local patch costs you a little at every upgrade. The note also walks through your first hour on a local install, the rules that keep a local patch easy to carry, and where to ask.

The guide was first published at [blygger.org/contribute/](https://blygger.org/contribute/) for the start of the hackathon, and it stays there. Making it a technical note gives it a number to cite, a history of revisions, and an item here you can respond to. If a rung is wrong, or your change fits none of them, respond to this item from your own blyg or open an issue on [blygger-spec](https://github.com/blygger/blygger-spec/issues).
