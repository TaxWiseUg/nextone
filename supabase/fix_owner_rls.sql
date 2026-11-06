-- Restore the intended owner-only access rules for all NexTone business tables.
-- This only changes grants and policies; existing records are not modified.
do $$
declare
  target_table text;
  existing_policy record;
  business_tables text[] := array[
    'customers',
    'catalog_items',
    'sales_documents',
    'payments',
    'company_settings'
  ];
begin
  foreach target_table in array business_tables loop
    execute format('alter table public.%I enable row level security', target_table);

    -- Remove stale or conflicting rules left by earlier setup attempts.
    for existing_policy in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
    loop
      execute format('drop policy %I on public.%I', existing_policy.policyname, target_table);
    end loop;

    execute format(
      'grant select, insert, update, delete on table public.%I to authenticated',
      target_table
    );
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id)',
      'owner manages ' || target_table,
      target_table
    );
  end loop;
end
$$;
