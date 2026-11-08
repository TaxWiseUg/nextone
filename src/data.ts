/// <reference types="vite/client" />
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { CatalogItem, Customer, Payment, SalesDocument, CompanySettings, LineItem } from './types'
import { defaultSettings } from './types'

const KEY = 'nextone-data-v4'
const OLD_KEYS = ['nextone-data-v3', 'nextone-data-v2', 'nextone-data-v1']

export type Store = {
  customers: Customer[]
  catalog: CatalogItem[]
  documents: SalesDocument[]
  payments: Payment[]
  settings: CompanySettings
}

export function sanitizeSequence(num: string): string {
  if (!num) return num
  const match = num.match(/^(INV|ORD|RCT|REC)-(\d{4})-(\d+)$/i)
  if (match) {
    let [, prefix, yr, seqStr] = match
    if (prefix.toUpperCase() === 'REC') prefix = 'RCT'
    const seq = parseInt(seqStr, 10)
    if (!Number.isNaN(seq) && seq < 100) {
      const adjusted = 99 + seq
      return `${prefix.toUpperCase()}-${yr}-${String(adjusted).padStart(4, '0')}`
    }
    return `${prefix.toUpperCase()}-${yr}-${String(seq).padStart(4, '0')}`
  }
  return num
}

/**
 * Official seed data extracted from Backup_2026-11-08_05fb6c5d.json
 */
