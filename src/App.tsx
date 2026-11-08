import type * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import {
  Activity, ArrowLeft, ArrowRight, ArrowUpRight, Banknote, BookOpenText, Boxes,
  BriefcaseBusiness, CalendarDays, Check, ChevronDown, ChevronRight, CircleAlert, ClipboardList,
  Clock3, Database, Download, FileChartColumnIncreasing, FileCheck2, FileClock, FilePlus2,
  FileText, Globe2, LayoutDashboard, LogOut, Mail, MoreHorizontal, Package, Pencil, Phone, Plus,
  Printer, ReceiptText, RefreshCw, Search, Settings, ShieldCheck, Sparkles, Sun, Moon, Trash2, TrendingUp, Upload, UserRound, Users,
  WalletCards, X,
} from 'lucide-react'
import { exportBackup, initialBackupStore, isDemo, loadStore, makeId, parseBackupJson, persistStore, supabase, type Store } from './data'
import type { CatalogItem, Customer, DocumentType, LineItem, Payment, PaymentMethod, SalesDocument } from './types'
import { defaultSettings } from './types'
import { DocumentCanvas, downloadDocument, downloadStatement, totalOf } from './DocumentCanvas'

type Page = 'Overview' | 'Documents' | 'Customers' | 'Catalog' | 'Statements' | 'Settings'
type Notice = { text: string; kind?: 'error' | 'success' }
const initialStore: Store = { customers: [], catalog: [], documents: [], payments: [], settings: defaultSettings }
const money = (value: number) => `UGX ${Math.round(value).toLocaleString('en-UG')}`
const dateFmt = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
const today = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10) }
const greeting = () => { const hour = new Date().getHours(); return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening' }
function docTotal(doc: SalesDocument) { return totalOf(doc.items, doc.discount_percent) }
function isInvoice(doc: SalesDocument) { return doc.type === 'invoice' }

export default function App() {
  const [store, setStore] = useState<Store>(initialStore)
  const [page, setPage] = useState<Page>('Overview')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [authReady, setAuthReady] = useState(!supabase)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<'document' | 'customer' | 'item' | 'payment' | 'statement' | null>(null)
  const [activeDoc, setActiveDoc] = useState<SalesDocument | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null)
  const [payDoc, setPayDoc] = useState<SalesDocument | null>(null)
  const [statementCustomer, setStatementCustomer] = useState('')
  const [editingSettings, setEditingSettings] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState<'light'|'dark'>(() => (localStorage.getItem('nextone-theme') as 'light'|'dark') || 'light')
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('nextone-theme', theme) }, [theme])

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true)
    }
    const handler = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setInstallPrompt(null)
      showNotice('NexTone app installed successfully!', 'success')
    })
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const promptInstall = async () => {
    if (!installPrompt) {
      showNotice('To download/install NexTone: Open your browser menu (⋮ or Share) and choose "Add to Home screen" or "Install App".', 'success')
      return
    }
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setInstallPrompt(null)
      setIsInstalled(true)
      showNotice('NexTone app installed!', 'success')
    }
  }

  const syncStore = async (next: Store) => {
    const previous = store
    setStore(next)
    try { await persistStore(next, previous); return true }
    catch (error) {
      setStore(previous)
      const message = error instanceof Error ? error.message : (typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : 'Unknown database error')
      showNotice(`Could not save changes: ${message}`, 'error')
      return false
    }
  }
  const showNotice = (text: string, kind: 'error' | 'success' = 'success') => {
    setNotice({ text, kind }); window.setTimeout(() => setNotice(null), 3800)
  }

  useEffect(() => {
    let cancelled = false
    if (!supabase) {
      loadStore().then(data => { if (!cancelled) { setStore(data); setLoading(false) } })
      return () => { cancelled = true }
    }
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return
      setUser(data.session?.user ?? null); setAuthReady(true)
      if (data.session) try { setStore(await loadStore()) } catch (e) { showNotice(e instanceof Error ? e.message : 'Could not load your workspace.', 'error') }
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session) setStore(initialStore)
      else window.setTimeout(() => loadStore().then(setStore).catch(e => showNotice(String(e), 'error')), 0)
    })
    return () => { cancelled = true; listener.subscription.unsubscribe() }
  }, [])

  const invoices = store.documents.filter(isInvoice)
  const outstanding = invoices.reduce((sum, doc) => sum + Math.max(0, docTotal(doc) - paidFor(store.payments, doc.id)), 0)
  const currentMonth = today().slice(0, 7)
  const collected = store.payments.filter(payment => payment.paid_at.startsWith(currentMonth)).reduce((sum, payment) => sum + Number(payment.amount), 0)
  const overdueCount = invoices.filter(doc => doc.due_date < today() && docTotal(doc) > paidFor(store.payments, doc.id)).length

  const newDocument = (type: DocumentType, source?: SalesDocument, prefillCustomer?: Customer) => {
    if (source) {
      setActiveDoc({
        ...source,
        id: '',
        number: '',
        type,
        status: type === 'invoice' ? 'unpaid' : 'draft',
        issue_date: today(),
        due_date: today(),
        source_quote: source.type === 'quotation' ? source.number : undefined,
        items: source.items.map(item => ({ ...item, id: makeId('line') })),
      })
    } else if (prefillCustomer) {
      setActiveDoc({
        id: '',
        number: '',
        type,
        customer_id: prefillCustomer.id,
        customer_name: prefillCustomer.name,
        customer_phone: prefillCustomer.phone,
        customer_email: prefillCustomer.email,
        customer_address: prefillCustomer.address,
        items: [{ id: makeId('line'), description: '', quantity: 1, unit: 'piece', unit_price: 0 }],
        discount_percent: 0,
        notes: store.settings.default_notes,
        status: type === 'invoice' ? 'unpaid' : 'draft',
        issue_date: today(),
        due_date: today(),
        created_at: new Date().toISOString(),
      })
    } else {
      setActiveDoc(null)
    }
    setModal('document')
  }
  const saveDocument = async (doc: Omit<SalesDocument, 'id' | 'number' | 'created_at'> & Partial<Pick<SalesDocument, 'id' | 'number' | 'created_at'>>) => {
    const existing = Boolean(doc.id)
    const row: SalesDocument = { ...doc, id: doc.id || makeId('doc'), number: doc.number || nextNumber(doc.type, store), created_at: doc.created_at || new Date().toISOString() } as SalesDocument
    const docs = existing ? store.documents.map(current => current.id === row.id ? row : current) : [row, ...store.documents]
    let payments = store.payments
    if (!existing && row.type === 'invoice' && row.status === 'paid') payments = [...payments, { id: makeId('pay'), document_id: row.id, number: nextReceiptNumber(store.payments), paid_at: today(), amount: docTotal(row), method: 'Other', reference: 'Paid on creation', created_at: new Date().toISOString() }]
    if (!await syncStore({ ...store, documents: docs, payments })) return
    if (activeDoc?.source_quote) {
      const quote = docs.find(current => current.number === activeDoc.source_quote)
      if (quote && !await syncStore({ ...store, documents: docs.map(current => current.id === quote.id ? { ...current, status: 'converted' } : current), payments })) return
    }
    setModal(null); setActiveDoc(null); showNotice(`${row.type === 'invoice' ? 'Invoice' : 'Quotation'} ${existing ? 'updated' : 'created'} successfully.`)
  }
  const deleteDocument = async (doc: SalesDocument) => {
    if (!window.confirm(`Delete ${doc.number}? This also deletes its receipts.`)) return
    if (!await syncStore({ ...store, documents: store.documents.filter(row => row.id !== doc.id), payments: store.payments.filter(row => row.document_id !== doc.id) })) return
    setActiveDoc(null); showNotice('Document deleted.')
  }
  const saveCustomer = async (row: Customer) => {
    const rows = store.customers.some(x => x.id === row.id) ? store.customers.map(x => x.id === row.id ? row : x) : [row, ...store.customers]
    if (!await syncStore({ ...store, customers: rows })) return
    setModal(null); setEditingCustomer(null); showNotice('Customer saved.')
  }
  const saveItem = async (row: CatalogItem) => {
    const rows = store.catalog.some(x => x.id === row.id) ? store.catalog.map(x => x.id === row.id ? row : x) : [row, ...store.catalog]
    if (!await syncStore({ ...store, catalog: rows })) return
    setModal(null); setEditingItem(null); showNotice('Catalog item saved.')
  }
  const savePayment = async (payment: Omit<Payment, 'id' | 'number' | 'created_at'>) => {
    const row: Payment = { ...payment, id: makeId('payment'), number: nextReceiptNumber(store.payments), created_at: new Date().toISOString() }
    const payments = [row, ...store.payments]
    const doc = store.documents.find(d => d.id === row.document_id)!
    const status: SalesDocument['status'] = paidFor(payments, doc.id) >= docTotal(doc) ? 'paid' : 'partial'
    const documents = store.documents.map(d => d.id === doc.id ? { ...d, status } : d)
    if (!await syncStore({ ...store, payments, documents })) return
    setModal(null); setPayDoc(null); showNotice(`Receipt ${row.number} recorded.`)
  }
  const removeCustomer = async (customer: Customer) => {
    const linked = store.documents.filter(d => d.customer_id === customer.id).length
    if (!window.confirm(linked ? `${customer.name} has ${linked} document(s). Delete the customer record? Documents will remain.` : `Delete ${customer.name}?`)) return
    if (!await syncStore({ ...store, customers: store.customers.filter(c => c.id !== customer.id) })) return
    showNotice('Customer deleted.')
  }
  const removeItem = async (item: CatalogItem) => {
    if (!window.confirm(`Delete ${item.name} from the catalog? Existing documents will keep their saved item details.`)) return
    if (!await syncStore({ ...store, catalog: store.catalog.filter(i => i.id !== item.id) })) return
    showNotice('Item removed from catalog.')
  }

  if (!authReady || loading) return (
    <div className="global-preloader">
      <div className="global-preloader-brand">
        <div className="brand-mark"><span/><span/></div>
        <strong>NexTone</strong>
      </div>
      <div className="global-spinner"/>
      <small>Loading your printing & branding workspace…</small>
    </div>
  )
  if (supabase && !user) return <><Login onNotice={showNotice} />{notice && <div className={`toast ${notice.kind === 'error' ? 'error' : ''}`}><span>{notice.kind === 'error' ? <CircleAlert size={18}/> : <Check size={18}/>}</span>{notice.text}<button onClick={() => setNotice(null)}><X size={15}/></button></div>}</>
  const nav = [
    { name: 'Overview' as Page, icon: LayoutDashboard },
    { name: 'Documents' as Page, icon: FileText, count: store.documents.length },
    { name: 'Customers' as Page, icon: Users },
    { name: 'Catalog' as Page, icon: Boxes },
    { name: 'Statements' as Page, icon: FileChartColumnIncreasing },
    { name: 'Settings' as Page, icon: Settings },
  ]
  const filteredDocs = store.documents.filter(doc => `${doc.number} ${doc.customer_name} ${doc.type} ${doc.status}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><span/><span/></div><div><strong>NexTone</strong><small>Printing & Branding</small></div><button className="icon-button sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={18}/></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="nav-list">{nav.map(item => { const Icon = item.icon; return <button className={`nav-item ${page === item.name ? 'active' : ''}`} key={item.name} onClick={() => { setPage(item.name); setSidebarOpen(false) }}><Icon size={18}/><span>{item.name}</span>{item.count !== undefined && <b>{item.count}</b>}</button> })}</nav>
      <div className="sidebar-divider"/><div className="workspace-label">PREFERENCES</div>
      <button className={`nav-item ${page === 'Settings' ? 'active' : ''}`} onClick={() => { setPage('Settings'); setSidebarOpen(false) }}><Settings size={18}/><span>Settings</span></button>
      <div className="sidebar-bottom">
        <div className="sidebar-promo"><span className="promo-icon"><Sparkles size={17}/></span><div><strong>Made for your<br/>next big idea.</strong><small>Simple tools, polished work.</small></div><ArrowUpRight size={15}/></div>
        <div className="profile-row"><div className="avatar">{user?.email?.slice(0, 1).toUpperCase() || 'N'}</div><div className="profile-meta"><strong>{user?.email || 'NexTone owner'}</strong><small>{isDemo ? 'Local preview' : 'Owner account'}</small></div>{supabase && <button className="icon-button profile-more" aria-label="Sign out" onClick={() => supabase?.auth.signOut()}><LogOut size={16}/></button>}</div>
      </div>
    </aside>
    {sidebarOpen && <button aria-label="Close menu" className="mobile-scrim" onClick={() => setSidebarOpen(false)}/>}
    <main className="main-area">
      <header className="topbar">
        <div className="top-left" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setPage('Overview')}>
          <div className="brand-mark small"><span/><span/></div>
          <strong style={{ font: '700 14px var(--font-display)', color: 'var(--ink-primary)' }}>NexTone</strong>
        </div>
        <div className="top-actions">
          {!isInstalled && (
            <button className="install-chip" onClick={promptInstall} title="Install NexTone app on this device">
              <Download size={13}/>
              <span>Install App</span>
            </button>
          )}
          <div className="today-chip">
            <CalendarDays size={15}/>
            <span>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          <button className="icon-button theme-toggle" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? <Moon size={17}/> : <Sun size={17}/>}
          </button>
          <button className="avatar top-avatar" title={user?.email || 'NexTone owner'} onClick={() => setPage('Settings')}>
            {user?.email?.slice(0, 1).toUpperCase() || 'N'}
          </button>
        </div>
      </header>
      {isDemo && <div className="demo-banner"><Sparkles size={15}/><span><strong>Preview mode</strong> — changes are saved in this browser. Connect Supabase to use your secured live workspace.</span></div>}
      <div className="page-wrap">
        {page === 'Overview' && <Overview store={store} collected={collected} outstanding={outstanding} overdueCount={overdueCount} openPage={setPage} newDocument={newDocument} openDoc={setActiveDoc} setModal={setModal} />}
        {page === 'Documents' && <DocumentsPage documents={filteredDocs} allDocuments={store.documents} payments={store.payments} settings={store.settings} query={query} setQuery={setQuery} newDocument={newDocument} openDoc={setActiveDoc} addPayment={doc => { setPayDoc(doc); setModal('payment') }} onDelete={deleteDocument} />}
        {page === 'Customers' && <CustomersPage customers={store.customers} documents={store.documents} query={query} setQuery={setQuery} create={() => { setEditingCustomer(null); setModal('customer') }} edit={customer => { setEditingCustomer(customer); setModal('customer') }} remove={removeCustomer} viewStatement={customer => { setStatementCustomer(customer.id); setModal('statement') }} newDocumentForCustomer={customer => newDocument('quotation', undefined, customer)} />}
        {page === 'Catalog' && <CatalogPage items={store.catalog} query={query} setQuery={setQuery} create={() => { setEditingItem(null); setModal('item') }} edit={item => { setEditingItem(item); setModal('item') }} remove={removeItem} />}
        {page === 'Statements' && <StatementsPage store={store} openStatement={id => { setStatementCustomer(id); setModal('statement') }} />}
        {page === 'Settings' && <SettingsPage store={store} save={next => syncStore({ ...store, settings: next })} editing={editingSettings} setEditing={setEditingSettings} notice={showNotice} syncStore={syncStore} promptInstall={promptInstall} isInstalled={isInstalled} />}
      </div>
    </main>
    <nav className="floating-nav" aria-label="Main navigation">{nav.map(item => { const Icon = item.icon; return <button key={item.name} className={`floating-nav-item ${page === item.name ? 'active' : ''}`} onClick={() => setPage(item.name)} aria-label={item.name} title={item.name}><Icon size={20}/>{item.count !== undefined && item.count > 0 && <span className="nav-badge"/>}</button> })}</nav>
    {activeDoc && !modal && <DocumentDetail document={activeDoc} store={store} close={() => setActiveDoc(null)} edit={() => { setModal('document') }} duplicate={() => newDocument(activeDoc.type, activeDoc)} convert={() => newDocument('invoice', activeDoc)} addPayment={() => { setPayDoc(activeDoc); setModal('payment') }} onDelete={() => deleteDocument(activeDoc)} />}
    {modal === 'document' && <DocumentEditor doc={activeDoc} store={store} close={() => { setModal(null); setActiveDoc(null) }} save={saveDocument} />}
    {modal === 'customer' && <CustomerEditor customer={editingCustomer} close={() => setModal(null)} save={saveCustomer} />}
    {modal === 'item' && <ItemEditor item={editingItem} close={() => setModal(null)} save={saveItem} />}
    {modal === 'payment' && payDoc && <PaymentEditor document={payDoc} payments={store.payments} close={() => { setModal(null); setPayDoc(null) }} save={savePayment} />}
    {modal === 'statement' && <StatementModal store={store} customerId={statementCustomer} close={() => setModal(null)} />}
    {notice && <div className={`toast ${notice.kind === 'error' ? 'error' : ''}`}><span>{notice.kind === 'error' ? <CircleAlert size={18}/> : <Check size={18}/>}</span>{notice.text}<button onClick={() => setNotice(null)}><X size={15}/></button></div>}
  </div>
}

function paidFor(payments: Payment[], id: string) { return payments.filter(p => p.document_id === id).reduce((sum, p) => sum + Number(p.amount), 0) }
function nextNumber(type: DocumentType, store: Store) {
  const year = new Date().getFullYear()
  const prefix = type === 'invoice' ? `INV-${year}-` : `ORD-${year}-`
  const max = store.documents.filter(d => d.number.startsWith(prefix)).reduce((acc, d) => Math.max(acc, Number(d.number.split('-').at(-1)) || 0), 0)
  const nextVal = max >= 100 ? max + 1 : 100
  return `${prefix}${String(nextVal).padStart(4, '0')}`
}
function nextReceiptNumber(payments: Payment[]) {
  const year = new Date().getFullYear()
  const prefix = `RCT-${year}-`
  const max = payments.filter(p => p.number.startsWith(prefix)).reduce((acc, p) => Math.max(acc, Number(p.number.split('-').at(-1)) || 0), 0)
  const nextVal = max >= 100 ? max + 1 : 100
  return `${prefix}${String(nextVal).padStart(4, '0')}`
}

function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action && <div className="heading-action">{action}</div>}</div>
}
function Button({ children, variant = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'secondary'|'ghost'|'danger' }) {
  return <button className={`button ${variant} ${className}`} {...props}>{children}</button>
}
function SearchBox({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="search-box"><Search size={17}/><input placeholder={placeholder} value={value} onChange={event => onChange(event.target.value)}/>{value && <button type="button" onClick={() => onChange('')} aria-label="Clear search"><X size={14}/></button>}</label>
}

function Overview({ store, collected, outstanding, overdueCount, openPage, newDocument, openDoc, setModal }: { store: Store; collected: number; outstanding: number; overdueCount: number; openPage: (page: Page) => void; newDocument: (type: DocumentType) => void; openDoc: (doc: SalesDocument) => void; setModal: (modal: 'customer'|'item'|null) => void }) {
  const invoices = store.documents.filter(isInvoice)
  const recent = store.documents.slice(0, 5)
  const totalQuotes = store.documents.filter(doc => doc.type === 'quotation').length
  const data = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(); date.setMonth(date.getMonth() - (5 - index)); const month = date.toISOString().slice(0, 7)
    const val = store.payments.filter(p => p.paid_at.startsWith(month)).reduce((sum, p) => sum + Number(p.amount), 0)
    return { label: date.toLocaleDateString('en', { month: 'short' }), value: val }
  })
  const max = Math.max(...data.map(x => x.value), 1)
  return <>
    <PageHeading eyebrow={`${new Date().toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase()}, YOUR WORKSPACE AT A GLANCE`} title={`${greeting()}, NexTone`} subtitle="Here’s what’s happening with your business today." action={<Button onClick={() => newDocument('quotation')}><Plus size={17}/> Create quotation</Button>} />
    <div className="stats-grid">
      <StatCard icon={Banknote} label="Collected this month" value={money(collected)} change="Payments received" tone="teal" onClick={() => openPage('Documents')} />
      <StatCard icon={FileCheck2} label="Outstanding balance" value={money(outstanding)} change={overdueCount ? `${overdueCount} invoice${overdueCount > 1 ? 's' : ''} overdue` : 'No overdue invoices'} tone={overdueCount ? 'rose' : 'amber'} onClick={() => openPage('Documents')} />
      <StatCard icon={ClipboardList} label="Active quotations" value={String(store.documents.filter(d => d.type === 'quotation' && !['converted'].includes(d.status)).length).padStart(2, '0')} change={`${totalQuotes} total quotations`} tone="blue" onClick={() => openPage('Documents')} />
      <StatCard icon={Users} label="Total customers" value={String(store.customers.length).padStart(2, '0')} change="In your address book" tone="violet" onClick={() => openPage('Customers')} />
    </div>
    <div className="overview-grid">
      <section className="panel revenue-panel"><div className="panel-title-row"><div><div className="panel-kicker">YOUR MOMENTUM</div><h2>Revenue collected</h2></div><span className="select-static">Last 6 months <ChevronDown size={14}/></span></div><div className="revenue-total"><strong>{money(data.reduce((sum, x) => sum + x.value, 0))}</strong><span className="positive"><TrendingUp size={14}/> Payment history</span></div><div className="chart-area"><div className="chart-guides"><span>UGX {(max / 1000).toFixed(0)}k</span><span>UGX {(max / 2000).toFixed(0)}k</span><span>UGX 0</span></div><div className="bars">{data.map((entry, i) => <div className="bar-column" key={entry.label}><div className="bar-track"><div className={`bar-fill ${i === data.length - 1 ? 'bright' : ''}`} style={{ height: `${Math.max(4, entry.value / max * 100)}%` }} title={money(entry.value)} /></div><span>{entry.label}</span></div>)}</div></div></section>
      <section className="panel quick-panel"><div className="panel-title-row"><div><div className="panel-kicker">GET THINGS MOVING</div><h2>Quick actions</h2></div><span className="sparkle-dot"><Sparkles size={16}/></span></div><div className="quick-list">
        <QuickAction icon={FilePlus2} title="Create quotation" detail="Start with an estimate" onClick={() => newDocument('quotation')}/>
        <QuickAction icon={ReceiptText} title="Record a payment" detail="Issue a customer receipt" onClick={() => openPage('Documents')}/>
        <QuickAction icon={UserRound} title="Add customer" detail="Grow your address book" onClick={() => setModal('customer')}/>
        <QuickAction icon={Package} title="Add a catalog item" detail="Save a product or service" onClick={() => setModal('item')}/>
      </div></section>
    </div>
    <div className="bottom-grid">
      <section className="panel recent-panel">
        <div className="panel-title-row">
          <div><div className="panel-kicker">THE LATEST</div><h2>Recent documents</h2></div>
          <button className="text-link" onClick={() => openPage('Documents')}>View all <ArrowRight size={15}/></button>
        </div>
        {/* Desktop View */}
        <div className="table-wrap desktop-only-table">
          <table>
            <thead>
              <tr><th>DOCUMENT</th><th>CUSTOMER</th><th>DATE</th><th>AMOUNT</th><th>STATUS</th><th></th></tr>
            </thead>
            <tbody>
              {recent.map(doc => <DocumentRow key={doc.id} doc={doc} payments={store.payments} onClick={() => openDoc(doc)} />)}
            </tbody>
          </table>
        </div>
        {/* Mobile View */}
        <div className="mobile-docs-list">
          {recent.map(doc => {
            const paid = paidFor(store.payments, doc.id); const total = docTotal(doc)
            const status = isInvoice(doc) ? (paid >= total ? 'paid' : paid ? 'partial' : doc.due_date < today() ? 'overdue' : doc.status) : doc.status
            return (
              <div key={doc.id} className="mobile-doc-card" onClick={() => openDoc(doc)}>
                <div className="mobile-doc-top">
                  <div className="doc-cell">
                    <span className={`doc-type-icon ${doc.type}`}><FileText size={15}/></span>
                    <div><strong>{doc.number}</strong><small>{doc.type}</small></div>
                  </div>
                  <StatusPill status={status}/>
                </div>
                <div className="mobile-doc-body">
                  <div className="mobile-doc-customer">{doc.customer_name}</div>
                  <div className="mobile-doc-amount">{money(total)}</div>
                </div>
                <div className="mobile-doc-meta">
                  <span>{dateFmt(doc.issue_date)}</span>
                  <span style={{ color: 'var(--teal-text)', fontWeight: 600 }}>Tap to view &rarr;</span>
                </div>
              </div>
            )
          })}
        </div>
        {recent.length === 0 && <EmptyState icon={FileText} title="Nothing here yet" detail="Create your first quotation to get going."/>}
      </section>
      <section className="panel activity-panel">
        <div className="panel-title-row">
          <div><div className="panel-kicker">YOUR BUSINESS</div><h2>At a glance</h2></div>
          <Activity size={18} className="muted-icon"/>
        </div>
        <div className="business-rows">
          <BusinessMetric icon={FileText} label="Invoices issued" value={String(invoices.length).padStart(2, '0')} color="teal" onClick={() => openPage('Documents')}/>
          <BusinessMetric icon={BookOpenText} label="Quotes sent" value={String(totalQuotes).padStart(2, '0')} color="blue" onClick={() => openPage('Documents')}/>
          <BusinessMetric icon={WalletCards} label="Payments recorded" value={String(store.payments.length).padStart(2, '0')} color="green" onClick={() => openPage('Documents')}/>
          <BusinessMetric icon={Clock3} label="Waiting on payment" value={String(invoices.filter(d => docTotal(d) > paidFor(store.payments, d.id)).length).padStart(2, '0')} color="rose" onClick={() => openPage('Documents')}/>
        </div>
        <div className="activity-footer">
          <button className="text-link" onClick={() => openPage('Customers')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: 0 }}>
            <span className="activity-avatars"><i>N</i><i>T</i><i>J</i></span>
            <span>Manage {store.customers.length} customer records</span>
            <ArrowUpRight size={14}/>
          </button>
        </div>
      </section>
    </div>
  </>
}
function StatCard({ icon: Icon, label, value, change, tone, onClick }: { icon: React.ElementType; label: string; value: string; change: string; tone: string; onClick?: () => void }) {
  return <div className={`stat-card ${onClick ? 'click-row' : ''}`} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} style={{ cursor: onClick ? 'pointer' : 'default' }}>
    <div className="stat-top">
      <span className={`stat-icon ${tone}`}><Icon size={19}/></span>
      <button className="more-dot" aria-label="Open page" onClick={(e) => { e.stopPropagation(); onClick?.(); }}><ChevronRight size={18}/></button>
    </div>
    <div className="stat-label">{label}</div>
    <strong className="stat-value">{value}</strong>
    <div className={`stat-change ${tone}`}><span className="change-dot"/>{change}</div>
  </div>
}
function QuickAction({ icon: Icon, title, detail, onClick }: { icon: React.ElementType; title: string; detail: string; onClick: () => void }) { return <button className="quick-action" onClick={onClick}><span className="quick-icon"><Icon size={18}/></span><span className="quick-text"><strong>{title}</strong><small>{detail}</small></span><ArrowUpRight size={16} className="quick-arrow"/></button> }
function BusinessMetric({ icon: Icon, label, value, color, onClick }: { icon: React.ElementType; label: string; value: string; color: string; onClick?: () => void }) {
  return <div className={`business-metric ${onClick ? 'click-row' : ''}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
    <span className={`mini-icon ${color}`}><Icon size={15}/></span>
    <span>{label}</span>
    <strong>{value}</strong>
    {onClick && <ChevronRight size={13} style={{ marginLeft: '6px', color: 'var(--ink-faint)' }}/>}
  </div>
}
function DocumentRow({ doc, payments, onClick }: { doc: SalesDocument; payments: Payment[]; onClick: () => void }) {
  const paid = paidFor(payments, doc.id); const total = docTotal(doc)
  const status = isInvoice(doc) ? (paid >= total ? 'paid' : paid ? 'partial' : doc.due_date < today() ? 'overdue' : doc.status) : doc.status
  return <tr onClick={onClick} className="click-row"><td><div className="doc-cell"><span className={`doc-type-icon ${doc.type}`}><FileText size={15}/></span><span><strong>{doc.number}</strong><small>{doc.type}</small></span></div></td><td><span className="customer-name-cell">{doc.customer_name}</span></td><td><span className="date-cell">{dateFmt(doc.issue_date)}</span></td><td><strong className="amount-cell">{money(total)}</strong></td><td><StatusPill status={status}/></td><td><ChevronRight size={16} className="row-chevron"/></td></tr>
}
function StatusPill({ status }: { status: string }) { const name = status === 'sent' ? 'Sent' : status === 'converted' ? 'Converted' : status.charAt(0).toUpperCase() + status.slice(1); return <span className={`status-pill ${status}`}><i/>{name}</span> }
function EmptyState({ icon: Icon, title, detail, action }: { icon: React.ElementType; title: string; detail: string; action?: React.ReactNode }) { return <div className="empty-state"><span><Icon size={22}/></span><strong>{title}</strong><p>{detail}</p>{action}</div> }

