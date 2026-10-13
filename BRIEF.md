# stacyjo.com — Build Brief for Cursor

**How to use this file:** put it at the root of a new, empty project folder, open the folder in Cursor, and tell the agent:

> Read BRIEF.md and build the site exactly as specified. Use only the copy in the brief. Ask me before inventing any text, numbers, or claims.

Images are already in `public/images/`.

---

## 1. What we're building

A fast, static marketing site for dog trainer **Stacy Jo** and her ebook **_The Leash Goes Both Ways_**.

The site has three jobs:

1. **Sell the book** through a Lemon Squeezy checkout that opens over the page (overlay).
2. **Collect emails** by offering a free chapter (Chapter 4, *Calm Is Contagious*) through a Kit signup form.
3. **Build the brand** by linking to YouTube and social channels, all **@StacyJoDogs**.

There is no backend, no database, no login, and no webhooks. Lemon Squeezy delivers the files; Kit delivers the free chapter.

## 2. Rules for the AI agent (important)

- **Use only the copy in this brief.** If a section needs text that isn't here, leave a visible `{{PLACEHOLDER}}` and list it at the end.
- **Never invent** testimonials, reviews, star ratings, sales numbers, "as seen in" logos, certifications, credentials, years of experience, or research claims. The science copy below has been fact-checked; don't paraphrase it into stronger claims ("science proves…").
- **Never label anything "Most popular" or "Bestseller"**; there's no data for that. "Best value" is fine for the bundle.
- All editable values (URLs, prices, codes, emails, social links) live in **`src/config.ts`**. Components read from config, so nothing is hard-coded twice.
- **Accessibility:** semantic HTML, one `h1` per page, alt text on every image, AA color contrast, visible focus states, respect `prefers-reduced-motion`.
- **Performance:** static output, no client-side framework. The only third-party scripts are Lemon Squeezy's `lemon.js` and the Kit form embed. Target Lighthouse 95+ on mobile.
- **Mobile-first.** Most visitors arrive from YouTube, Instagram, and TikTok on phones.

## 3. Tech stack

- **Astro** (latest stable), `output: 'static'`
- **Plain CSS** with custom properties, in `src/styles/global.css` plus scoped component styles. No Tailwind needed.
- **Fonts, self-hosted** (no Google Fonts requests):
  - `@fontsource/poppins` weights 500, 600, 700 for headings, buttons, and labels
  - `@fontsource/lora` weights 400, 400-italic, 700 for body text
- **`@astrojs/sitemap`**, with `site: 'https://stacyjo.com'` set in `astro.config.mjs`
- **Hosting:** Cloudflare Pages or Netlify (static). Point stacyjo.com at it, and redirect `www` to the bare domain.
- **Analytics (optional):** Cloudflare Web Analytics or Plausible, both cookieless and privacy-friendly. Leave a commented slot in the layout.

### Suggested structure

```
src/
  config.ts
  layouts/Base.astro          # <head>, meta, OG tags, header, footer, lemon.js
  components/
    Header.astro  Footer.astro  Button.astro  BuyButton.astro
    LaunchBanner.astro  KitForm.astro  PricingCards.astro
    PillarGrid.astro  LoopDiagram.astro  Faq.astro  Section.astro
  pages/
    index.astro  free-chapter.astro  thank-you.astro  welcome.astro
    privacy.astro  terms.astro  refunds.astro  404.astro
  styles/global.css
public/
  images/book-cover.jpg  images/stacy-jo-headshot.jpg  images/og-image.jpg
  favicon.svg  robots.txt
```

## 4. `src/config.ts`