export const initialBackupStore: Store = {
  settings: {
    name: 'NexTone',
    tagline: 'Printing, Branding & Custom Media Solutions',
    address: 'Namasuba',
    phone: '+256756286160',
    email: 'orders@nextone.ug',
    website: 'nextone.ug',
    logo_url: '',
    default_notes: 'We prioritize customer satisfaction. Our team is dedicated to delivering exceptional quality printing and branding solutions, ensuring complete satisfaction on every project.',
  },
  customers: [
    {
      id: 'cust_1792668744179_ouwc',
      name: 'Mr. Timothy',
      phone: '+256783282126',
      email: '',
      address: 'Namasuba, Kampala',
      created_at: '2026-10-22T11:32:24.179Z',
    },
    {
      id: 'cust_1792668723440_b2yu',
      name: 'John k',
      phone: '+256 702 628128',
      email: '',
      address: '',
      created_at: '2026-10-22T11:32:03.440Z',
    },
    {
      id: 'cust_1792668690724_29at',
      name: 'Mr. Setimba',
      phone: '+97430142020',
      email: '',
      address: '',
      created_at: '2026-10-22T11:31:30.724Z',
    },
  ],
  catalog: [
    {
      id: 'prod_1793449702945_qxjw',
      name: 'Notebook',
      description: '5 square homes',
      unit: 'pcs',
      price: 41000,
      category: 'Paper Printing',
      created_at: '2026-10-31T12:28:22.945Z',
    },
    {
      id: 'prod_1793447749319_zi3t',
      name: 'Umbrellas',
      description: 'Buying and branding',
      unit: 'pcs',
      price: 35000,
      category: 'Promotional Items',
      created_at: '2026-10-31T11:55:49.319Z',
    },
    {
      id: 'prod_1793447414007_a0eu',
      name: 'A4 sticker',
      description: '',
      unit: 'sheet',
      price: 700,
      category: 'Paper Printing',
      created_at: '2026-10-31T11:50:14.007Z',
    },
    {
      id: 'prod_1793447373301_o9rg',
      name: 'A4 Paper',
      description: '',
      unit: 'sheet',
      price: 600,
      category: 'Paper Printing',
      created_at: '2026-10-31T11:49:33.301Z',
    },
    {
      id: 'prod_1793447127008_ji9x',
      name: 'Helmet',
      description: 'Buying price',
      unit: 'pcs',
      price: 10000,
      category: 'Promotional Items',
      created_at: '2026-10-31T11:45:27.008Z',
    },
    {
      id: 'prod_1793447081203_r8tc',
      name: 'Reflectors',
      description: 'Buying price',
      unit: 'pcs',
      price: 5000,
      category: 'Promotional Items',
      created_at: '2026-10-31T11:44:41.203Z',
    },
    {
      id: 'prod_1',
      name: 'Pull-up Banner',
      description: 'Heavy duty aluminium cassette stand with anti-curl PVC printed banner graphic.',
      unit: 'pcs',
      price: 200000,
      category: 'Banners & Signage',
      created_at: '2026-10-22T12:31:05.179Z',
    },
    {
      id: 'prod_2',
      name: 'Branded T-Shirt',
      description: '100% combed cotton round neck T-shirt with full color chest DTF print.',
      unit: 'pcs',
      price: 20000,
      category: 'Apparels & Merchandise',
      created_at: '2026-10-22T12:31:05.179Z',
    },
    {
      id: 'prod_3',
      name: 'Business Cards',
      description: 'Box of 100 premium business cards with double-sided matte or gloss lamination.',
      unit: 'box',
      price: 35000,
      category: 'Paper Printing',
      created_at: '2026-10-22T12:31:05.179Z',
    },
    {
      id: 'prod_4',
      name: 'Vinyl Stickers',
      description: 'A3 waterproof gloss vinyl sticker sheet with custom die-cut labels.',
      unit: 'sheet',
      price: 15000,
      category: 'Large Format Printing',
      created_at: '2026-10-22T12:31:05.179Z',
    },
    {
      id: 'prod_5',
      name: 'Teardrop Flag',
      description: 'Outdoor promotional teardrop flag with flexible carbon pole and water base.',
      unit: 'pcs',
      price: 220000,
      category: 'Banners & Signage',
      created_at: '2026-10-22T12:31:05.179Z',
    },
    {
      id: 'prod_6',
      name: 'Branded Mug',
      description: 'White ceramic mug with full wrap-around heat-press corporate logo print.',
      unit: 'pcs',
      price: 18000,
      category: 'Promotional Items',
      created_at: '2026-10-22T12:31:05.179Z',
    },
    {
      id: 'prod_7',
      name: 'Flyers & Brochures',
      description: 'Full color digital gloss art paper flyers for marketing campaigns.',
      unit: 'pack',
      price: 65000,
      category: 'Paper Printing',
      created_at: '2026-10-22T12:31:05.179Z',
    },
    {
      id: 'prod_8',
      name: 'Branded Lanyards',
      description: 'Silkscreen printed fabric lanyard with metal hook and plastic card holder.',
      unit: 'pcs',
      price: 6000,
      category: 'Corporate ID',
      created_at: '2026-10-22T12:31:05.179Z',
    },
  ],
  documents: [
    {
      id: 'ord_1793456784863_6l5k',
      type: 'quotation',
      number: 'ORD-2026-0100',
      customer_id: 'cust_1792668744179_ouwc',
      customer_name: 'Mr. Timothy',
      customer_phone: '+256783282126',
      customer_email: '',
      customer_address: 'Namasuba, Kampala',
      items: [
        {
          id: 'item_1793456755966_vuto',
          catalog_id: 'prod_1793449702945_qxjw',
          description: 'Notebook',
          quantity: 5,
          unit: 'pcs',
          unit_price: 41000,
        },
        {
          id: 'item_1793456755967_ab5w',
          catalog_id: 'prod_1793447749319_zi3t',
          description: 'Umbrellas',
          quantity: 5,
          unit: 'pcs',
          unit_price: 35000,
        },
        {
          id: 'item_1793456755967_mafq',
          catalog_id: 'prod_1',
          description: 'Pull-up Banner',
          quantity: 1,
          unit: 'pcs',
          unit_price: 200000,
        },
      ],
      discount_percent: 0,
      notes: 'Delivery expected: 02/11/2026',
      status: 'sent',
      issue_date: '2026-10-31',
      due_date: '2026-11-02',
      created_at: '2026-10-31T14:26:24.863Z',
    },
    {
      id: 'inv_1792671847743_c9os',
      type: 'invoice',
      number: 'INV-2026-0101',
      customer_id: 'cust_1792668744179_ouwc',
      customer_name: 'Mr. Timothy',
      customer_phone: '+256783282126',
      customer_email: '',
      customer_address: 'Namasuba, Kampala',
      items: [
        {
          id: 'item-1792671604784-1',
          description: 'General',
          quantity: 1,
          unit: 'pcs',
          unit_price: 123200,
        },
      ],
      discount_percent: 0,
      notes: 'Payment due upon receipt or within net agreed terms.',
      status: 'overdue',
      issue_date: '2026-10-10',
      due_date: '2026-10-31',
      created_at: '2026-10-22T12:24:07.744Z',
    },
    {
      id: 'inv_1792668875661_jioy',
      type: 'invoice',
      number: 'INV-2026-0100',
      customer_id: 'cust_1792668690724_29at',
      customer_name: 'Mr. Setimba',
      customer_phone: '+97430142020',
      customer_email: '',
      customer_address: '',
      items: [
        {
          id: 'item-1792668752724-1',
          description: 'Playing cards',
          quantity: 100,
          unit: 'pcs',
          unit_price: 15350,
        },
      ],
      discount_percent: 0,
      notes: 'Payment due upon receipt or within net agreed terms.',
      status: 'partial',
      issue_date: '2026-02-28',
      due_date: '2027-02-01',
      created_at: '2026-10-22T11:34:35.661Z',
    },
  ],
  payments: [
    {
      id: 'pay_1793015681871_wi1t',
      document_id: 'inv_1792671847743_c9os',
      number: 'RCT-2026-0101',
      paid_at: '2026-10-26',
      amount: 100000,
      method: 'Mobile Money',
      reference: 'MTN',
      created_at: '2026-10-26T11:54:41.871Z',
    },
    {
      id: 'pay_1792668940744_l7nf',
      document_id: 'inv_1792668875661_jioy',
      number: 'RCT-2026-0100',
      paid_at: '2026-10-22',
      amount: 900000,
      method: 'Mobile Money',
      reference: 'Airtel',
      created_at: '2026-10-22T11:35:40.744Z',
    },
  ],
}

