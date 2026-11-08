# Dollar Rates

A phone-friendly app that shows how much a US dollar buys in other currencies, with a 30-day trend line and a flash when a rate changes. Installs to your home screen.

## Run it
1. Open this folder in VS Code.
2. Install the **Live Server** extension, right-click `index.html`, choose **Open with Live Server**.

## Publish it (GitHub Pages)
1. Create a new GitHub repository and upload all files in this folder (keep the `proxy` folder).
2. Go to **Settings > Pages**, set Source to **Deploy from a branch**, pick `main` and `/ (root)`, then Save.
3. After a minute your site is at `https://YOURNAME.github.io/REPO/`.

## Put it on your phone
- **Android (Chrome):** open the link, tap **Add to home screen**.
- **iPhone (Safari):** open the link, tap Share, then **Add to Home Screen**.

## Data: how live is it?
- **Default (Frankfurter):** free, no key, but rates update once a day. Good for testing.
- **Near-live (Twelve Data):** sign up free at twelvedata.com, then in `config.js` set `provider: "twelvedata"`.
  - Free plan: about 800 credits a day and 8 per minute, and each currency costs 1 credit per check. With 10 currencies set `refreshSeconds` to 300 or higher, or reduce the list.
  - Free data can be slightly delayed. True streaming needs a paid plan.

## Keep your API key private
Anything in `config.js` is public once it is on GitHub Pages. Instead:
1. Create a free Cloudflare account, then Workers & Pages > Create Worker.
2. Paste in `proxy/worker.js` and deploy.
3. In the Worker settings add a secret `TD_KEY` (your key) and a text variable `ALLOWED_ORIGIN` (`https://YOURNAME.github.io`).
4. Put the Worker URL in `twelveDataProxy` in `config.js`, and leave `twelveDataKey` empty.

## Change currencies
Edit the `currencies` list in `config.js`. After changing files on GitHub, open the app twice (or clear the site data) so the cached copy updates.

## Not financial advice
Rates shown are reference or delayed quotes, not what a bank or broker will give you.
