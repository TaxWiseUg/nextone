import { useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Mail, Phone, Globe2, CircleAlert } from 'lucide-react'
import type { Customer, LineItem, Payment, SalesDocument, CompanySettings } from './types'
import { defaultSettings } from './types'

export const totalOf = (items: LineItem[], discount: number) => Math.max(0, items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0) * (1 - Number(discount || 0) / 100))
const cash = (value: number) => `UGX ${Math.round(value).toLocaleString('en-UG')}`
const date = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
const paidFor = (payments: Payment[], id: string) => payments.filter(p => p.document_id === id).reduce((sum, payment) => sum + Number(payment.amount), 0)
const today = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10) }
export type StatementModel = { customer: Pick<Customer, 'id'|'name'|'phone'|'email'|'address'>; documents: SalesDocument[]; payments: Payment[]; total: number; paid: number; balance: number; settings: CompanySettings }

function Brand({ settings }: { settings: CompanySettings }) {
  return <div className="paper-brand"><div className="paper-logo">{settings.logo_url ? <img src={settings.logo_url} alt=""/> : <><span/><span/></>}</div><div><strong>{settings.name || 'NexTone'}</strong><small>{settings.tagline || 'Printing & Branding'}</small></div></div>
}
function PaperFooter({ settings }: { settings: CompanySettings }) {
  return <div className="paper-footer"><span><Globe2/>{settings.website || 'nextone.ug'}</span><span><Phone/>{settings.phone || '+256 756 286 160'}</span><span><Mail/>{settings.email || 'orders@nextone.ug'}</span></div>
}
function Orb() { return <div className="paper-orbit"><i/><i/><i/></div> }
function CustomerCard({ customer, label }: { customer: Pick<Customer, 'name'|'phone'|'email'|'address'>; label: string }) {
  return <div className="paper-customer"><span>{label}</span><strong>{customer.name || 'Customer'}</strong><p>{[customer.address, customer.phone, customer.email].filter(Boolean).join(' · ') || 'Customer contact details'}</p></div>
}
function ItemRows({ items }: { items: LineItem[] }) {
  return <div className="paper-lines">{items.map((item, index) => <div className="paper-line" key={item.id || index}><div><strong>{item.description}</strong><small>Qty: <b>{item.quantity}</b> ({item.unit || 'piece'}) × {cash(item.unit_price)}</small></div><strong className="paper-line-total">{cash(item.quantity * item.unit_price)}</strong></div>)}</div>
}
function StatusTag({ status, balance }: { status: string; balance: number }) {
  const value = balance <= 0 ? 'PAID' : status === 'partial' ? 'PARTIAL' : status.toUpperCase()
  return <span className={`paper-status ${value.toLowerCase()}`}>{value}</span>
}

