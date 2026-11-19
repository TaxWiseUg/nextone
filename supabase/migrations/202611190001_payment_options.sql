-- Add payment options columns to public.company_settings
alter table public.company_settings
  add column if not exists payment_methods jsonb not null default '["Mobile Money","Bank transfer","Cash"]'::jsonb,
  add column if not exists mobile_money_provider text not null default 'MTN / Airtel',
  add column if not exists mobile_money_number text not null default '+256 756 286 160',
  add column if not exists mobile_money_name text not null default 'NexTone Printing & Branding',
  add column if not exists bank_name text not null default '',
  add column if not exists bank_account_name text not null default '',
  add column if not exists bank_account_number text not null default '',
  add column if not exists payment_instructions text not null default '';