/**
 * Converts any imported backup JSON (or standard store JSON) into a validated Store
 */
export function parseBackupJson(raw: any): Store {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid backup file: not a JSON object.')
  }

  // Handle direct Store format
  if (Array.isArray(raw.customers) && Array.isArray(raw.catalog) && Array.isArray(raw.documents)) {
    return {
      customers: raw.customers,
      catalog: raw.catalog,
      documents: raw.documents.map((d: SalesDocument) => ({ ...d, number: sanitizeSequence(d.number) })),
      payments: (raw.payments || []).map((p: Payment) => ({ ...p, number: sanitizeSequence(p.number) })),
      settings: { ...defaultSettings, ...(raw.settings || {}) },
    }
  }

  // Handle Backup_*.json structure
  const settings: CompanySettings = {
    ...defaultSettings,
    name: raw.businessProfile?.name || 'NexTone',
    tagline: raw.businessProfile?.tagline || 'Printing, Branding & Custom Media Solutions',
    phone: raw.businessProfile?.phone || raw.businessProfile?.mobileMoneyNumber || '+256756286160',
    email: raw.businessProfile?.email || 'orders@nextone.ug',
    address: raw.businessProfile?.address || 'Namasuba',
    default_notes: raw.businessProfile?.notes || defaultSettings.default_notes,
  }

  const customers: Customer[] = (raw.customers || []).map((c: any) => ({
    id: c.id || makeId('cust'),
    name: c.name || 'Customer',
    phone: c.phone || '',
    email: c.email || '',
    address: c.address || '',
    created_at: c.createdAt || c.created_at || new Date().toISOString(),
  }))

  const catalog: CatalogItem[] = (raw.products || raw.catalog || []).map((p: any) => ({
    id: p.id || makeId('prod'),
    name: p.name || 'Product',
    description: p.description || '',
    unit: p.unit || 'pcs',
    price: Number(p.unitPrice ?? p.price ?? 0),
    category: p.category || 'Printing',
    created_at: p.createdAt || p.created_at || new Date().toISOString(),
  }))

  const orders: SalesDocument[] = (raw.orders || []).map((o: any) => {
    const items: LineItem[] = (o.items || []).map((it: any) => ({
      id: it.id || makeId('line'),
      catalog_id: it.productId || it.catalog_id,
      description: it.productName || it.description || 'Item',
      quantity: Number(it.quantity || 1),
      unit: it.unit || 'pcs',
      unit_price: Number(it.unitPrice ?? it.unit_price ?? 0),
    }))

    return {
      id: o.id || makeId('doc'),
      type: 'quotation' as const,
      number: sanitizeSequence(o.orderNumber || o.number || 'ORD-2026-0100'),
      customer_id: o.customerId || o.customer_id || '',
      customer_name: o.customerName || o.customer_name || 'Customer',
      customer_phone: o.customerPhone || o.customer_phone || '',
      customer_email: o.customerEmail || o.customer_email || '',
      customer_address: o.customerAddress || o.customer_address || '',
      items,
      discount_percent: Number(o.discountPercent ?? o.discount_percent ?? 0),
      notes: o.notes || '',
      status: o.status === 'pending' ? 'sent' : o.status === 'completed' ? 'accepted' : o.status || 'sent',
      issue_date: o.orderDate || o.issue_date || new Date().toISOString().slice(0, 10),
      due_date: o.deliveryDate || o.due_date || new Date().toISOString().slice(0, 10),
      created_at: o.createdAt || o.created_at || new Date().toISOString(),
    }
  })

  const invoices: SalesDocument[] = (raw.invoices || []).map((inv: any) => {
    const items: LineItem[] = (inv.items || []).map((it: any) => ({
      id: it.id || makeId('line'),
      catalog_id: it.productId || it.catalog_id,
      description: (it.productName || it.description || 'Item').trim(),
      quantity: Number(it.quantity || 1),
      unit: it.unit || 'pcs',
      unit_price: Number(it.unitPrice ?? it.unit_price ?? 0),
    }))

    const rawStatus = inv.status
    const status = rawStatus === 'partially_paid' ? 'partial' : rawStatus || 'unpaid'

    return {
      id: inv.id || makeId('doc'),
      type: 'invoice' as const,
      number: sanitizeSequence(inv.invoiceNumber || inv.number || 'INV-2026-0100'),
      customer_id: inv.customerId || inv.customer_id || '',
      customer_name: inv.customerName || inv.customer_name || 'Customer',
      customer_phone: inv.customerPhone || inv.customer_phone || '',
      customer_email: inv.customerEmail || inv.customer_email || '',
      customer_address: inv.customerAddress || inv.customer_address || '',
      items,
      discount_percent: Number(inv.discountPercent ?? inv.discount_percent ?? 0),
      notes: inv.notes || '',
      status: status as SalesDocument['status'],
      issue_date: inv.issueDate || inv.issue_date || new Date().toISOString().slice(0, 10),
      due_date: inv.dueDate || inv.due_date || new Date().toISOString().slice(0, 10),
      created_at: inv.createdAt || inv.created_at || new Date().toISOString(),
    }
  })

  const documents = [...orders, ...invoices]

  const payments: Payment[] = (raw.payments || []).map((p: any) => {
    let method = 'Mobile Money'
    if (p.paymentMethod === 'cash') method = 'Cash'
    else if (p.paymentMethod === 'bank_transfer') method = 'Bank transfer'
    else if (p.paymentMethod === 'card') method = 'Card'
    else if (p.method) method = p.method

    return {
      id: p.id || makeId('pay'),
      document_id: p.invoiceId || p.document_id,
      number: sanitizeSequence(p.receiptNumber || p.number || 'RCT-2026-0100'),
      paid_at: p.paymentDate || p.paid_at || new Date().toISOString().slice(0, 10),
      amount: Number(p.amount || 0),
      method: method as Payment['method'],
      reference: [p.mobileMoneyNetwork, p.reference].filter(Boolean).join(' - ') || p.reference || '',
      created_at: p.createdAt || p.created_at || new Date().toISOString(),
    }
  })

  return {
    settings,
    customers,
    catalog,
    documents,
    payments,
  }
}