export function DocumentCanvas({ document, payments = [], settings = defaultSettings, payment, statement }: { document?: SalesDocument; payments?: Payment[]; settings?: CompanySettings; payment?: Payment; statement?: StatementModel }) {
  const root = useRef<HTMLDivElement>(null)
  if (statement) return <div className="paper-root statement-paper" ref={root}>
    <Orb/><header className="paper-header"><Brand settings={statement.settings}/><div className="paper-doc-title"><span>STATEMENT</span><strong>#STM-{new Date().getFullYear()}-{statement.customer.name.toUpperCase().replace(/\W+/g, '').slice(0, 5) || 'ACCT'}</strong><small>{date(today())}</small></div></header>
    <CustomerCard customer={statement.customer} label="PAYABLE TO"/>
    <div className="paper-table-head"><span>INVOICE BREAKDOWN</span><span>BALANCE DUE</span></div>
    <div className="paper-statement-list">{statement.documents.length ? statement.documents.map(doc => {
      const paid = paidFor(statement.payments, doc.id); const balance = Math.max(0, totalOf(doc.items, doc.discount_percent) - paid)
      return <div className="paper-statement-invoice" key={doc.id}><div className="paper-invoice-top"><div><strong>#{doc.number}</strong><StatusTag status={doc.status} balance={balance}/><small>{date(doc.issue_date)}</small></div><div className="paper-invoice-balance"><small>BALANCE</small><strong className={balance > 0 ? 'due' : 'settled'}>{cash(balance)}</strong></div></div><p>{doc.items.map(item => `${item.description} (${item.quantity} ${item.unit})`).join(', ')}</p><div className="paper-breakdown"><div><small>TOTAL</small><strong>{cash(totalOf(doc.items, doc.discount_percent))}</strong></div><div><small>PAID</small><strong className="settled">{cash(paid)}</strong></div><div><small>BALANCE</small><strong className={balance > 0 ? 'due' : 'settled'}>{cash(balance)}</strong></div></div></div>
    }) : <div className="paper-empty">No invoices on this account yet.</div>}</div>
    <div className="paper-notes"><strong>NOTES:</strong><p>{statement.settings.default_notes}</p></div>
    <div className="paper-total-card statement-total"><div><span>TOTAL AMOUNT INVOICED</span><strong>{cash(statement.total)}</strong></div><div className="paid-summary"><span>TOTAL AMOUNT PAID</span><strong>{cash(statement.paid)}</strong></div><div className="balance-summary"><span>TOTAL OUTSTANDING BALANCE</span><strong>{cash(statement.balance)}</strong></div>{statement.balance > 0 && <div className="payment-due"><CircleAlert/> PAYMENT DUE</div>}</div>
    <PaperFooter settings={statement.settings}/>
  </div>

  if (!document) return null
  const paid = paidFor(payments, document.id)
  const balance = Math.max(0, totalOf(document.items, document.discount_percent) - paid)
  const receipt = Boolean(payment)
  const label = receipt ? 'RECEIPT' : document.type === 'quotation' ? 'QUOTATION' : 'INVOICE'
  const number = payment?.number || document.number
  const receiptPaidBefore = payment ? Math.max(0, paid - payment.amount) : 0
  return <div className={`paper-root ${receipt ? 'receipt-paper' : ''}`} ref={root}>
    <Orb/><header className="paper-header"><Brand settings={settings}/><div className="paper-doc-title"><span>{label}</span><strong>#{number}</strong><small>{date(payment?.paid_at || document.issue_date)}</small></div></header>
    <CustomerCard customer={{ name: document.customer_name, phone: document.customer_phone, email: document.customer_email, address: document.customer_address }} label={receipt ? 'PAYMENT RECEIVED FROM' : document.type === 'quotation' ? 'PREPARED FOR' : 'PAYABLE TO'}/>
    {receipt ? <><div className="paper-table-head"><span>PAYMENT RECEIPT</span><span>AMOUNT</span></div><div className="paper-receipt-card"><div className="paper-receipt-paid"><span>PAYMENT RECEIVED</span><strong>{cash(payment!.amount)}</strong></div><div className="paper-receipt-grid"><div><span>INVOICE</span><strong>#{document.number}</strong></div><div><span>PAYMENT DATE</span><strong>{date(payment!.paid_at)}</strong></div><div><span>METHOD</span><strong>{payment!.method}</strong></div>{payment!.reference && <div><span>REFERENCE</span><strong>{payment!.reference}</strong></div>}</div></div><div className="paper-total-card"><div><span>INVOICE TOTAL</span><strong>{cash(totalOf(document.items, document.discount_percent))}</strong></div><div><span>PAID BEFORE THIS RECEIPT</span><strong>{cash(receiptPaidBefore)}</strong></div><div className="paid-summary"><span>THIS PAYMENT</span><strong>{cash(payment!.amount)}</strong></div><div className="balance-summary"><span>REMAINING BALANCE</span><strong>{cash(balance)}</strong></div></div></> : <>
      <div className="paper-table-head"><span>{document.type === 'invoice' ? 'ITEMS & SERVICES' : 'ITEMS & SERVICES'}</span><span>TOTAL</span></div><ItemRows items={document.items}/>
      {document.notes && <div className="paper-notes"><strong>NOTES:</strong><p>{document.notes}</p></div>}
      <div className="paper-total-card"><div><span>SUB TOTAL</span><strong>{cash(document.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0))}</strong></div>{document.discount_percent > 0 && <div className="discount-summary"><span>DISCOUNT ({document.discount_percent}%)</span><strong>−{cash(document.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0) - totalOf(document.items, document.discount_percent))}</strong></div>}<div className="paper-grand"><span>GRAND TOTAL</span><strong>{cash(totalOf(document.items, document.discount_percent))}</strong></div>{document.type === 'invoice' && <><div className="paid-summary"><span>PAID TO DATE</span><strong>{cash(paid)}</strong></div><div className="balance-summary"><span>BALANCE DUE</span><strong>{cash(balance)}</strong></div></>}</div>
      </>}
    <PaperFooter settings={settings}/>
  </div>
}

