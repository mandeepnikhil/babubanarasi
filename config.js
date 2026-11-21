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
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  RAZORPAY_KEY_ID: "",
  // Which sign-in methods to show (turn each on in Supabase → Authentication → Providers first)
  AUTH_METHODS: { google: true, emailCode: true, password: true, phone: true },
};