/**
 * Exports current store into standardized JSON file
 */
export function exportBackup(store: Store): string {
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    businessProfile: {
      name: store.settings.name,
      tagline: store.settings.tagline,
      phone: store.settings.phone,
      address: store.settings.address,
      email: store.settings.email,
      website: store.settings.website,
      notes: store.settings.default_notes,
      defaultCurrency: 'UGX',
    },
    activeCurrency: 'UGX',
    customers: store.customers,
    products: store.catalog,
    orders: store.documents.filter(d => d.type === 'quotation'),
    invoices: store.documents.filter(d => d.type === 'invoice'),
    payments: store.payments,
  }
  return JSON.stringify(exportPayload, null, 2)
}

function readLocal(): Store {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        ...initialBackupStore,
        ...parsed,
        documents: (parsed.documents || []).map((d: SalesDocument) => ({
          ...d,
          number: sanitizeSequence(d.number),
        })),
        payments: (parsed.payments || []).map((p: Payment) => ({
          ...p,
          number: sanitizeSequence(p.number),
        })),
        settings: { ...initialBackupStore.settings, ...(parsed.settings || {}) },
      }
    }

    // Check if older version exists to migrate or initialize fresh with official backup
    for (const oldKey of OLD_KEYS) {
      const oldSaved = localStorage.getItem(oldKey)
      if (oldSaved) {
        try {
          const parsedOld = JSON.parse(oldSaved)
          // If the old data only had demo dummy records, upgrade to official backup
          const isDummy = parsedOld.customers?.some((c: any) => c.name === 'Timothy Kato' || c.id === 'customer-1')
          if (!isDummy && parsedOld.customers?.length) {
            const migrated: Store = {
              ...initialBackupStore,
              ...parsedOld,
              documents: (parsedOld.documents || []).map((d: SalesDocument) => ({ ...d, number: sanitizeSequence(d.number) })),
              payments: (parsedOld.payments || []).map((p: Payment) => ({ ...p, number: sanitizeSequence(p.number) })),
            }
            localStorage.setItem(KEY, JSON.stringify(migrated))
            return migrated
          }
        } catch {
          // ignore error and proceed
        }
      }
    }

    // Save official backup store to localStorage as active database
    localStorage.setItem(KEY, JSON.stringify(initialBackupStore))
    return initialBackupStore
  } catch {
    return initialBackupStore
  }
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

  const dbStore: Store = {
    customers: customers.data ?? [],
    catalog: catalog.data ?? [],
    documents: (documents.data ?? []).map((d: any) => ({ ...d, number: sanitizeSequence(d.number) })),
    payments: (payments.data ?? []).map((p: any) => ({ ...p, number: sanitizeSequence(p.number) })),
    settings: settings.data ? { ...defaultSettings, ...settings.data } : initialBackupStore.settings,
  }

  // If database is completely empty for authenticated user, seed the official backup straight to database
  if (dbStore.customers.length === 0 && dbStore.catalog.length === 0 && dbStore.documents.length === 0) {
    try {
      await persistStore(initialBackupStore, {
        customers: [],
        catalog: [],
        documents: [],
        payments: [],
        settings: defaultSettings,
      })
      return initialBackupStore
    } catch (e) {
      console.warn('Could not auto-seed database:', e)
      return initialBackupStore
    }
  }

  return dbStore
}

export async function persistStore(store: Store, previous: Store) {
  if (!supabase) {
    localStorage.setItem(KEY, JSON.stringify(store))
    return
  }

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

    // Prevent duplicate key error on unique(owner_id, number) if an existing row has a different ID
    if (table === 'sales_documents' || table === 'payments') {
      const numbers = rows.map((r: any) => r.number).filter(Boolean)
      const currentIds = new Set(rows.map((r: any) => r.id))
      if (numbers.length) {
        const { data: existingRows } = await client.from(table)
          .select('id, number')
          .eq('owner_id', owner_id)
          .in('number', numbers)
        const conflictingIds = (existingRows || []).filter(e => !currentIds.has(e.id)).map(e => e.id)
        if (conflictingIds.length) {
          if (table === 'sales_documents') {
            await client.from('payments').delete().eq('owner_id', owner_id).in('document_id', conflictingIds)
          }
          await client.from(table).delete().eq('owner_id', owner_id).in('id', conflictingIds)
        }
      }
    }

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

export function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}
