# NexTone Orders & Documents

A responsive React application for NexTone's printing and branding catalog, customers, quotations, invoices, payment receipts, and customer statements. Documents use a shared, exportable design based on the supplied references.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`, then `npm run dev`.
3. Without Supabase environment values the app opens in preview mode with sample data saved only in this browser's local storage.

## Connect Supabase

1. Create a Supabase project.
2. Run [`supabase/migrations/202611050001_initial_schema.sql`](supabase/migrations/202611050001_initial_schema.sql) in the Supabase SQL editor.
3. In Authentication settings, enable email sign-up while creating the first account.
4. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project settings. Restart the development server.
5. On the NexTone sign-in page, choose **New to NexTone? Create an account**. If email confirmation is enabled, verify the email before signing in.
6. After creating the owner account, disable new sign-ups in Supabase Auth settings to keep the workspace private. The owner can continue signing in.

Every business table has row-level security policies tied to the signed-in user's ID. The browser uses only the Supabase anon key. Never add a service-role key to `.env.local` or any `VITE_` variable.

## Deploy

Import the project into Google AI Studio Build mode or deploy the Vite app to Cloud Run. Configure the two Supabase environment variables as deployment environment values. AI Studio's deploy action publishes a Cloud Run service. The app itself does not require a Gemini API key.

## Included workflows

- Reusable printing and branding catalog, categories, units, and UGX prices.
- Customer contact records and editable NexTone business details.
- Quotations with percentage discount and free-form line items; convert quotations to invoices.
- Invoice payment tracking with partial payments and receipt numbers.
- PDF and PNG exports for quotations, invoices, receipts, and customer statements.
- Local preview data when Supabase is not configured.
