// Edit this file to change what the app shows and where the data comes from.
window.CONFIG = {
  // "frankfurter"  -> free, no key, but rates update once per day (European Central Bank).
  // "twelvedata"   -> near-live rates (about 1 minute), needs a free API key. See README.
  provider: "frankfurter",

  // How often to check for new rates. With Twelve Data's free plan every currency
  // costs 1 credit per check (800 credits/day), so 300 is a safer value than 60.
  refreshSeconds: 60,

  // Currencies to show against the US dollar.
  // Frankfurter supports: AUD BGN BRL CAD CHF CNY CZK DKK EUR GBP HKD HUF IDR ILS INR
  // ISK JPY KRW MXN MYR NOK NZD PHP PLN RON SEK SGD THB TRY ZAR
  currencies: ["EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "MXN", "ZAR"],

  // Only used when provider is "twelvedata".
  // BEST: deploy proxy/worker.js to Cloudflare and paste its URL here (keeps your key private).
  twelveDataProxy: "",
  // QUICK TEST ONLY: a key placed here is visible to anyone who opens your site.
  twelveDataKey: ""
};