```ts
export const site = {
  url: 'https://stacyjo.com',
  name: 'Stacy Jo',
  tagline: 'Calm-first dog training for both ends of the leash',
  email: 'hello@stacyjo.com',
  businessEmail: 'stacyjo@agentmail.to',
};

export const book = {
  title: 'The Leash Goes Both Ways',
  subtitle: 'How You and Your Dog Shape Each Other’s Calm',
  pages: 128,
  chapters: 17,
  drills: 25,
};

export const products = {
  ebook: {
    name: 'Ebook (PDF)',
    price: 19,
    checkoutUrl: '{{LS_EBOOK_CHECKOUT_URL}}',   // from Lemon Squeezy → Products → Share
  },
  bundle: {
    name: 'Ebook + Audiobook',
    price: 29,
    checkoutUrl: '{{LS_BUNDLE_CHECKOUT_URL}}',
  },
};

export const launch = {
  active: false,            // flip to true for launch week
  code: 'BOTHWAYS',
  amountOff: 5,
  endsLabel: '{{LAUNCH_END_DATE}}', // e.g. "Sunday, Nov 9"
};

export const socials = {
  youtube: 'https://www.youtube.com/@StacyJoDogs',
  instagram: 'https://www.instagram.com/stacyjodogs',
  tiktok: 'https://www.tiktok.com/@stacyjodogs',
  facebook: 'https://www.facebook.com/stacyjodogs',
  pinterest: 'https://www.pinterest.com/stacyjodogs',
};

export const referral = {
  sparkloopUrl: '{{SPARKLOOP_REFERRAL_PAGE_URL}}', // optional; hide the block if empty
};

export const dogs = {
  golden: '{{GOLDEN_RETRIEVER_NAME}}',
  frenchie: '{{FRENCH_BULLDOG_NAME}}',
};
```

## 5. Design

The site should feel like the book cover: bright teal, bold yellow, clean white, warm and confident.

### Colors

```css
:root {
  --teal: #4BB8CD;        /* brand teal (book interior) */
  --teal-cover: #3AB0C8;  /* exact cover background, for full-bleed bands */
  --teal-light: #EEF8FA;  /* soft section background */
  --navy: #035875;        /* headings, primary buttons */
  --ink: #0D3A4A;         /* strong text on light backgrounds */
  --yellow: #FFD703;      /* accents, highlight words, secondary buttons */
  --yellow-soft: #FFF5BF; /* callout boxes */
  --text: #1E2B31;        /* body text */
  --muted: #4A5C63;       /* captions, fine print */
  --white: #FFFFFF;
}
```

- **Headings:** Poppins 700, navy. On teal backgrounds, use white, with key words in yellow (like the cover).
- **Eyebrow labels:** Poppins 600, uppercase, letter-spacing 0.2em, small, teal.
- **Body:** Lora 400, 18px on mobile and 19px on desktop, line-height 1.6, text color `--text`.
- **Signature accent:** a short yellow bar (64 × 6 px, rounded) under section headings, matching the book's chapter openers.
- **Buttons:** pill-shaped (fully rounded), Poppins 600. Primary is navy with white text; secondary is yellow with navy text. Large tap targets (min 48px tall).
- **Cards:** white, 12px radius, soft shadow, generous padding.
- **Layout:** max content width 1100px; reading-width text blocks max 680px. Sections alternate white / `--teal-light`, with one or two full-bleed `--teal-cover` bands (hero and final CTA).
- **Short paragraphs**, never walls of text, matching the book's voice.

### `LoopDiagram.astro`

A simple inline SVG for the "two-way loop" idea: two rounded boxes, **"You"** and **"Your dog"**, joined by two arrows. The top arrow is labeled "breath, voice, leash tension" and the bottom arrow "behavior, body language." Navy strokes, teal fills at low opacity. It must be readable on a 360px-wide phone; stack vertically on narrow screens if needed.

## 6. Page: Home (`/`)

Sections in order. Copy is final unless marked `{{…}}`.

### 6.1 Header (all pages)

- Left: wordmark **Stacy Jo** (Poppins 700, navy)
- Nav: The Book (`/#book`), Free Chapter (`/free-chapter`), About (`/#about`), YouTube (external)
- Right: primary button **Get the book** → scrolls to `/#pricing`
- Mobile: collapsible menu; keep the "Get the book" button visible.

### 6.2 Launch banner (only when `launch.active`)