async function renderPng(node: HTMLElement) {
  const { toPng } = await import('html-to-image')
  await document.fonts.ready
  await Promise.all(Array.from(node.querySelectorAll('img')).map(img => img.decode().catch(() => undefined)))
  const originalStyle = node.getAttribute('style') || ''
  node.style.position = 'relative'; node.style.left = '0'; node.style.top = '0'; node.style.zIndex = 'auto'; node.style.transform = 'none'; node.style.margin = '0'
  try { return await toPng(node, { width: node.scrollWidth, height: node.scrollHeight, pixelRatio: 2, backgroundColor: '#f6f4ec', cacheBust: true }) }
  finally { node.setAttribute('style', originalStyle) }
}
async function makeExport(documentData: SalesDocument | undefined, payments: Payment[], settings: CompanySettings, format: 'pdf'|'png', payment?: Payment, statement?: StatementModel) {
  const host = window.document.createElement('div'); host.className = 'export-stage'; window.document.body.appendChild(host)
  const reactRoot = createRoot(host)
  flushSync(() => reactRoot.render(documentData ? <DocumentCanvas document={documentData} payments={payments} settings={settings} payment={payment}/> : <DocumentCanvas statement={statement}/> ))
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  const node = host.querySelector<HTMLElement>('.paper-root')
  if (!node) { reactRoot.unmount(); host.remove(); throw new Error('Could not prepare the document preview.') }
  try {
    const dataUrl = await renderPng(node)
    const filename = payment ? payment.number : documentData?.number || 'customer-statement'
    if (format === 'png') { saveDataUrl(dataUrl, `${filename}.png`); return }
    const { jsPDF } = await import('jspdf')
    const image = new Image(); image.src = dataUrl; await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Could not create PDF image.')) })
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('The document preview rendered empty, so no PDF was created.')
    const canvas = window.document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Could not create PDF canvas.')
    ctx.drawImage(image, 0, 0)
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    const colors = new Set<string>()
    const stride = Math.max(1, Math.floor(Math.min(canvas.width, canvas.height) / 80))
    for (let y = stride; y < canvas.height && colors.size < 8; y += stride) {
      for (let x = stride; x < canvas.width && colors.size < 8; x += stride) {
        const offset = (y * canvas.width + x) * 4
        colors.add(`${pixels[offset]},${pixels[offset + 1]},${pixels[offset + 2]}`)
      }
    }
    if (colors.size < 4) throw new Error('The document preview appears blank. Please try exporting again.')
    const pageWidth = 210; const pageHeight = 297; const pagePixels = canvas.width * pageHeight / pageWidth
    const pageCount = Math.ceil(canvas.height / pagePixels)
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
    for (let index = 0; index < pageCount; index++) {
      if (index) pdf.addPage()
      const start = index * pagePixels; const height = Math.min(pagePixels, canvas.height - start)
      const page = window.document.createElement('canvas'); page.width = canvas.width; page.height = Math.ceil(pagePixels)
      const pageCtx = page.getContext('2d'); if (!pageCtx) continue
      pageCtx.fillStyle = '#f6f4ec'; pageCtx.fillRect(0, 0, page.width, page.height)
      pageCtx.drawImage(canvas, 0, start, canvas.width, height, 0, 0, canvas.width, height)
      pdf.addImage(page.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')
    }
    pdf.save(`${filename}.pdf`)
  } finally { reactRoot.unmount(); host.remove() }
}
function saveDataUrl(dataUrl: string, filename: string) { const link = window.document.createElement('a'); link.href = dataUrl; link.download = filename; link.click() }
export async function downloadDocument(document: SalesDocument, payments: Payment[], settings: CompanySettings, format: 'pdf'|'png' = 'pdf', payment?: Payment) {
  await makeExport(document, payments, settings, format, payment)
}
export async function downloadStatement(statement: StatementModel, format: 'pdf'|'png' = 'pdf') {
  await makeExport(undefined, statement.payments, statement.settings, format, undefined, statement)
}
