-- Seed script to load NexTone backup data straight into Supabase PostgreSQL
-- Can be executed in the Supabase SQL editor by the workspace owner.

do $$
declare
  current_owner uuid;
begin
  -- Use currently authenticated user, or the first existing user in auth.users
  select id into current_owner from auth.users limit 1;

  if current_owner is null then
    raise notice 'No user found in auth.users. Please sign up or create a user first.';
    return;
  end if;

  -- 1. Company Settings
  insert into public.company_settings (owner_id, name, tagline, address, phone, email, website, logo_url, default_notes)
  values (
    current_owner,
    'NexTone',
    'Printing, Branding & Custom Media Solutions',
    'Namasuba',
    '+256756286160',
    'orders@nextone.ug',
    'nextone.ug',
    '',
    'We prioritize customer satisfaction. Our team is dedicated to delivering exceptional quality printing and branding solutions, ensuring complete satisfaction on every project.'
  )
  on conflict (owner_id) do update set
    name = excluded.name,
    tagline = excluded.tagline,
    address = excluded.address,
    phone = excluded.phone,
    email = excluded.email;

  -- 2. Customers
  insert into public.customers (id, owner_id, name, phone, email, address, created_at)
  values
    ('cust_1792668744179_ouwc', current_owner, 'Mr. Timothy', '+256783282126', '', 'Namasuba, Kampala', '2026-10-22T11:32:24.179Z'),
    ('cust_1792668723440_b2yu', current_owner, 'John k', '+256 702 628128', '', '', '2026-10-22T11:32:03.440Z'),
    ('cust_1792668690724_29at', current_owner, 'Mr. Setimba', '+97430142020', '', '', '2026-10-22T11:31:30.724Z')
  on conflict (id) do update set
    name = excluded.name,
    phone = excluded.phone,
    email = excluded.email,
    address = excluded.address;

  -- 3. Catalog Products
  insert into public.catalog_items (id, owner_id, name, description, unit, price, category, created_at)
  values
    ('prod_1793449702945_qxjw', current_owner, 'Notebook', '5 square homes', 'pcs', 41000, 'Paper Printing', '2026-10-31T12:28:22.945Z'),
    ('prod_1793447749319_zi3t', current_owner, 'Umbrellas', 'Buying and branding', 'pcs', 35000, 'Promotional Items', '2026-10-31T11:55:49.319Z'),
    ('prod_1793447414007_a0eu', current_owner, 'A4 sticker', '', 'sheet', 700, 'Paper Printing', '2026-10-31T11:50:14.007Z'),
    ('prod_1793447373301_o9rg', current_owner, 'A4 Paper', '', 'sheet', 600, 'Paper Printing', '2026-10-31T11:49:33.301Z'),
    ('prod_1793447127008_ji9x', current_owner, 'Helmet', 'Buying price', 'pcs', 10000, 'Promotional Items', '2026-10-31T11:45:27.008Z'),
    ('prod_1793447081203_r8tc', current_owner, 'Reflectors', 'Buying price', 'pcs', 5000, 'Promotional Items', '2026-10-31T11:44:41.203Z'),
    ('prod_1', current_owner, 'Pull-up Banner', 'Heavy duty aluminium cassette stand with anti-curl PVC printed banner graphic.', 'pcs', 200000, 'Banners & Signage', '2026-10-22T12:31:05.179Z'),
    ('prod_2', current_owner, 'Branded T-Shirt', '100% combed cotton round neck T-shirt with full color chest DTF print.', 'pcs', 20000, 'Apparels & Merchandise', '2026-10-22T12:31:05.179Z'),
    ('prod_3', current_owner, 'Business Cards', 'Box of 100 premium business cards with double-sided matte or gloss lamination.', 'box', 35000, 'Paper Printing', '2026-10-22T12:31:05.179Z'),
    ('prod_4', current_owner, 'Vinyl Stickers', 'A3 waterproof gloss vinyl sticker sheet with custom die-cut labels.', 'sheet', 15000, 'Large Format Printing', '2026-10-22T12:31:05.179Z'),
    ('prod_5', current_owner, 'Teardrop Flag', 'Outdoor promotional teardrop flag with flexible carbon pole and water base.', 'pcs', 220000, 'Banners & Signage', '2026-10-22T12:31:05.179Z'),
    ('prod_6', current_owner, 'Branded Mug', 'White ceramic mug with full wrap-around heat-press corporate logo print.', 'pcs', 18000, 'Promotional Items', '2026-10-22T12:31:05.179Z'),
    ('prod_7', current_owner, 'Flyers & Brochures', 'Full color digital gloss art paper flyers for marketing campaigns.', 'pack', 65000, 'Paper Printing', '2026-10-22T12:31:05.179Z'),
    ('prod_8', current_owner, 'Branded Lanyards', 'Silkscreen printed fabric lanyard with metal hook and plastic card holder.', 'pcs', 6000, 'Corporate ID', '2026-10-22T12:31:05.179Z')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    unit = excluded.unit,
    price = excluded.price,
    category = excluded.category;

  -- 4. Sales Documents (Quotation and Invoices)
  insert into public.sales_documents (id, owner_id, type, number, customer_id, customer_name, customer_phone, customer_email, customer_address, items, discount_percent, notes, status, issue_date, due_date, created_at)
  values
    (
      'ord_1793456784863_6l5k',
      current_owner,
      'quotation',
      'ORD-2026-0100',
      'cust_1792668744179_ouwc',
      'Mr. Timothy',
      '+256783282126',
      '',
      '',
      '[{"id":"item_1793456755966_vuto","catalog_id":"prod_1793449702945_qxjw","description":"Notebook","quantity":5,"unit":"pcs","unit_price":41000},{"id":"item_1793456755967_ab5w","catalog_id":"prod_1793447749319_zi3t","description":"Umbrellas","quantity":5,"unit":"pcs","unit_price":35000},{"id":"item_1793456755967_mafq","catalog_id":"prod_1","description":"Pull-up Banner","quantity":1,"unit":"pcs","unit_price":200000}]'::jsonb,
      0,
      'Delivery expected: 02/11/2026',
      'sent',
      '2026-10-31',
      '2026-11-02',
      '2026-10-31T14:26:24.863Z'
    ),
    (
      'inv_1792671847743_c9os',
      current_owner,
      'invoice',
      'INV-2026-0101',
      'cust_1792668744179_ouwc',
      'Mr. Timothy',
      '+256783282126',
      '',
      '',
      '[{"id":"item-1792671604784-1","description":"General","quantity":1,"unit":"pcs","unit_price":123200}]'::jsonb,
      0,
      'Payment due upon receipt or within net agreed terms.',
      'overdue',
      '2026-10-10',
      '2026-10-31',
      '2026-10-22T12:24:07.744Z'
    ),
    (
      'inv_1792668875661_jioy',
      current_owner,
      'invoice',
      'INV-2026-0100',
      'cust_1792668690724_29at',
      'Mr. Setimba',
      '+97430142020',
      '',
      '',
      '[{"id":"item-1792668752724-1","description":"Playing cards","quantity":100,"unit":"pcs","unit_price":15350}]'::jsonb,
      0,
      'Payment due upon receipt or within net agreed terms.',
      'partial',
      '2026-02-28',
      '2027-02-01',
      '2026-10-22T11:34:35.661Z'
    )
  on conflict (id) do update set
    number = excluded.number,
    items = excluded.items,
    status = excluded.status,
    notes = excluded.notes;

  -- 5. Payments
  insert into public.payments (id, owner_id, document_id, number, paid_at, amount, method, reference, created_at)
  values
    (
      'pay_1793015681871_wi1t',
      current_owner,
      'inv_1792671847743_c9os',
      'RCT-2026-0101',
      '2026-10-26',
      100000,
      'Mobile Money',
      'MTN',
      '2026-10-26T11:54:41.871Z'
    ),
    (
      'pay_1792668940744_l7nf',
      current_owner,
      'inv_1792668875661_jioy',
      'RCT-2026-0100',
      '2026-10-22',
      900000,
      'Mobile Money',
      'Airtel',
      '2026-10-22T11:35:40.744Z'
    )
  on conflict (id) do update set
    number = excluded.number,
    amount = excluded.amount,
    method = excluded.method,
    reference = excluded.reference;

end
$$;
