/* ===========================================================
   BABU BANARASI · SERVICE SETTINGS
   These values are PUBLIC by design (safe to be in the website).
   Never put your Razorpay KEY SECRET here; it lives only in Supabase.

   1. SUPABASE_URL / SUPABASE_ANON_KEY: Supabase dashboard → Project Settings → API
   2. RAZORPAY_KEY_ID: Razorpay dashboard → Account & Settings → API Keys
      (starts with rzp_test_ for testing, rzp_live_ for real payments)

   Leave them empty and the site keeps working: accounts show as
   "coming soon" and orders go through WhatsApp.
   =========================================================== */
window.BB_CONFIG = {
  // LIVE: false keeps accounts and online payment hidden on babubanarasi.com
  // (they still work on http://localhost for testing). Set to true to switch them on for customers.
  LIVE: true,
  SUPABASE_URL: "https://vudfuwpyoczheisrsxbf.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1ZGZ1d3B5b2N6aGVpc3JzeGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyNzQ0MjMsImV4cCI6MjExMDg1MDQyM30.EnMtrVMgunAeBaBxoGH9qjaGXj3r5RB8QSIY8Oll72c",
  RAZORPAY_KEY_ID: "rzp_live_U2xLs04hsyAl5v",
  // Which sign-in methods to show (turn each on in Supabase → Authentication → Providers first)
  // Social profiles shown in the footer. Paste the full https:// link; leave "" to hide one.
  SOCIAL: { instagram: "https://www.instagram.com/babubanarasi_official/", facebook: "", x: "", youtube: "" },
  // Ad measurement. Leave "" and nothing loads. Visitors are asked before either one runs.
  // META_PIXEL_ID: Meta Events Manager → Data sources → your dataset/pixel → the number under its name
  // GOOGLE_TAG_ID: Google Ads → Goals → Google tag (starts with AW-), or a GA4 ID (starts with G-)
  META_PIXEL_ID: "",
  GOOGLE_TAG_ID: "",
  AUTH_METHODS: { google: true, microsoft: false, emailCode: true, password: true, phone: false }, // microsoft, phone: switch on once each provider is set up in Supabase
};
