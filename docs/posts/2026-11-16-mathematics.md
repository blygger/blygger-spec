# Mathematics on a Blyg

Blygger Studio 0.62.0 can write mathematics. Put TeX between dollar signs and it publishes as MathML, which every current browser draws: no script, no stylesheet and no font travels with the page. This post is itself the demonstration. Every formula below was typed between dollars in the studio's editor.

## How to write it

One dollar on each side for a formula inside a sentence, two for one on its own lines:

```
Euler's identity, $e^{i\pi} + 1 = 0$, inside a sentence.

$$\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}$$
```

which reads as: Euler's identity, $e^{i\pi} + 1 = 0$, inside a sentence.

$$\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}$$

The rule is pandoc's: an opening dollar must be followed by a character that is not a space, and a closing one must follow such a character and must not be followed by a digit. So prices are left alone. A coffee costs $4 and a pastry $5, and that sentence has no mathematics in it. A dollar sign you want to keep literal can be escaped as `\$`, and anything in code stays exactly as typed. The **Σ** button in the editor's toolbar wraps a selection in dollars, or starts an empty formula.

## A small gallery

The quadratic formula:

$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

Bayes' theorem:

$$P(A \mid B) = \frac{P(B \mid A)\,P(A)}{P(B)}$$

The Basel problem, a sum with limits: $\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}$. Inline formulas with tall parts sit inside the line without pushing it apart.

A matrix and its determinant:

$$\det\begin{pmatrix} a & b \\ c & d \end{pmatrix} = ad - bc$$

A function defined in pieces:

$$|x| = \begin{cases} x & \text{if } x \ge 0 \\ -x & \text{if } x < 0 \end{cases}$$

Maxwell's equations, aligned:

$$\begin{aligned} \nabla \cdot \mathbf{E} &= \frac{\rho}{\varepsilon_0} \\ \nabla \cdot \mathbf{B} &= 0 \\ \nabla \times \mathbf{E} &= -\frac{\partial \mathbf{B}}{\partial t} \\ \nabla \times \mathbf{B} &= \mu_0 \mathbf{J} + \mu_0 \varepsilon_0 \frac{\partial \mathbf{E}}{\partial t} \end{aligned}$$

The Fourier transform:

$$\hat{f}(\xi) = \int_{-\infty}^{\infty} f(x)\, e^{-2\pi i x \xi}\, dx$$

A limit, a binomial coefficient and a continued fraction: $\lim_{n \to \infty} \left(1 + \frac{1}{n}\right)^n = e$, $\binom{n}{k} = \frac{n!}{k!\,(n-k)!}$, and

$$\sqrt{2} = 1 + \cfrac{1}{2 + \cfrac{1}{2 + \cfrac{1}{2 + \cdots}}}$$

Sets and logic: for every $\varepsilon > 0$ there is a $\delta > 0$ such that $|x - a| < \delta \implies |f(x) - f(a)| < \varepsilon$, for all $x \in \mathbb{R}$.

## What other clients see

The item document carries the formula as MathML Core inside `content_html`, with the TeX you typed kept beside it in an `application/x-tex` annotation. A client that draws MathML shows it as it appears here. One that doesn't can show the TeX, which is still readable. The markdown in `content_md` keeps the dollars, so a client that renders from the source can draw formulas its own way.

When Blygger Studio reads another blyg's post, or a quote baked into a thread, it does not trust the MathML it is given. It discards each formula and redraws it from its TeX annotation with the same renderer it publishes with, so nothing inside a formula on your screen is markup from someone else's page. A formula with no annotation is dropped. Past a thousand formulas in one document, or on any error, a formula shows as its TeX in code instead.

## Quotes, excerpts and the edges

- A partial quote must not cut through a formula. The stub editor refuses such a selection, and so does publishing.
- Excerpts, titles and labels show a formula as its TeX between dollars, so a link to this post reads sensibly anywhere.
- A formula that doesn't parse shows in red in the preview and blocks publishing, naming the formula.
- A few commands that browsers don't draw are refused with their name: `\cancel`, `\bcancel`, `\xcancel`, `\sout`, `\angl`, `\phase` and `\longdiv`. `\boxed` and `\fbox` draw without the box.

The drawing is done by [temml](https://temml.org/), in the server only. The design is decision #105 in the spec's 0.4 revision (§2, §5.2 and §14), and the build is [studio#149](https://github.com/blygger/blygger-studio/pull/149).