> Launch week: use code **BOTHWAYS** for $5 off, until {{LAUNCH_END_DATE}}.

### 6.3 Hero (full-bleed `--teal-cover`)

- Eyebrow: **New book by Stacy Jo**
- H1: **Your dog feels what you feel.** *(line break)* **Calm does too.** ("Calm does too." in yellow)
- Subhead: *The Leash Goes Both Ways* is a calm-first method for the stress loop between you and your dog, so walks, guests, and everyday life get easier for both of you.
- Buttons: **Get the book: $19** (BuyButton → ebook) · **Read a free chapter** (secondary → `/free-chapter`)
- Fine print: Instant PDF download · 14-day money-back guarantee
- Image: `book-cover.jpg`, alt text: "Book cover of The Leash Goes Both Ways by Stacy Jo, showing Stacy Jo smiling with her golden retriever and French bulldog"

### 6.4 The problem (white)

- H2: **You love your dog. Some days it still feels like a second job.**
- Short list:
  - The pulling that starts the second you step outside
  - The lunge at the neighbor's dog
  - The barking every time the doorbell rings
  - The dog who's still pacing at nine o'clock at night
  - The nail trim that takes two people and a towel
- Paragraphs:
  - Most training advice treats you like a remote control: press the right button, get the right behavior. When it doesn't work, you try a new tool, a new trick, a new trainer.
  - And somewhere along the way, you start to wonder if the problem is you.
  - **It isn't. But you are part of the picture, and that turns out to be the best news of all.**

### 6.5 The big idea (teal-light)

- Eyebrow: **The two-way loop**
- H2: **Stress travels down the leash. So does calm.**
- Paragraph: Your dog reads your breathing, your voice, your pace, and the tension in your hand all day long. Their body responds. Then their behavior changes how *you* feel, and the loop keeps going. Most training only works on the dog's side. This book works on both.
- `<LoopDiagram />`
- Three cards (H3 + text):
  - **Months: stress hormones.** In a 2019 study of 58 dogs and their owners, long-term stress levels measured in hair tended to rise and fall together.
  - **Minutes: bonding hormones.** In a 2015 study, mutual gazing between dogs and owners raised oxytocin, the "bonding hormone," in both.
  - **Seconds: heart rhythm.** Dogs' and owners' heart rhythms can line up, especially during quiet rest together, and the effect grows the longer they've lived together.
- Fine print under the cards: *These studies are small and show links, not proof that one causes the other. But they point to one very useful idea: you have a lever. You can't control the squirrel. You can control your next breath.*
- Small "Sources" disclosure (collapsed `<details>`), with links that open in a new tab:
  - Sundman et al., 2019, *Scientific Reports*: https://liu.se/en/news-item/hunden-speglar-agarens-stress
  - Nagasawa et al., 2015, *Science*: https://carta.anthropogeny.org/node/308531
  - Katayama et al., 2019, *Frontiers in Psychology*: https://www.frontiersin.org/articles/10.3389/fpsyg.2019.01678/text
  - Dog–owner heart-rate co-modulation, 2024, *Scientific Reports*: https://jyx.jyu.fi/jyx/Record/jyx_123456789_97721/Details

### 6.6 What's inside (white, `id="book"`)

- H2: **One method. Six pillars. Twenty-five drills.**
- `<PillarGrid />`: six cards, each with a pillar name and one line:
  - **Regulate:** Calm yourself first, then train. Thresholds, triggers, and teaching your dog to switch off.
  - **Understand:** The quiet stress signals most owners miss, and what your own body is saying back.
  - **Bond:** Consent, play, and nail trims without the wrestling match.
  - **Move:** The sniffari, and the end of the leash tug-of-war.
  - **Nourish:** Food, comfort, routine, and easing resource guarding.
  - **Live:** The TRIP framework, real-world manners, and multi-dog homes.
- Line under the grid: **Plus a 7-Day Calm Together Plan you can start tonight.**
- Specs row (small, with icons): 128-page PDF · 17 short chapters · 25 step-by-step drills · Reads on phone, tablet, or computer