function DocumentsPage({ documents, allDocuments, payments, settings, query, setQuery, newDocument, openDoc, addPayment, onDelete }: { documents: SalesDocument[]; allDocuments: SalesDocument[]; payments: Payment[]; settings: Store['settings']; query: string; setQuery: (q: string) => void; newDocument: (type: DocumentType) => void; openDoc: (doc: SalesDocument) => void; addPayment: (doc: SalesDocument) => void; onDelete: (doc: SalesDocument) => void }) {
  const [tab, setTab] = useState('All documents')
  const [pageNumber, setPageNumber] = useState(1)
  const pageSize = 8

  const tabs = ['All documents', 'Quotations', 'Invoices']
  const filtered = documents.filter(doc => tab === 'All documents' || (tab === 'Quotations' ? doc.type === 'quotation' : doc.type === 'invoice'))
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(pageNumber, totalPages)
  const rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const quoteCount = allDocuments.filter(d => d.type === 'quotation').length
  const invoiceCount = allDocuments.filter(d => d.type === 'invoice').length
  const outstandingTotal = allDocuments.filter(isInvoice).reduce((sum, d) => sum + Math.max(0, docTotal(d) - paidFor(payments, d.id)), 0)

  return <><PageHeading eyebrow="SALES & PAPERWORK" title="Documents" subtitle="Create quotations, track invoices, and keep every customer receipt in one place." action={<div className="split-action"><Button variant="secondary" onClick={() => newDocument('invoice')}><Plus size={16}/> Invoice</Button><Button onClick={() => newDocument('quotation')}><Plus size={16}/> New quotation</Button></div>}/>
    <div className="document-stats">
      <div className="click-row" onClick={() => { setTab('Quotations'); setPageNumber(1); }} style={{ cursor: 'pointer' }}><span className="round-mini teal"><FileText size={17}/></span><span>Quotations</span><strong>{quoteCount}</strong></div>
      <div className="click-row" onClick={() => { setTab('Invoices'); setPageNumber(1); }} style={{ cursor: 'pointer' }}><span className="round-mini blue"><ReceiptText size={17}/></span><span>Invoices</span><strong>{invoiceCount}</strong></div>
      <div><span className="round-mini amber"><Clock3 size={17}/></span><span>Outstanding</span><strong>{money(outstandingTotal)}</strong></div>
    </div>
    <section className="panel content-panel">
      <div className="list-toolbar">
        <div className="tabs">
          {tabs.map(name => (
            <button className={tab === name ? 'selected' : ''} key={name} onClick={() => { setTab(name); setPageNumber(1); }}>
              {name}
              <span>{name === 'Quotations' ? quoteCount : name === 'Invoices' ? invoiceCount : allDocuments.length}</span>
            </button>
          ))}
        </div>
        <SearchBox value={query} onChange={q => { setQuery(q); setPageNumber(1); }} placeholder="Search by number, name, or status"/>
      </div>
      {/* Desktop View */}
      <div className="table-wrap full-table desktop-only-table">
        <table>
          <thead>
            <tr>
              <th>DOCUMENT</th><th>CUSTOMER</th><th>DATE</th><th>DUE DATE</th><th>AMOUNT</th><th>STATUS</th><th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(doc => {
              const paid = paidFor(payments, doc.id)
              const status = isInvoice(doc) ? (paid >= docTotal(doc) ? 'paid' : paid ? 'partial' : doc.due_date < today() ? 'overdue' : doc.status) : doc.status
              return <tr key={doc.id} className="click-row">
                <td onClick={() => openDoc(doc)}><div className="doc-cell"><span className={`doc-type-icon ${doc.type}`}><FileText size={15}/></span><span><strong>{doc.number}</strong><small>{doc.type}</small></span></div></td>
                <td onClick={() => openDoc(doc)}><span className="customer-name-cell">{doc.customer_name}</span></td>
                <td onClick={() => openDoc(doc)}><span className="date-cell">{dateFmt(doc.issue_date)}</span></td>
                <td onClick={() => openDoc(doc)}><span className="date-cell">{isInvoice(doc) ? dateFmt(doc.due_date) : '—'}</span></td>
                <td onClick={() => openDoc(doc)}><strong className="amount-cell">{money(docTotal(doc))}</strong></td>
                <td onClick={() => openDoc(doc)}><StatusPill status={status}/></td>
                <td>
                  <div className="row-actions">
                    {isInvoice(doc) && paid < docTotal(doc) && <button title="Record payment" onClick={() => addPayment(doc)}><WalletCards size={16}/></button>}
                    <button title="Download PDF" onClick={async () => downloadDocument(doc, payments, settings, 'pdf')}><Download size={16}/></button>
                    <button title="Download PNG" onClick={async () => downloadDocument(doc, payments, settings, 'png')}><Printer size={16}/></button>
                    <button title="Delete" onClick={() => onDelete(doc)}><Trash2 size={15}/></button>
                  </div>
                </td>
              </tr>
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="mobile-docs-list">
        {rows.map(doc => {
          const paid = paidFor(payments, doc.id)
          const status = isInvoice(doc) ? (paid >= docTotal(doc) ? 'paid' : paid ? 'partial' : doc.due_date < today() ? 'overdue' : doc.status) : doc.status
          return (
            <div key={doc.id} className="mobile-doc-card" onClick={() => openDoc(doc)}>
              <div className="mobile-doc-top">
                <div className="doc-cell">
                  <span className={`doc-type-icon ${doc.type}`}><FileText size={16}/></span>
                  <div><strong>{doc.number}</strong><small>{doc.type}</small></div>
                </div>
                <StatusPill status={status}/>
              </div>
              <div className="mobile-doc-body">
                <div className="mobile-doc-customer">{doc.customer_name}</div>
                <div className="mobile-doc-amount">{money(docTotal(doc))}</div>
              </div>
              <div className="mobile-doc-meta">
                <span>Issued: {dateFmt(doc.issue_date)}</span>
                {isInvoice(doc) && <span>Due: {dateFmt(doc.due_date)}</span>}
              </div>
              <div className="mobile-doc-actions" onClick={e => e.stopPropagation()}>
                {isInvoice(doc) && paid < docTotal(doc) && (
                  <button className="button secondary" style={{ height: '30px', fontSize: '11px', padding: '0 8px' }} onClick={() => addPayment(doc)}>
                    <WalletCards size={14}/> Pay
                  </button>
                )}
                <button className="button secondary" style={{ height: '30px', fontSize: '11px', padding: '0 8px' }} title="Download PDF" onClick={() => downloadDocument(doc, payments, settings, 'pdf')}>
                  <Download size={13}/> PDF
                </button>
                <button className="button secondary" style={{ height: '30px', fontSize: '11px', padding: '0 8px' }} title="Download PNG" onClick={() => downloadDocument(doc, payments, settings, 'png')}>
                  <Printer size={13}/> PNG
                </button>
                <button className="icon-button" title="Delete" onClick={() => onDelete(doc)}>
                  <Trash2 size={15}/>
                </button>
              </div>
            </div>
          )
        })}
      </div>
      {filtered.length === 0 && <EmptyState icon={FileClock} title={query ? 'No matches found' : 'No documents yet'} detail={query ? 'Try a different search.' : 'Create your first quotation or invoice to see it here.'}/>}
      <div className="table-footer">
        <span>Showing <strong>{rows.length}</strong> of <strong>{filtered.length}</strong> {filtered.length === 1 ? 'document' : 'documents'}</span>
        <span className="pagination">
          <button disabled={currentPage <= 1} onClick={() => setPageNumber(p => Math.max(1, p - 1))} aria-label="Previous page"><ArrowLeft size={14}/></button>
          <span className="page-number" style={{ padding: '0 8px', display: 'flex', alignItems: 'center', borderRadius: 'var(--radius-sm)', background: 'var(--accent-teal-bg)', color: 'var(--accent-teal-text)', fontSize: '11px', fontWeight: 700 }}>{currentPage} / {totalPages}</span>
          <button disabled={currentPage >= totalPages} onClick={() => setPageNumber(p => Math.min(totalPages, p + 1))} aria-label="Next page"><ArrowRight size={14}/></button>
        </span>
      </div>
    </section>
  </>
}

function CustomersPage({ customers, documents, query, setQuery, create, edit, remove, viewStatement, newDocumentForCustomer }: { customers: Customer[]; documents: SalesDocument[]; query: string; setQuery: (q: string) => void; create: () => void; edit: (customer: Customer) => void; remove: (customer: Customer) => void; viewStatement: (customer: Customer) => void; newDocumentForCustomer: (customer: Customer) => void }) {
  const filtered = customers.filter(c => `${c.name} ${c.phone} ${c.email} ${c.address}`.toLowerCase().includes(query.toLowerCase()))
  return <><PageHeading eyebrow="PEOPLE MAKE THE WORK" title="Customers" subtitle="A thoughtful little address book for everyone you work with." action={<Button onClick={create}><Plus size={17}/> Add customer</Button>}/><div className="list-summary-row"><div className="list-summary"><span className="round-mini violet"><Users size={17}/></span><div><strong>{customers.length} customers</strong><small>Contacts saved in your workspace</small></div></div><SearchBox value={query} onChange={setQuery} placeholder="Search customers"/></div>
    {filtered.length ? <div className="customers-grid">{filtered.map((customer, index) => { const docs = documents.filter(d => d.customer_id === customer.id); const tint = ['mint', 'lavender', 'peach', 'sky'][index % 4]; return <article className="customer-card" key={customer.id}><div className="customer-card-top"><div className={`customer-avatar ${tint}`}>{customer.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}</div><button className="icon-button" aria-label="Edit customer" onClick={() => edit(customer)}><Pencil size={15}/></button></div><h3>{customer.name}</h3><div className="customer-contact"><span><Phone size={14}/>{customer.phone || 'No phone provided'}</span><span><Mail size={14}/>{customer.email || 'No email provided'}</span><span><Globe2 size={14}/>{customer.address || 'No address provided'}</span></div><div className="customer-card-footer"><span>{docs.length} document{docs.length !== 1 ? 's' : ''}</span><div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><button className="text-link" onClick={() => newDocumentForCustomer(customer)}>+ Quote</button><button className="text-link" onClick={() => viewStatement(customer)}>Statement <ArrowUpRight size={14}/></button><button className="icon-button remove-customer" aria-label="Delete customer" onClick={() => remove(customer)}><Trash2 size={14}/></button></div></div></article> })}</div> : <section className="panel"><EmptyState icon={Users} title={query ? 'No customers found' : 'Your customer list is ready'} detail={query ? 'Try another name or search term.' : 'Add your first customer to start creating quotations and invoices.'} action={<Button onClick={create}><Plus size={16}/> Add a customer</Button>}/></section>}
  </>
}

function CatalogPage({ items, query, setQuery, create, edit, remove }: { items: CatalogItem[]; query: string; setQuery: (q: string) => void; create: () => void; edit: (item: CatalogItem) => void; remove: (item: CatalogItem) => void }) {
  const [category, setCategory] = useState('All items')
  const categories = ['All items', ...Array.from(new Set(items.map(x => x.category).filter(Boolean)))]
  const filtered = items.filter(item => (category === 'All items' || item.category === category) && `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(query.toLowerCase()))
  return <><PageHeading eyebrow="YOUR PRODUCTS & SERVICES" title="Catalog" subtitle="Keep your go-to printing and branding prices close at hand." action={<Button onClick={create}><Plus size={17}/> Add an item</Button>}/><div className="list-summary-row"><div className="list-summary"><span className="round-mini teal"><Boxes size={17}/></span><div><strong>{items.length} catalog items</strong><small>Pricing is copied onto each new document</small></div></div><SearchBox value={query} onChange={setQuery} placeholder="Search catalog"/></div>
    <div className="tabs category-tabs">{categories.map(value => <button key={value} className={category === value ? 'selected' : ''} onClick={() => setCategory(value)}>{value}<span>{value === 'All items' ? items.length : items.filter(i => i.category === value).length}</span></button>)}</div>
    {filtered.length ? <div className="catalog-grid">{filtered.map((item, index) => <article className="catalog-card" key={item.id}><div className="catalog-card-top"><span className={`catalog-icon tone-${index % 4}`}><Package size={19}/></span><span className="category-label">{item.category || 'Other'}</span><div className="catalog-actions"><button aria-label="Edit item" onClick={() => edit(item)}><Pencil size={14}/></button><button aria-label="Delete item" onClick={() => remove(item)}><Trash2 size={14}/></button></div></div><h3>{item.name}</h3><p>{item.description || 'No description added'}</p><div className="catalog-price"><strong>{money(item.price)}</strong><span>per {item.unit}</span></div></article>)}</div> : <section className="panel"><EmptyState icon={Package} title="No catalog items found" detail="Add a product or service you offer, and it’ll be ready to use on your next document." action={<Button onClick={create}><Plus size={16}/> Add an item</Button>}/></section>}
  </>
}

function StatementsPage({ store, openStatement }: { store: Store; openStatement: (id: string) => void }) {
  const customers = store.customers.filter(c => store.documents.some(d => d.customer_id === c.id && isInvoice(d)))
  const aggregate = customers.map(customer => {
    const invoices = store.documents.filter(d => d.customer_id === customer.id && isInvoice(d))
    const total = invoices.reduce((sum, d) => sum + docTotal(d), 0)
    const paid = invoices.reduce((sum, d) => sum + paidFor(store.payments, d.id), 0)
    return { customer, invoices, total, paid, balance: Math.max(0, total - paid) }
  })
  return (
    <>
      <PageHeading eyebrow="CLEAR & FRIENDLY ACCOUNTING" title="Customer statements" subtitle="See what has been invoiced, paid, and remains outstanding."/>
      <section className="panel content-panel">
        <div className="table-wrap full-table desktop-only-table">
          <table>
            <thead>
              <tr><th>CUSTOMER</th><th>INVOICES</th><th>AMOUNT INVOICED</th><th>AMOUNT PAID</th><th>BALANCE DUE</th><th></th></tr>
            </thead>
            <tbody>
              {aggregate.map(({ customer, invoices, total, paid, balance }) => (
                <tr key={customer.id} className="click-row" onClick={() => openStatement(customer.id)}>
                  <td>
                    <div className="doc-cell">
                      <span className="customer-avatar mini-avatar mint">{customer.name.slice(0, 1)}</span>
                      <span><strong>{customer.name}</strong><small>{customer.phone}</small></span>
                    </div>
                  </td>
                  <td>{invoices.length}</td>
                  <td>{money(total)}</td>
                  <td className="green-text">{money(paid)}</td>
                  <td className={balance ? 'rose-text' : 'green-text'}>{money(balance)}</td>
                  <td>
                    <button className="icon-button" onClick={e => { e.stopPropagation(); openStatement(customer.id) }} title="Open statement">
                      <ArrowUpRight size={17}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="mobile-docs-list">
          {aggregate.map(({ customer, invoices, total, paid, balance }) => (
            <div key={customer.id} className="mobile-doc-card" onClick={() => openStatement(customer.id)}>
              <div className="mobile-doc-top">
                <div className="doc-cell">
                  <span className="customer-avatar mini-avatar mint">{customer.name.slice(0, 1)}</span>
                  <div>
                    <strong>{customer.name}</strong>
                    <small>{invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'}</small>
                  </div>
                </div>
                <span className={`status-pill ${balance === 0 ? 'paid' : 'partial'}`}>
                  <i/>{balance === 0 ? 'Settled' : 'Due'}
                </span>
              </div>
              <div className="mobile-doc-body">
                <div style={{ display: 'grid', gap: '2px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--ink-muted)' }}>Invoiced: {money(total)}</span>
                  <span style={{ fontSize: '10px', color: 'var(--accent-teal-text)' }}>Paid: {money(paid)}</span>
                </div>
                <div className="mobile-doc-amount" style={{ color: balance > 0 ? 'var(--accent-rose-text)' : 'var(--accent-teal-text)' }}>
                  {money(balance)}
                </div>
              </div>
              <div className="mobile-doc-actions" onClick={e => e.stopPropagation()}>
                <button className="button secondary" style={{ height: '30px', fontSize: '11px', padding: '0 10px', width: '100%' }} onClick={() => openStatement(customer.id)}>
                  View Statement <ArrowUpRight size={14}/>
                </button>
              </div>
            </div>
          ))}
        </div>
        {aggregate.length === 0 && <EmptyState icon={FileChartColumnIncreasing} title="No invoice activity" detail="Create an invoice and its customer will appear here."/>}
      </section>
    </>
  )
}

function SettingsPage({ store, save, editing, setEditing, notice, syncStore, promptInstall, isInstalled }: { store: Store; save: (next: Store['settings']) => Promise<boolean>; editing: boolean; setEditing: (editing: boolean) => void; notice: (text: string, kind?: 'error'|'success') => void; syncStore: (next: Store) => Promise<boolean>; promptInstall: () => void; isInstalled: boolean }) {
  const [form, setForm] = useState(store.settings)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setForm(store.settings), [store.settings])
  const change = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }))
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!await save(form)) return; setEditing(false); notice('Company details updated.') }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        setIsProcessing(true)
        const text = String(event.target?.result || '')
        const imported = parseBackupJson(text)
        const success = await syncStore(imported)
        if (success) {
          notice(`Imported ${imported.customers.length} customers, ${imported.catalog.length} catalog items, and ${imported.documents.length} documents directly to database!`, 'success')
        }
      } catch (err) {
        notice(err instanceof Error ? err.message : 'Invalid backup JSON file', 'error')
      } finally {
        setIsProcessing(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  const handleResetToOfficialBackup = async () => {
    if (!window.confirm('Restore database from the official backup (Mr. Timothy, John k, Mr. Setimba, 14 products, ORD-2026-0100, INV-2026-0100, INV-2026-0101)? This will sync directly into the database.')) {
      return
    }
    try {
      setIsProcessing(true)
      const success = await syncStore(initialBackupStore)
      if (success) {
        notice('Database successfully synchronized with official backup records!', 'success')
      }
    } catch (err) {
      notice(err instanceof Error ? err.message : 'Could not restore backup', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  return <>
    <PageHeading eyebrow="MAKE IT YOURS" title="Settings" subtitle="Your business details show up on quotations, invoices, receipts, and statements." action={editing ? <Button variant="secondary" onClick={() => { setForm(store.settings); setEditing(false) }}><X size={16}/> Cancel</Button> : <Button onClick={() => setEditing(true)}><Pencil size={16}/> Edit details</Button>}/>
    <form className="settings-layout" onSubmit={submit}>
      <section className="panel settings-card">
        <div className="settings-card-head">
          <span className="round-mini teal"><BriefcaseBusiness size={17}/></span>
          <div>
            <strong>Business identity</strong>
            <small>The public face of your brand on every document.</small>
          </div>
        </div>
        <div className="settings-fields">
          <Field label="Company name" value={form.name} disabled={!editing} onChange={value => change('name', value)} required/>
          <Field label="Tagline" value={form.tagline} disabled={!editing} onChange={value => change('tagline', value)}/>
          <Field label="Phone number" value={form.phone} disabled={!editing} onChange={value => change('phone', value)} icon={Phone}/>
          <Field label="Email address" value={form.email} disabled={!editing} onChange={value => change('email', value)} icon={Mail} type="email"/>
          <Field label="Website" value={form.website} disabled={!editing} onChange={value => change('website', value)} icon={Globe2}/>
          <Field label="Business address" value={form.address} disabled={!editing} onChange={value => change('address', value)} wide/>
          <Field label="Logo image URL" value={form.logo_url} disabled={!editing} onChange={value => change('logo_url', value)} wide hint="Paste a public image URL to show your logo on documents."/>
          <Field label="Default document note" value={form.default_notes} disabled={!editing} onChange={value => change('default_notes', value)} wide textarea/>
        </div>
        {editing && <div className="settings-footer">
          <span><ShieldCheck size={15}/> Only your owner account can manage these settings.</span>
          <Button type="submit"><Check size={16}/> Save changes</Button>
        </div>}
      </section>

      <aside className="panel preview-card">
        <div className="preview-kicker">DOCUMENT PREVIEW</div>
        <div className="preview-sheet">
          <div className="preview-orb"/>
          <div className="preview-brand">
            <span className="brand-mark small"><span/><span/></span>
            <span><strong>{form.name || 'NexTone'}</strong><small>{form.tagline || 'Printing & Branding'}</small></span>
          </div>
          <div className="preview-label">INVOICE</div>
          <div className="preview-number">#INV-2026-0100</div>
          <div className="preview-date">06/11/2026</div>
          <div className="preview-rule"/>
          <strong className="preview-title">Made with care,<br/>just for you.</strong>
          <p>{form.default_notes}</p>
          <div className="preview-footer">{form.website || 'nextone.ug'} <span>·</span> {form.phone || '+256 756 286 160'}</div>
        </div>
        <p className="preview-help">Your company details and notes appear at the bottom of every NexTone document.</p>
      </aside>
    </form>

    <section className="panel database-card" style={{ marginTop: '20px', padding: '24px' }}>
      <div className="settings-card-head" style={{ marginBottom: '18px' }}>
        <span className="round-mini teal"><Database size={18}/></span>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong style={{ fontSize: '15px' }}>Database & Workspace Data</strong>
            <span className="status-pill active" style={{ fontSize: '10.5px', padding: '2px 8px' }}>
              <i/> {isDemo ? 'Local Database Storage' : 'Supabase PostgreSQL'}
            </span>
          </div>
          <small>Manage business records straight in the active database. Import, re-sync official data, or export anytime.</small>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Customers</span>
          <strong style={{ fontSize: '20px', color: 'var(--ink-primary)', display: 'block', marginTop: '2px' }}>{store.customers.length}</strong>
          <small style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Mr. Timothy, John k, etc.</small>
        </div>
        <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Catalog Items</span>
          <strong style={{ fontSize: '20px', color: 'var(--ink-primary)', display: 'block', marginTop: '2px' }}>{store.catalog.length}</strong>
          <small style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>14 products with UGX prices</small>
        </div>
        <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Documents</span>
          <strong style={{ fontSize: '20px', color: 'var(--ink-primary)', display: 'block', marginTop: '2px' }}>{store.documents.length}</strong>
          <small style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>1 Quote · 2 Invoices</small>
        </div>
        <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Payments & Receipts</span>
          <strong style={{ fontSize: '20px', color: 'var(--ink-primary)', display: 'block', marginTop: '2px' }}>{store.payments.length}</strong>
          <small style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>UGX 90,000 + 40,000</small>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
          <Upload size={16}/> Import Backup (.json)
        </Button>
        <Button variant="secondary" onClick={handleResetToOfficialBackup} disabled={isProcessing}>
          <RefreshCw size={16}/> Re-sync Official Backup
        </Button>
        <Button variant="secondary" onClick={() => { exportBackup(store); notice('Exported complete backup file!', 'success') }}>
          <Download size={16}/> Export Backup (.json)
        </Button>
      </div>

      <div style={{ marginTop: '16px', padding: '12px 14px', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: 'var(--ink-muted)' }}>
        <ShieldCheck size={16} style={{ color: 'var(--teal-text)', flexShrink: 0 }}/>
        <span>
          <strong>Direct Database Storage:</strong> All changes are written directly to database tables (customers, catalog_items, sales_documents, payments, company_settings). A ready-to-run PostgreSQL seed script is also available at <code>supabase/seed_backup_data.sql</code>.
        </span>
      </div>
    </section>

    <section className="panel pwa-install-card" style={{ marginTop: '20px', padding: '24px' }}>
      <div className="settings-card-head" style={{ marginBottom: '16px' }}>
        <span className="round-mini blue"><Download size={18}/></span>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong style={{ fontSize: '15px' }}>Progressive Web App (PWA)</strong>
            <span className={`status-pill ${isInstalled ? 'paid' : 'active'}`} style={{ fontSize: '10.5px', padding: '2px 8px' }}>
              <i/> {isInstalled ? 'Installed as App' : 'Downloadable Ready'}
            </span>
          </div>
          <small>Install NexTone on your phone, tablet, or desktop to launch directly from your home screen with fast offline caching.</small>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <Button variant="secondary" onClick={promptInstall}>
          <Download size={16}/> {isInstalled ? 'Re-install / Launch App' : 'Download & Install NexTone App'}
        </Button>
        <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
          Works across Chrome, Safari (Add to Home Screen), Android, iOS, Windows & Mac.
        </span>
      </div>
    </section>
  </>
}

function Field({ label, value, onChange, placeholder, type = 'text', disabled, required, icon: Icon, wide, hint, textarea, min, max, step }: { label: string; value: string | number; onChange: (value: string) => void; placeholder?: string; type?: string; disabled?: boolean; required?: boolean; icon?: React.ElementType; wide?: boolean; hint?: string; textarea?: boolean; min?: number; max?: number; step?: number }) { return <label className={`field ${wide ? 'wide' : ''}`}><span>{label}</span><div className={`field-input ${Icon ? 'with-icon' : ''}`}>{Icon && <Icon size={15}/ >}{textarea ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} required={required}/> : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type} disabled={disabled} required={required} min={min} max={max} step={step}/>}</div>{hint && <small className="field-hint">{hint}</small>}</label> }

function Dialog({ title, subtitle, close, children, wide = false }: { title: string; subtitle?: string; close: () => void; children: React.ReactNode; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close() }}><div className={`dialog ${wide ? 'wide-dialog' : ''}`} role="dialog" aria-modal="true"><div className="dialog-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" onClick={close} aria-label="Close dialog"><X size={19}/></button></div>{children}</div></div>
}

function CustomerEditor({ customer, close, save }: { customer: Customer|null; close: () => void; save: (customer: Customer) => void }) {
  const [form, setForm] = useState({ name: customer?.name || '', phone: customer?.phone || '', email: customer?.email || '', address: customer?.address || '' })
  const submit = (event: React.FormEvent) => { event.preventDefault(); save({ ...form, id: customer?.id || makeId('customer'), created_at: customer?.created_at || new Date().toISOString() }) }
  return <Dialog title={customer ? 'Edit customer' : 'Add a customer'} subtitle="A little detail goes a long way." close={close}><form onSubmit={submit} className="dialog-form"><Field label="Customer name" value={form.name} onChange={name => setForm({ ...form, name })} placeholder="e.g. Acacia Studio" required/><div className="form-row"><Field label="Phone number" value={form.phone} onChange={phone => setForm({ ...form, phone })} placeholder="+256 700 000 000"/><Field label="Email address" value={form.email} onChange={email => setForm({ ...form, email })} placeholder="hello@example.com" type="email"/></div><Field label="Address" value={form.address} onChange={address => setForm({ ...form, address })} placeholder="Area, city, country"/><div className="dialog-actions"><Button variant="secondary" type="button" onClick={close}>Cancel</Button><Button type="submit"><Check size={16}/> Save customer</Button></div></form></Dialog>
}
function ItemEditor({ item, close, save }: { item: CatalogItem|null; close: () => void; save: (item: CatalogItem) => void }) {
  const [form, setForm] = useState({ name: item?.name || '', description: item?.description || '', category: item?.category || 'Printing', unit: item?.unit || 'piece', price: String(item?.price || '') })
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (Number(form.price) < 0) return; save({ ...form, id: item?.id || makeId('item'), price: Number(form.price), created_at: item?.created_at || new Date().toISOString() }) }
  return <Dialog title={item ? 'Edit catalog item' : 'Add to your catalog'} subtitle="Save a price for the next time you need it." close={close}><form onSubmit={submit} className="dialog-form"><Field label="Item name" value={form.name} onChange={name => setForm({ ...form, name })} placeholder="e.g. Business cards" required/><Field label="Short description" value={form.description} onChange={description => setForm({ ...form, description })} placeholder="Size, finish, or other useful detail"/><div className="form-row"><label className="field"><span>Category</span><select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}><option>Printing</option><option>Branding</option><option>Design</option><option>Other</option></select></label><Field label="Unit" value={form.unit} onChange={unit => setForm({ ...form, unit })} placeholder="piece, pack, sheet" required/></div><div className="form-row"><Field label="Price (UGX)" value={form.price} onChange={price => setForm({ ...form, price })} type="number" required/><div className="field"><span>Preview</span><div className="price-preview">{money(Number(form.price) || 0)} <small>per {form.unit || 'unit'}</small></div></div></div><div className="dialog-actions"><Button variant="secondary" type="button" onClick={close}>Cancel</Button><Button type="submit"><Check size={16}/> Save item</Button></div></form></Dialog>
}

function DocumentEditor({ doc, store, close, save }: { doc: SalesDocument|null; store: Store; close: () => void; save: (doc: Omit<SalesDocument, 'id'|'number'|'created_at'> & Partial<Pick<SalesDocument, 'id'|'number'|'created_at'>>) => void }) {
  const editing = Boolean(doc?.id)
  const [type, setType] = useState<DocumentType>(doc?.type || 'quotation')
  const [customerId, setCustomerId] = useState(doc?.customer_id || '')
  const [customer, setCustomer] = useState(() => store.customers.find(c => c.id === doc?.customer_id))
  const [items, setItems] = useState<LineItem[]>(doc?.items || [{ id: makeId('line'), description: '', quantity: 1, unit: 'piece', unit_price: 0 }])
  const [discount, setDiscount] = useState(String(doc?.discount_percent || 0))
  const [notes, setNotes] = useState(doc?.notes || store.settings.default_notes)
  const [issueDate, setIssueDate] = useState(doc?.issue_date || today())
  const [dueDate, setDueDate] = useState(doc?.due_date || today())
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const total = subtotal * (1 - Math.min(100, Math.max(0, Number(discount) || 0)) / 100)
  const chooseCustomer = (id: string) => { setCustomerId(id); setCustomer(store.customers.find(c => c.id === id)) }
  const updateLine = (id: string, patch: Partial<LineItem>) => setItems(rows => rows.map(row => row.id === id ? { ...row, ...patch } : row))
  const changeLineDescription = (line: LineItem, description: string) => {
    const product = store.catalog.find(item => item.name.trim().toLocaleLowerCase() === description.trim().toLocaleLowerCase())
    updateLine(line.id, product
      ? { catalog_id: product.id, description: product.name, unit: product.unit, unit_price: product.price }
      : { catalog_id: undefined, description })
  }
  const pickCatalog = (id: string, line: LineItem) => { const product = store.catalog.find(item => item.id === id); if (product) updateLine(line.id, { catalog_id: product.id, description: product.name, unit: product.unit, unit_price: product.price }) }
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!customer) return; const valid = items.filter(item => item.description.trim() && item.quantity > 0 && item.unit_price >= 0); if (!valid.length) return; save({ id: doc?.id, number: doc?.number, created_at: doc?.created_at, type, customer_id: customer.id, customer_name: customer.name, customer_phone: customer.phone, customer_email: customer.email, customer_address: customer.address, items: valid, discount_percent: Number(discount) || 0, notes, status: doc?.status || (type === 'invoice' ? 'unpaid' : 'draft'), issue_date: issueDate, due_date: dueDate, source_quote: doc?.source_quote }) }
  return <Dialog title={editing ? `Edit ${type}` : `New ${type}`} subtitle={editing ? `Update ${doc?.number} details.` : 'Put together something great for your customer.'} close={close} wide><form onSubmit={submit} className="document-form"><div className="document-type-toggle"><button type="button" className={type === 'quotation' ? 'active' : ''} onClick={() => !editing && setType('quotation')}><FileText size={16}/> Quotation</button><button type="button" className={type === 'invoice' ? 'active' : ''} onClick={() => !editing && setType('invoice')}><ReceiptText size={16}/> Invoice</button></div>
    <div className="form-row doc-meta-row"><label className="field"><span>Customer</span><select required value={customerId} onChange={event => chooseCustomer(event.target.value)}><option value="">Select a customer…</option>{store.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><Field label="Issue date" value={issueDate} onChange={setIssueDate} type="date" required/><Field label={type === 'invoice' ? 'Due date' : 'Valid until'} value={dueDate} onChange={setDueDate} type="date" required/></div>
    {!store.customers.length && <div className="inline-help"><CircleAlert size={15}/> Add a customer in Customers before creating this document.</div>}
    <div className="line-items-heading"><div><strong>Items & services</strong><small>Prices are saved on this document for your records.</small></div><span>LINE TOTAL</span></div>
    <div className="editor-lines">{items.map((line, index) => <div className="editor-line" key={line.id}><span className="line-index">{String(index + 1).padStart(2, '0')}</span><label className="field item-picker"><span>Description</span><div className="item-picker-inner"><input value={line.description} onChange={event => changeLineDescription(line, event.target.value)} placeholder="Describe an item or service" list={`catalog-${line.id}`}/><datalist id={`catalog-${line.id}`}>{store.catalog.map(product => <option key={product.id} value={product.name}/>)}</datalist>{store.catalog.length > 0 && <select aria-label="Use saved catalog item" value="" onChange={event => pickCatalog(event.target.value, line)}><option value="">Use saved</option>{store.catalog.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select>}</div></label><Field label="Qty" value={line.quantity} onChange={value => updateLine(line.id, { quantity: Number(value) })} type="number"/><Field label="Unit" value={line.unit} onChange={unit => updateLine(line.id, { unit })}/><Field label="Unit price" value={line.unit_price} onChange={value => updateLine(line.id, { unit_price: Number(value) })} type="number"/><div className="line-total">{money(line.quantity * line.unit_price)}</div><button type="button" className="line-remove" aria-label="Remove line" disabled={items.length === 1} onClick={() => setItems(items.filter(x => x.id !== line.id))}><X size={15}/></button></div>)}</div>
    <button type="button" className="add-line" onClick={() => setItems([...items, { id: makeId('line'), description: '', quantity: 1, unit: 'piece', unit_price: 0 }])}><Plus size={15}/> Add another item</button>
    <div className="document-bottom-fields"><label className="field notes-field"><span>Note to customer</span><textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="A thoughtful note makes it personal…"/></label><div className="totals-editor"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><label><span>Discount</span><span className="discount-input"><input type="number" min="0" max="100" step="0.5" value={discount} onChange={event => setDiscount(event.target.value)}/>%</span></label><div className="total-line"><span>Grand total</span><strong>{money(total)}</strong></div></div></div>
    <div className="dialog-actions"><Button variant="secondary" type="button" onClick={close}>Cancel</Button><Button type="submit" disabled={!customer || !items.some(i => i.description.trim())}><Check size={16}/>{editing ? 'Save changes' : `Create ${type}`}</Button></div>
  </form></Dialog>
}

function PaymentEditor({ document, payments, close, save }: { document: SalesDocument; payments: Payment[]; close: () => void; save: (payment: Omit<Payment, 'id'|'number'|'created_at'>) => void }) {
  const remaining = Math.max(0, docTotal(document) - paidFor(payments, document.id))
  const [amount, setAmount] = useState(String(remaining))
  const [method, setMethod] = useState<PaymentMethod>('Mobile Money')
  const [paidAt, setPaidAt] = useState(today())
  const [reference, setReference] = useState('')
  const submit = (event: React.FormEvent) => { event.preventDefault(); const numeric = Number(amount); if (numeric <= 0 || numeric > remaining) return; save({ document_id: document.id, paid_at: paidAt, amount: numeric, method, reference }) }
  return <Dialog title="Record a payment" subtitle="A receipt will be created for this payment." close={close}><form className="dialog-form" onSubmit={submit}><div className="payment-context"><span className="round-mini teal"><ReceiptText size={17}/></span><div><strong>{document.number} · {document.customer_name}</strong><small>{money(remaining)} remaining on this invoice</small></div></div><Field label="Amount received (UGX)" value={amount} onChange={setAmount} type="number" required/><div className="form-row"><Field label="Payment date" value={paidAt} onChange={setPaidAt} type="date" required/><label className="field"><span>Payment method</span><select value={method} onChange={event => setMethod(event.target.value as PaymentMethod)}>{['Cash', 'Mobile Money', 'Bank transfer', 'Card', 'Other'].map(x => <option key={x}>{x}</option>)}</select></label></div><Field label="Reference (optional)" value={reference} onChange={setReference} placeholder="Transaction ID or short note"/><div className="payment-remainder"><span>Balance after payment</span><strong>{money(Math.max(0, remaining - (Number(amount) || 0)))}</strong></div><div className="dialog-actions"><Button variant="secondary" type="button" onClick={close}>Cancel</Button><Button type="submit" disabled={!Number(amount) || Number(amount) > remaining}><ReceiptText size={16}/> Record payment</Button></div></form></Dialog>
}

function DocumentDetail({ document, store, close, edit, duplicate, convert, addPayment, onDelete }: { document: SalesDocument; store: Store; close: () => void; edit: () => void; duplicate: () => void; convert: () => void; addPayment: () => void; onDelete: () => void }) {
  const payments = store.payments.filter(p => p.document_id === document.id)
  const paid = paidFor(store.payments, document.id); const total = docTotal(document); const balance = Math.max(0, total - paid)
  const [exporting, setExporting] = useState(false)
  const exportIt = async (format: 'pdf'|'png') => { setExporting(true); try { await downloadDocument(document, store.payments, store.settings, format); } catch (e) { window.alert(e instanceof Error ? e.message : 'Could not export document.') } finally { setExporting(false) } }
  return <div className="detail-overlay"><div className="detail-panel"><div className="detail-toolbar"><button className="icon-button back-button" onClick={close}><ArrowLeft size={19}/></button><div><span className="panel-kicker">DOCUMENT DETAILS</span><div className="detail-number">{document.number}</div></div><button className="icon-button" onClick={close} aria-label="Close"><X size={19}/></button></div><div className="detail-action-row"><Button variant="secondary" onClick={() => void exportIt('pdf')} disabled={exporting}><Download size={15}/> Download PDF</Button><Button variant="secondary" onClick={() => void exportIt('png')} disabled={exporting}><Printer size={15}/> Download PNG</Button><button className="icon-button" title="More actions" onClick={duplicate}><MoreHorizontal size={20}/></button></div><div className="detail-scroll"><div className="detail-overview"><div><span className={`detail-type ${document.type}`}>{document.type}</span><h2>{document.customer_name}</h2><p>{document.customer_email || document.customer_phone}</p></div><StatusPill status={document.status}/></div><div className="detail-dates"><div><span>ISSUED</span><strong>{dateFmt(document.issue_date)}</strong></div><div><span>{document.type === 'invoice' ? 'DUE DATE' : 'VALID UNTIL'}</span><strong>{dateFmt(document.due_date)}</strong></div></div><div className="detail-items"><div className="detail-items-head"><strong>Items & services</strong><span>{document.items.length} lines</span></div>{document.items.map(item => <div className="detail-item" key={item.id}><div><strong>{item.description}</strong><small>{item.quantity} {item.unit} × {money(item.unit_price)}</small></div><strong>{money(item.quantity * item.unit_price)}</strong></div>)}</div><div className="detail-totals"><div><span>Subtotal</span><strong>{money(document.items.reduce((s, i) => s + i.quantity * i.unit_price, 0))}</strong></div>{document.discount_percent > 0 && <div><span>Discount ({document.discount_percent}%)</span><strong>−{money(document.items.reduce((s, i) => s + i.quantity * i.unit_price, 0) - total)}</strong></div>}<div className="grand"><span>Grand total</span><strong>{money(total)}</strong></div>{document.type === 'invoice' && <><div className="paid-row"><span>Paid to date</span><strong>{money(paid)}</strong></div><div className="balance-row"><span>Balance due</span><strong>{money(balance)}</strong></div></>}</div>{document.notes && <div className="detail-note"><span>NOTE</span><p>{document.notes}</p></div>}
    {document.type === 'invoice' && <div className="receipts-section"><div className="detail-items-head"><strong>Payments & receipts</strong>{balance > 0 && <button className="text-link" onClick={addPayment}><Plus size={15}/> Add payment</button>}</div>{payments.length ? payments.map(payment => <div className="receipt-row" key={payment.id}><span className="receipt-icon"><ReceiptText size={16}/></span><span><strong>{payment.number}</strong><small>{dateFmt(payment.paid_at)} · {payment.method}{payment.reference ? ` · ${payment.reference}` : ''}</small></span><strong>{money(payment.amount)}</strong><div style={{ display: 'flex', gap: '4px' }}><button className="icon-button" title="Download receipt PDF" onClick={() => downloadDocument(document, store.payments, store.settings, 'pdf', payment)}><Download size={15}/></button><button className="icon-button" title="Download receipt PNG" onClick={() => downloadDocument(document, store.payments, store.settings, 'png', payment)}><Printer size={15}/></button></div></div>) : <p className="muted-copy">No payments recorded yet.</p>}</div>}
    </div><div className="detail-footer"><div className="detail-foot-actions"><Button variant="ghost" onClick={onDelete} className="delete-button"><Trash2 size={15}/> Delete</Button><Button variant="secondary" onClick={edit}><Pencil size={15}/> Edit</Button>{document.type === 'quotation' && document.status !== 'converted' && <Button onClick={convert}><FileCheck2 size={15}/> Make invoice</Button>}{document.type === 'invoice' && balance > 0 && <Button onClick={addPayment}><WalletCards size={15}/> Record payment</Button>}</div><Button variant="ghost" onClick={duplicate}><Plus size={15}/> Duplicate</Button></div></div></div>
}

function StatementModal({ store, customerId, close }: { store: Store; customerId: string; close: () => void }) {
  const customer = store.customers.find(c => c.id === customerId)
  const docs = store.documents.filter(d => d.customer_id === customerId && d.type === 'invoice').sort((a, b) => a.issue_date.localeCompare(b.issue_date))
  const total = docs.reduce((sum, doc) => sum + docTotal(doc), 0); const paid = docs.reduce((sum, doc) => sum + paidFor(store.payments, doc.id), 0)
  const statement = { customer: customer || { id: '', name: '', phone: '', email: '', address: '' }, documents: docs, payments: store.payments, total, paid, balance: Math.max(0, total - paid), settings: store.settings }
  const [exporting, setExporting] = useState(false)

  const handleExport = async (format: 'pdf'|'png') => {
    setExporting(true)
    try {
      await downloadStatement(statement, format)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Could not export statement.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog title="Customer statement" subtitle={customer?.name || ''} close={close} wide>
      <div className="statement-preview">
        <DocumentCanvas statement={statement}/>
      </div>
      <div className="dialog-actions">
        <Button variant="secondary" onClick={close}>Close</Button>
        <Button variant="secondary" disabled={exporting} onClick={() => void handleExport('png')}>
          <Printer size={16}/> Download PNG
        </Button>
        <Button disabled={exporting} onClick={() => void handleExport('pdf')}>
          <Download size={16}/> Download PDF
        </Button>
      </div>
    </Dialog>
  )
}

function Login({ onNotice }: { onNotice: (text: string, kind?: 'error'|'success') => void }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false); const [mode, setMode] = useState<'login'|'signup'>('login')
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!supabase) return
    setLoading(true)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false); if (error) onNotice(error.message, 'error')
      return
    }
    if (password.length < 8) { setLoading(false); onNotice('Use a password with at least 8 characters.', 'error'); return }
    if (password !== confirmPassword) { setLoading(false); onNotice('The passwords do not match.', 'error'); return }
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) { onNotice(error.message, 'error'); return }
    setMode('login'); setPassword(''); setConfirmPassword('')
    onNotice(data.session ? 'Account created. You are signed in.' : 'Account created. Check your email to confirm it, then sign in.', 'success')
  }
  const signingUp = mode === 'signup'
  return <div className="login-screen"><div className="login-art"><div className="login-orbit orbit-one"/><div className="login-orbit orbit-two"/><div className="login-brand"><span className="brand-mark"><span/><span/></span><span><strong>NexTone</strong><small>Printing & Branding</small></span></div><div className="login-copy"><span className="login-tag"><Sparkles size={14}/> YOUR BUSINESS, IN GOOD HANDS</span><h1>Make every<br/><em>detail</em> count.</h1><p>From the first quote to the final receipt, keep your business moving with clarity and care.</p></div><div className="login-art-footer"><span>Thoughtfully made for the work you do.</span><span>01 — 03</span></div></div><div className="login-side"><div className="login-form-wrap"><span className="login-small">{signingUp ? 'GET STARTED' : 'WELCOME BACK'}</span><h2>{signingUp ? <>Create your<br/>NexTone account.</> : <>Sign in to your<br/>workspace.</>}</h2><p>{signingUp ? 'Create your owner account to get started.' : 'Enter your owner account details to continue.'}</p><form onSubmit={submit}><Field label="Email address" value={email} onChange={setEmail} type="email" placeholder="you@nextone.ug" required/><Field label="Password" value={password} onChange={setPassword} type="password" placeholder={signingUp ? 'At least 8 characters' : 'Your password'} required/>{signingUp && <Field label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} type="password" placeholder="Enter the password again" required/>}<Button type="submit" disabled={loading} className="login-submit">{loading ? (signingUp ? 'Creating account…' : 'Signing in…') : (signingUp ? 'Create account' : 'Sign in')} <ArrowRight size={17}/></Button></form><button className="auth-toggle-link" onClick={() => setMode(signingUp ? 'login' : 'signup')}>{signingUp ? 'Already have an account? Sign in' : 'New to NexTone? Create an account'}</button><div className="login-security"><ShieldCheck size={16}/><span>Your NexTone records are private and secure.</span></div></div><div className="login-bottom"><span>© {new Date().getFullYear()} NexTone</span><span>Printing · Branding · Good work</span></div></div></div>
}
