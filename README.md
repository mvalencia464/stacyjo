# stacyjo.com

The website for Stacy Jo and *The Leash Goes Both Ways*. Built with Astro, fully static, ready for Cloudflare Pages.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # outputs the finished site to dist/
```

Requires Node 22 (see `.nvmrc`).

## Everything you edit lives in `src/config.ts`

Anything still written as `{{LIKE_THIS}}` counts as "not set yet". The site hides it or falls back gracefully, so nothing unfinished ever shows to visitors.

| Setting | What to put there | Until it's set |
| --- | --- | --- |
| `products.ebook.checkoutUrl` | Stripe Payment Link for the ebook | Buy buttons scroll to pricing |
| `products.bundle.checkoutUrl` | Stripe Payment Link for the bundle | Same |
| `kit.embedHtml` | Kit's embed code for the "Free Chapter" form | Free-chapter box asks people to email hello@stacyjo.com |
| `dogs.golden`, `dogs.frenchie` | The dogs' names | About section says "a golden retriever and a French bulldog" |
| `launch.active` | `true` during launch week | No banner, regular prices |
| `launch.endsLabel` | e.g. `Sunday, November 9` | Banner leaves off the end date |
| `referral.sparkloopUrl` | SparkLoop referral page link | Audiobook-referral step is hidden on /thank-you |
| `legal.governingLaw` | Your state or country | Clause is hidden on /terms |
| `legal.analytics` | e.g. `Cloudflare Web Analytics` | Privacy page says no analytics are used |

## Images

The cover and headshot load from Cloudflare R2 as AVIF:

- `https://media.stokeleads.com/stacyjo/stacyjo_cover.avif`
- `https://media.stokeleads.com/stacyjo/stacyjo.avif`

Local JPG copies in `public/images/` are used automatically if R2 can't be reached or a browser can't show AVIF. To change an image, upload the new one to R2 under the same name (or edit `media` in the config), and replace the matching JPG.

`public/images/og-image.jpg` is the preview picture shown when someone shares a stacyjo.com link.

## Stripe (buy buttons)

Paste each product’s Payment Link into `products.ebook.checkoutUrl` and `products.bundle.checkoutUrl`. The buttons go straight to Stripe Checkout.

**Launch code:** when `launch.active` is true, every buy button adds `?prefilled_promo_code=BOTHWAYS` so the code is already applied at checkout. For that to work, create `BOTHWAYS` as a promotion code in Stripe ($5 off), and turn on **Allow promotion codes** on both Payment Links.

## Home page content

The book details on the home page (chapters, drills, problem-to-fix cards, quotes, 7-day plan, audiobook tracks) live in `src/data/book.ts`. Edit them there and the page updates everywhere.

Both live Payment Links send buyers to `https://stacyjo.com/thank-you?session_id={CHECKOUT_SESSION_ID}`. That page checks the payment with Stripe, then offers the PDF (and the audiobook tracks, for the bundle). The same links are emailed from hello@stacyjo.com.

Paid files live in the private R2 bucket `stacyjo-downloads`. They are not in this repository.

In Stripe, add a webhook endpoint for `checkout.session.completed`:

`https://stacyjo.com/api/stripe-webhook`

Put its signing secret in the Pages project as `STRIPE_WEBHOOK_SECRET`. `STRIPE_SECRET_KEY` is already set. The thank-you page still sends the email if the webhook is not in place yet.

Pages cannot send email itself. A Worker named `stacyjo-mailer` sends from hello@stacyjo.com, and the Pages project calls it through the `MAILER` service binding in `wrangler.jsonc`. Downloads still appear on the thank-you page if that binding is missing.

## Kit (free chapter signup)

1. Create a form called **Free Chapter**. Set its incentive email to deliver `The-Leash-Goes-Both-Ways-Free-Chapter.pdf`.
2. Set the form's success redirect to `https://stacyjo.com/welcome`.
3. Copy the form's embed code into `kit.embedHtml` (wrap it in backticks if it spans several lines).

## Deploy to Cloudflare Pages

**Option A: connect GitHub (recommended, auto-deploys on every change)**

1. Push this folder to a GitHub repository.
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → connect the repo.
3. Build command `npm run build`, output directory `dist`. Node 22 comes from `.nvmrc`.
4. Once it's live, go to **Custom domains**, add `stacyjo.com`, then add `www.stacyjo.com` too.
5. `public/_redirects` sends `www.stacyjo.com` to `https://stacyjo.com`. That applies once both names are attached to this Pages project.

**Option B: upload from your computer**

`wrangler.jsonc` names the project `stacyjo` and points Pages at `dist`.

```bash
npm run deploy
```

## Delivery details

- **One email per order.** The Stripe webhook sends the download email. A small marker in R2 (`orders/<session>/download-email.json`) records it, so webhook retries and page reloads never send a second one, including on 100%-off orders. The thank-you page only sends the email itself if none has gone out two minutes after checkout.
- **Matching orders to products.** For bulletproof matching, set `STRIPE_LINK_EBOOK` and `STRIPE_LINK_BUNDLE` in `wrangler.jsonc` to the Payment Link IDs (`plink_...`). Without them, orders match by product name, then by list price.
- **Audiobook files.** Run `node scripts/upload-audiobook.mjs src/resources` (add `--dry-run` first to check). It finds all 22 MP3s by track number, uploads each to the key the site serves, and uploads one ZIP of every track. The ZIP appears first on bundle buyers' download pages, and the email links the PDF and the ZIP instead of 23 separate files. Re-uploading replaces the files for every buyer, past and future, since downloads are never cached.

## Pages

| URL | Purpose |
| --- | --- |
| `/` | Sales page |
| `/free-chapter` | Free chapter signup |
| `/thank-you` | After purchase (Lemon Squeezy) |
| `/welcome` | After signup (Kit) |
| `/privacy`, `/terms`, `/refunds` | Draft legal pages: have them reviewed before launch |
| `/404` | Not-found page |

`/thank-you` and `/welcome` are hidden from search engines and left out of the sitemap.