### 6.7 Try one right now (yellow-soft callout card)

- Eyebrow: **A drill from Chapter 4**
- H2: **The 3-Breath Reset**
- Ordered list:
  1. **Drop the tension.** Unlock your elbow, soften your grip, let a little slack into the leash.
  2. **Soften your body.** Unclench your jaw, soften your knees, and let your eyes leave the trigger.
  3. **The long exhale.** Breathe out slowly, longer than you breathed in. *Then* give your cue, in your normal voice.
- Closing line: Ten seconds. Try it before your next walk, and notice what changes: in you first, then in your dog.
- Link: **Read all of Chapter 4 free →** `/free-chapter`

### 6.8 About Stacy Jo (teal-light, `id="about"`)

- Image: `stacy-jo-headshot.jpg` (round crop), alt "Stacy Jo"
- Eyebrow: **Meet your trainer**
- H2: **Hi, I'm Stacy Jo.**
- Paragraphs:
  - I'm a dog trainer who teaches a calm-first, balanced approach built on one simple idea: you and your dog shape each other.
  - Rewards lead, always. I help owners calm their own side of the leash first, read what their dogs are really saying, and build routines that leave both ends of the leash happier.
  - At home, that means a golden retriever named {{GOLDEN_RETRIEVER_NAME}} and a French bulldog named {{FRENCH_BULLDOG_NAME}}: one big dog, one small dog, and plenty of real-life practice.
- Button: **Watch on YouTube** → `socials.youtube`

### 6.9 Pricing (white, `id="pricing"`)

- H2: **Get the book**
- `<PricingCards />`, two cards side by side (stacked on mobile):

**Ebook: $19**
- The complete 128-page PDF
- All 17 chapters and 25 drills
- The 7-Day Calm Together Plan
- Instant download
- Button: **Get the ebook** (BuyButton → ebook)

**Ebook + Audiobook: $29** (label: **Best value**)
- Everything in the ebook
- The complete audiobook: about 1 hour 50 minutes, 22 MP3 tracks
- Narrated with an AI version of Stacy Jo's own voice
- Listen on your walks
- Button: **Get the bundle** (BuyButton → bundle; primary style)

- Under both cards: **14-day money-back guarantee.** If the book isn't helpful, email hello@stacyjo.com within 14 days of purchase for a full refund.
- When `launch.active`: show a strike-through original price and the launch price ($14 / $24), with "with code BOTHWAYS."

### 6.10 FAQ (teal-light)

Use `<details>` elements, accessible and keyboard-friendly.

- **Is this book right for my dog?** It's written for everyday dog owners: puppies, adult dogs, seniors, rescues, big dogs and small. The method works on the relationship between you and your dog, whatever the breed.
- **Does Stacy Jo use punishment?** Rewards lead, always. Stacy Jo is a practical, balanced trainer: on occasion she uses clear, low-level corrections, but never for fear, never for a growl, never when a dog is over threshold, and never in anger. Her test for every session: does it end with both of you calmer?
- **Is this a replacement for my vet or a behaviorist?** No. The book is general education. If your dog has bitten someone, or their behavior has changed suddenly, please start with your veterinarian and a qualified behavior professional.
- **What format is it?** A PDF that reads well on phones, tablets, and computers. You get a download link right after purchase and by email.
- **Who narrates the audiobook?** It's narrated with an AI-generated version of Stacy Jo's own voice.
- **What if it's not for me?** Email hello@stacyjo.com within 14 days for a full refund.
- **I have a question.** Email hello@stacyjo.com.

### 6.11 Final CTA band (full-bleed `--teal-cover`)

- H2 (white, "So does calm." in yellow): **Stress travels down the leash. So does calm.**
- Two buttons: **Get the book** (→ `#pricing`) · **Read a free chapter** (→ `/free-chapter`)

### 6.12 Footer (all pages)

