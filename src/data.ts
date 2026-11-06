/// <reference types="vite/client" />
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { CatalogItem, Customer, Payment, SalesDocument, CompanySettings } from './types'
import { defaultSettings } from './types'

const KEY = 'nextone-data-v1'
const today = new Date().toISOString().slice(0, 10)
const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)
const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
export type Store = { customers: Customer[]; catalog: CatalogItem[]; documents: SalesDocument[]; payments: Payment[]; settings: CompanySettings }
const demo: Store = {
  customers: [
    { id: 'customer-1', name: 'Timothy Kato', phone: '+256 783 282 126', email: 'timothy@example.com', address: 'Kampala, Uganda', created_at: monthAgo },
    { id: 'customer-2', name: 'John K', phone: '+256 702 628 128', email: '', address: 'Kampala, Uganda', created_at: weekAgo },
    { id: 'customer-3', name: 'Acacia Studio', phone: '+256 771 100 220', email: 'hello@acaciastudio.ug', address: 'Ntinda, Kampala', created_at: today },
  ],
  catalog: [
    { id: 'item-1', name: 'Business cards', description: 'Double-sided business cards', unit: 'box', price: 45000, category: 'Printing', created_at: today },
    { id: 'item-2', name: 'A5 flyer', description: 'Full color, both sides', unit: 'piece', price: 1200, category: 'Printing', created_at: today },
    { id: 'item-3', name: 'Pull-up banner', description: '850 × 2000 mm with stand', unit: 'piece', price: 200000, category: 'Branding', created_at: today },
    { id: 'item-4', name: 'Branded T-shirt', description: 'Cotton tee with front print', unit: 'piece', price: 35000, category: 'Branding', created_at: today },
    { id: 'item-5', name: 'Envelope printing', description: 'DL envelope, one-color print', unit: 'pack', price: 5000, category: 'Printing', created_at: today },
  ],
  documents: [
    { id: 'doc-1', type: 'invoice', number: 'INV-2026-0003', customer_id: 'customer-1', customer_name: 'Timothy Kato', customer_phone: '+256 783 282 126', customer_email: 'timothy@example.com', customer_address: 'Kampala, Uganda', items: [{ id: 'li-1', catalog_id: 'item-3', description: 'Pull-up banner', quantity: 1, unit: 'piece', unit_price: 200000 }, { id: 'li-2', catalog_id: 'item-1', description: 'Business cards', quantity: 5, unit: 'box', unit_price: 45000 }], discount_percent: 0, notes: 'Generated for display', status: 'partial', issue_date: weekAgo, due_date: today, created_at: weekAgo },
    { id: 'doc-2', type: 'quotation', number: 'ORD-2026-0005', customer_id: 'customer-2', customer_name: 'John K', customer_phone: '+256 702 628 128', customer_email: '', customer_address: 'Kampala, Uganda', items: [{ id: 'li-3', catalog_id: 'item-5', description: 'Envelope printing', quantity: 7, unit: 'pack', unit_price: 5000 }, { id: 'li-4', description: 'Envelope printing - small', quantity: 350, unit: 'sheet', unit_price: 300 }], discount_percent: 0, notes: '', status: 'sent', issue_date: today, due_date: today, created_at: today },
    { id: 'doc-3', type: 'invoice', number: 'INV-2026-0002', customer_id: 'customer-3', customer_name: 'Acacia Studio', customer_phone: '+256 771 100 220', customer_email: 'hello@acaciastudio.ug', customer_address: 'Ntinda, Kampala', items: [{ id: 'li-5', catalog_id: 'item-2', description: 'A5 flyer', quantity: 100, unit: 'piece', unit_price: 1200 }], discount_percent: 0, notes: '', status: 'overdue', issue_date: monthAgo, due_date: weekAgo, created_at: monthAgo },
  ],
  payments: [{ id: 'pay-1', document_id: 'doc-1', number: 'RCT-2026-0001', paid_at: weekAgo, amount: 100000, method: 'Mobile Money', reference: 'MOMO-1234', created_at: weekAgo }],
  settings: defaultSettings,
}
function readLocal(): Store {
  try {
    const saved = localStorage.getItem(KEY)
    return saved ? { ...demo, ...JSON.parse(saved), settings: { ...defaultSettings, ...JSON.parse(saved).settings } } : demo
  } catch { return demo }
}
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabase: SupabaseClient | null = url && anon ? createClient(url, anon) : null
export const isDemo = !supabase

export async function loadStore(): Promise<Store> {
  if (!supabase) return readLocal()
  const [customers, catalog, documents, payments, settings] = await Promise.all([
    supabase.from('customers').select('*').order('created_at', { ascending: false }),
    supabase.from('catalog_items').select('*').order('created_at', { ascending: false }),
    supabase.from('sales_documents').select('*').order('created_at', { ascending: false }),
    supabase.from('payments').select('*').order('created_at', { ascending: false }),
    supabase.from('company_settings').select('*').maybeSingle(),
  ])
  const firstError = [customers, catalog, documents, payments, settings].find(x => x.error)?.error
  if (firstError) throw firstError
  return { customers: customers.data ?? [], catalog: catalog.data ?? [], documents: documents.data ?? [], payments: payments.data ?? [], settings: settings.data ? { ...defaultSettings, ...settings.data } : defaultSettings }
}

export async function persistStore(store: Store, previous: Store) {
  if (!supabase) { localStorage.setItem(KEY, JSON.stringify(store)); return }
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Please sign in again to save changes.')
  const owner_id = data.user.id
  const client = supabase
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
  const tables = [
    { table: 'customers', rows: store.customers, oldRows: previous.customers },
    { table: 'catalog_items', rows: store.catalog, oldRows: previous.catalog },
    { table: 'sales_documents', rows: store.documents, oldRows: previous.documents },
    { table: 'payments', rows: store.payments, oldRows: previous.payments },
  ] as const
  // Delete changed records first, with payments before invoices because of their FK.
  for (const { table, rows, oldRows } of [...tables].reverse()) {
    const keep = new Set(rows.map(row => row.id))
    const removed = oldRows.map(row => row.id).filter(id => !keep.has(id))
    if (removed.length) {
      const deletion = await client.from(table).delete().eq('owner_id', owner_id).in('id', removed)
      if (deletion.error) throw deletion.error
    }
  }
  for (const { table, rows, oldRows } of tables) {
    const oldById = new Map(oldRows.map(row => [row.id, row]))
    for (const row of rows) {
      if (same(oldById.get(row.id), row)) continue
      const result = await client.from(table).upsert({ ...row, owner_id })
      if (result.error) throw result.error
    }
  }
  if (!same(store.settings, previous.settings)) {
    const settingsResult = await client.from('company_settings').upsert({ ...store.settings, owner_id })
    if (settingsResult.error) throw settingsResult.error
  }
}

export function makeId(prefix: string) { return `${prefix}-${crypto.randomUUID()}` }