- Wordmark + tagline
- Social icons with labels (YouTube, Instagram, TikTok, Facebook, Pinterest), all @StacyJoDogs
- Links: Free Chapter · Privacy · Terms · Refunds · hello@stacyjo.com
- Fine print: © {current year} Stacy Jo. *The Leash Goes Both Ways* offers general education, not veterinary advice.

## 7. Page: Free chapter (`/free-chapter`)

- Title tag: Free Chapter: Calm Is Contagious | Stacy Jo
- Layout: two columns on desktop (copy and form left, cover image right); stacked on mobile with the form above the fold.
- Eyebrow: **Free chapter**
- H1: **Read Chapter 4 free: Calm Is Contagious**
- Paragraph: The signature chapter of *The Leash Goes Both Ways*, plus the introduction. Free, straight to your inbox.
- "You'll learn" list:
  - Why yelling "No!" can sound like joining in to your dog
  - The 3-Breath Reset: the 10-second skill everything else builds on
  - How to keep your voice steady so it calms instead of alarms
  - A simple practice plan that makes calm show up when you need it
- `<KitForm />`
- Under the form: No spam. Unsubscribe anytime.

## 8. Page: Thank you (`/thank-you`)

Lemon Squeezy shows a confirmation after payment. In the product's Confirmation modal settings, set **Button link** to `https://stacyjo.com/thank-you`.

- H1: **Thank you! Your book is on its way.**
- Paragraph: Your download link is in your inbox (and on the receipt screen). If you don't see it in a few minutes, check spam or promotions, or email hello@stacyjo.com.
- Three numbered next steps:
  1. **Start with the 7-Day Calm Together Plan** at the back of the book: one small step a day.
  2. **Unlock the free audiobook:** share the free chapter with three dog-owner friends. (Show only if `referral.sparkloopUrl` is set; button → that URL.)
  3. **Watch the drills in action** on YouTube → `socials.youtube`

## 9. Page: Welcome (`/welcome`)

Kit redirects here after signup.

- H1: **Check your inbox: Chapter 4 is on its way.**
- Paragraph: Confirm your email if Kit asks you to, and the free chapter will arrive right after.
- Card: **Want the whole method?** 17 chapters, 25 drills, and the 7-Day Calm Together Plan. Button: **Get the book** → `/#pricing`
- Secondary: **Subscribe on YouTube** → `socials.youtube`

## 10. Legal pages (`/privacy`, `/terms`, `/refunds`)

Plain, readable layout (reading width). Put **"Last updated: {{DATE}}"** at the top of each. These are starting drafts; Stacy Jo should have them reviewed before launch.

### Privacy (draft)

- **Who we are:** Stacy Jo (stacyjo.com). Contact: hello@stacyjo.com.
- **What we collect:** your email (and first name, if you give it) when you sign up for the free chapter or emails; purchase details when you buy. We don't collect payment card numbers. Lemon Squeezy handles payments as the merchant of record.
- **How we use it:** to deliver what you asked for, send emails you signed up for, provide customer support, and improve the site.
- **Service providers:** Lemon Squeezy (checkout, payments, file delivery), Kit (email), {{HOSTING_PROVIDER}} (hosting), {{ANALYTICS_PROVIDER, or "none"}} (privacy-friendly, cookieless analytics). Each processes data under its own privacy policy.
- **Your choices:** unsubscribe from any email with one click. To access or delete your data, email hello@stacyjo.com.
- **Children:** this site isn't directed to children under 13.
- **Changes:** we'll update this page and the date above.

### Terms (draft)

- Buying the book gives you a personal, non-transferable license to read and use it. Please don't share, resell, or post the paid files. (The free chapter may be shared freely in its complete, unaltered form.)
- The book and site are general education about dog behavior and training, not veterinary advice or a behavioral diagnosis. You're responsible for your dog's safety and for seeking professional help when needed.
- Content is provided "as is." To the extent the law allows, Stacy Jo isn't liable for indirect or consequential damages arising from use of the site or book.
- Governing law: {{STATE/COUNTRY}}.
- Contact: hello@stacyjo.com.

### Refunds (draft)

- 14-day money-back guarantee on the ebook and the bundle.
- Email hello@stacyjo.com with your order number within 14 days of purchase, and you'll get a full refund. No questions asked.
- Refunds go back to your original payment method through Lemon Squeezy.

## 11. Lemon Squeezy integration

1. In `Base.astro`, include on every page (once, before `</body>`):
   ```html
   <script src="https://app.lemonsqueezy.com/js/lemon.js" defer></script>
   ```
2. `BuyButton.astro` renders an `<a>` with `class="lemonsqueezy-button"` and `href` = the product's checkout URL plus `?embed=1`, which opens the checkout as an overlay on the page.
3. Checkout URLs come from the Lemon Squeezy dashboard (Products → the product → Share). Paste them into `src/config.ts`.
4. When `launch.active` is true, BuyButton may pre-fill the discount code by adding `checkout[discount_code]=BOTHWAYS` to the URL (properly URL-encoded). Verify this against Lemon Squeezy's checkout docs; if in doubt, skip it, since buyers can type the code at checkout.
5. **Fallback:** without JavaScript, the link still works and opens Lemon Squeezy's hosted checkout page.
6. No webhooks, API keys, or server code. Never put a Lemon Squeezy API key in the site.

## 12. Kit integration (free chapter)

1. In Kit, create a form called **"Free Chapter"**. Set its incentive email to deliver *The-Leash-Goes-Both-Ways-Free-Chapter.pdf*, and set the success redirect to `https://stacyjo.com/welcome`.
2. Copy the form's **HTML embed** code.
3. `KitForm.astro` starts as a styled placeholder (email field + "Send me the free chapter" button, disabled) with a clear comment: `<!-- Paste Kit HTML embed here -->`. Once the embed is pasted, restyle Kit's markup with brand styles: navy pill button, 48px-tall input, Poppins labels.
4. Button text: **Send me the free chapter**

## 13. SEO and sharing

| Page | `<title>` | Meta description |
| --- | --- | --- |
| Home | The Leash Goes Both Ways: Calm-First Dog Training \| Stacy Jo | Your dog feels what you feel. A calm-first method for the stress loop between you and your dog. 25 drills, 17 chapters, instant PDF. |
| Free chapter | Free Chapter: Calm Is Contagious \| Stacy Jo | Read Chapter 4 of The Leash Goes Both Ways free, including the 3-Breath Reset that makes calm contagious. |
| Thank you | Thank You \| Stacy Jo | (noindex) |
| Welcome | Welcome \| Stacy Jo | (noindex) |

- Open Graph and Twitter card tags on every page, with `og:image` = `/images/og-image.jpg` (1200 × 630, already made).
- **JSON-LD** on the home page:
  - `Book`: name, author (Person: Stacy Jo), image, bookFormat EBook, and `offers` for both products in USD (prices from config). Use only real data from config.
  - `Person`: name Stacy Jo, url, image, and `sameAs` = all social URLs.
- `robots.txt` allowing all, plus the sitemap URL. Add `noindex` to `/thank-you` and `/welcome`.
- `favicon.svg`: a navy circle with "SJ" in white Poppins 700, or a simple paw. Keep it simple.

## 14. Acceptance checklist

- [ ] All copy matches this brief; every remaining `{{PLACEHOLDER}}` is listed in a final report.
- [ ] Buy buttons open the Lemon Squeezy overlay (once real URLs are in config) and still work with JavaScript off.
- [ ] Launch banner and launch prices appear only when `launch.active` is true.
- [ ] Kit placeholder is obvious and easy to swap.
- [ ] Mobile layout checked at 360px, 390px, and 768px; no horizontal scroll.
- [ ] Lighthouse mobile scores of 95+ for Performance, Accessibility, Best Practices, and SEO.
- [ ] Social share preview shows the OG image (check with a link-preview tool).
- [ ] Legal pages are linked in the footer and show their "Last updated" date.
- [ ] `npm run build` passes with no warnings; deploy instructions written in README.md.
