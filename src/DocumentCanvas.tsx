import { useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Mail, Phone, Globe2, AlertCircle } from 'lucide-react'
import type { Customer, LineItem, Payment, SalesDocument, CompanySettings } from './types'
import { defaultSettings } from './types'

export const totalOf = (items: LineItem[], discount: number) =>
  Math.max(0, items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0) * (1 - Number(discount || 0) / 100))

const cash = (value: number) => `UGX  ${Math.round(value).toLocaleString('en-UG')}`
const date = (value: string) => {
  if (!value) return ''
  const [y, m, d] = value.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}
const paidFor = (payments: Payment[], id: string) =>
  payments.filter(p => p.document_id === id).reduce((sum, payment) => sum + Number(payment.amount), 0)

export function formatDocumentNumber(num?: string): string {
  if (!num) return ''
  const trimmed = num.replace(/^#/, '').trim()
  const match = trimmed.match(/^(INV|ORD|RCT)-(\d{4})-(\d+)$/i)
  if (match) {
    const [, prefix, yr, seqStr] = match
    const seq = parseInt(seqStr, 10)
    if (!Number.isNaN(seq)) {
      if (seq < 100) return '' // Hide if below 100
      return `#${prefix.toUpperCase()}-${yr}-${String(seq).padStart(4, '0')}`
    }
  }
  // For statement numbers like #STM-2026-MRTIM
  if (trimmed.startsWith('STM-')) {
    return `#${trimmed}`
  }
  return `#${trimmed}`
}

export type StatementModel = {
  customer: Pick<Customer, 'id' | 'name' | 'phone' | 'email' | 'address'>
  documents: SalesDocument[]
  payments: Payment[]
  total: number
  paid: number
  balance: number
  settings: CompanySettings
}

function CornerDecorTop() {
  return (
    <svg className="paper-corner-top" viewBox="0 0 340 260" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M60 0C110 90 200 160 340 180V0H60Z" fill="#d7ece4" opacity="0.65" />
      <path d="M120 0C155 80 230 145 340 160V0H120Z" fill="#0d5660" />
    </svg>
  )
}

function CornerDecorBottom() {
  return (
    <svg className="paper-corner-bottom" viewBox="0 0 240 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 200C0 110 70 50 200 40L0 0V200Z" fill="#30a49f" opacity="0.8" />
      <path d="M0 200C0 135 50 85 150 70L0 25V200Z" fill="#0d5660" />
    </svg>
  )
}

function Brand({ settings }: { settings: CompanySettings }) {
  return (
    <div className="paper-brand">
      <div className="paper-logo">
        {settings.logo_url ? (
          <img src={settings.logo_url} alt="" />
        ) : (
          <>
            <span className="logo-pill-left" />
            <span className="logo-pill-right" />
          </>
        )}
      </div>
      <div className="paper-brand-text">
        <strong>{settings.name || 'NexTone'}</strong>
        <small>{settings.tagline || 'Printing & Branding'}</small>
      </div>
    </div>
  )
}

function PaperFooter({ settings }: { settings: CompanySettings }) {
  const phoneClean = (settings.phone || '+256756286160').replace(/\s+/g, '')
  return (
    <div className="paper-footer">
      <span>
        <Globe2 size={18} className="paper-footer-icon" />
        {settings.website || 'nextone.ug'}
      </span>
      <span>
        <Phone size={18} className="paper-footer-icon" />
        {phoneClean}
      </span>
      <span>
        <Mail size={18} className="paper-footer-icon" />
        {settings.email || 'orders@nextone.ug'}
      </span>
    </div>
  )
}

function CustomerCard({
  customer,
  label,
}: {
  customer: Pick<Customer, 'name' | 'phone' | 'email' | 'address'>
  label: string
}) {
  const details = [customer.address || 'Kampala, Uganda', customer.phone].filter(Boolean).join(' · ')
  return (
    <div className="paper-customer">
      <span className="paper-customer-label">{label}</span>
      <strong className="paper-customer-name">{customer.name || 'Customer'}</strong>
      <p className="paper-customer-details">{details || 'Customer details'}</p>
    </div>
  )
}

function ItemRows({ items }: { items: LineItem[] }) {
  return (
    <div className="paper-lines">
      {items.map((item, index) => (
        <div className="paper-line" key={item.id || index}>
          <div className="paper-line-info">
            <strong className="paper-line-name">{item.description}</strong>
            <div className="paper-line-sub">
              <span>Qty:</span>
              <b>{item.quantity}</b>
              <span>({item.unit || 'piece'})</span>
              <span>×</span>
              <span>UGX {Math.round(item.unit_price).toLocaleString('en-UG')}</span>
            </div>
          </div>
          <strong className="paper-line-total">{cash(item.quantity * item.unit_price)}</strong>
        </div>
      ))}
    </div>
  )
}

export function DocumentCanvas({
  document,
  payments = [],
  settings = defaultSettings,
  payment,
  statement,
}: {
  document?: SalesDocument
  payments?: Payment[]
  settings?: CompanySettings
  payment?: Payment
  statement?: StatementModel
}) {
  const root = useRef<HTMLDivElement>(null)

  // Statement Canvas
  if (statement) {
    const defaultNotes =
      statement.settings.default_notes ||
      'We prioritize customer satisfaction. Our team is dedicated to delivering exceptional quality printing and branding solutions, ensuring complete satisfaction on every project.'
    const statementNumber = `#STM-${new Date().getFullYear()}-${statement.customer.name
      .toUpperCase()
      .replace(/\W+/g, '')
      .slice(0, 5) || 'MRTIM'}`
    const todayStr = date(new Date().toISOString().slice(0, 10))

    return (
      <div className="paper-root statement-paper" ref={root}>
        <CornerDecorTop />
        <CornerDecorBottom />
        <header className="paper-header">
          <Brand settings={statement.settings} />
          <div className="paper-doc-title">
            <span className="paper-badge">STATEMENT</span>
            <strong className="paper-doc-num">{statementNumber}</strong>
            <small className="paper-doc-date">{todayStr}</small>
          </div>
        </header>

        <CustomerCard customer={statement.customer} label="PAYABLE TO" />

        <div className="paper-table-head">
          <span>INVOICE BREAKDOWN</span>
          <span>BALANCE DUE</span>
        </div>

        <div className="paper-lines paper-statement-lines">
          {statement.documents.length ? (
            statement.documents.map(doc => {
              const paid = paidFor(statement.payments, doc.id)
              const balance = Math.max(0, totalOf(doc.items, doc.discount_percent) - paid)
              const isSettled = balance <= 0
              const itemsSummary = doc.items.map(it => `${it.description} (${it.quantity} ${it.unit || 'pcs'})`).join(', ')

              const formattedNum = formatDocumentNumber(doc.number)
              return (
                <div className="paper-statement-entry" key={doc.id}>
                  <div className="statement-entry-head">
                    <div className="statement-entry-title">
                      {formattedNum && <strong>{formattedNum}</strong>}
                      <span className={`paper-status-tag ${isSettled ? 'paid' : 'partial'}`}>
                        {isSettled ? 'PAID' : 'PARTIAL'}
                      </span>
                    </div>
                    <div className="statement-entry-balance">
                      <small>BALANCE</small>
                      <strong className={isSettled ? 'settled' : 'due'}>{cash(balance)}</strong>
                    </div>
                  </div>
                  <div className="statement-entry-date">{date(doc.issue_date)}</div>
                  <div className="statement-entry-summary">{itemsSummary || 'Services & Items'}</div>
                  <div className="statement-entry-breakdown">
                    <div className="breakdown-col">
                      <small>TOTAL</small>
                      <strong>{cash(totalOf(doc.items, doc.discount_percent))}</strong>
                    </div>
                    <div className="breakdown-col">
                      <small>PAID</small>
                      <strong className="settled">{cash(paid)}</strong>
                    </div>
                    <div className="breakdown-col">
                      <small>BALANCE</small>
                      <strong className={isSettled ? 'settled' : 'due'}>{cash(balance)}</strong>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="paper-empty">No invoices found for this customer.</div>
          )}
        </div>

        <div className="paper-bottom-section">
          <div className="paper-notes">
            <strong>NOTES:</strong>
            <p>{defaultNotes}</p>
          </div>

          <div className="paper-total-card">
            <div className="total-row">
              <span>TOTAL AMOUNT INVOICED</span>
              <strong>{cash(statement.total)}</strong>
            </div>
            <div className="total-row paid-summary">
              <span>TOTAL AMOUNT PAID</span>
              <strong className="settled">{cash(statement.paid)}</strong>
            </div>
            <div className="total-row">
              <span>TOTAL OUTSTANDING BALANCE</span>
              <strong className={statement.balance > 0 ? 'due' : 'settled'}>{cash(statement.balance)}</strong>
            </div>
            {statement.balance > 0 && (
              <div className="statement-payment-due">
                <AlertCircle size={15} />
                <span>PAYMENT DUE</span>
              </div>
            )}
          </div>
        </div>

        <PaperFooter settings={statement.settings} />
      </div>
    )
  }

  if (!document) return null

  const paid = paidFor(payments, document.id)
  const balance = Math.max(0, totalOf(document.items, document.discount_percent) - paid)
  const receipt = Boolean(payment)
  const label = receipt ? 'RECEIPT' : document.type === 'quotation' ? 'QUOTATION' : 'INVOICE'
  const rawNumber = payment?.number || document.number
  const formattedNumber = formatDocumentNumber(rawNumber)
  const displayDate = date(payment?.paid_at || document.issue_date)
  const receiptPaidBefore = payment ? Math.max(0, paid - payment.amount) : 0
  const notesText =
    document.notes ||
    settings.default_notes ||
    'We prioritize customer satisfaction. Our team is dedicated to delivering exceptional quality printing and branding solutions, ensuring complete satisfaction on every project.'

  return (
    <div className={`paper-root ${receipt ? 'receipt-paper' : ''}`} ref={root}>
      <CornerDecorTop />
      <CornerDecorBottom />
      <header className="paper-header">
        <Brand settings={settings} />
        <div className="paper-doc-title">
          <span className="paper-badge">{label}</span>
          {formattedNumber && <strong className="paper-doc-num">{formattedNumber}</strong>}
          <small className="paper-doc-date">{displayDate}</small>
        </div>
      </header>

      <CustomerCard
        customer={{
          name: document.customer_name,
          phone: document.customer_phone,
          email: document.customer_email,
          address: document.customer_address,
        }}
        label={receipt ? 'PAYMENT RECEIVED FROM' : document.type === 'quotation' ? 'PREPARED FOR' : 'PAYABLE TO'}
      />

      {receipt ? (
        <>
          <div className="paper-table-head">
            <span>PAYMENT RECEIPT</span>
            <span>AMOUNT</span>
          </div>
          <div className="paper-receipt-card">
            <div className="paper-receipt-paid">
              <span>PAYMENT RECEIVED</span>
              <strong>{cash(payment!.amount)}</strong>
            </div>
            <div className="paper-receipt-grid">
              <div>
                <span>INVOICE</span>
                <strong>#{document.number}</strong>
              </div>
              <div>
                <span>PAYMENT DATE</span>
                <strong>{date(payment!.paid_at)}</strong>
              </div>
              <div>
                <span>METHOD</span>
                <strong>{payment!.method}</strong>
              </div>
              {payment!.reference && (
                <div>
                  <span>REFERENCE</span>
                  <strong>{payment!.reference}</strong>
                </div>
              )}
            </div>
          </div>
          <div className="paper-bottom-section">
            <div className="paper-total-card">
              <div className="total-row">
                <span>INVOICE TOTAL</span>
                <strong>{cash(totalOf(document.items, document.discount_percent))}</strong>
              </div>
              <div className="total-row">
                <span>PAID BEFORE THIS RECEIPT</span>
                <strong>{cash(receiptPaidBefore)}</strong>
              </div>
              <div className="total-row paid-summary">
                <span>THIS PAYMENT</span>
                <strong className="settled">{cash(payment!.amount)}</strong>
              </div>
              <div className="total-row">
                <span>REMAINING BALANCE</span>
                <strong className={balance > 0 ? 'due' : 'settled'}>{cash(balance)}</strong>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="paper-table-head">
            <span>ITEMS & SERVICES</span>
            <span>TOTAL</span>
          </div>
          <ItemRows items={document.items} />

          <div className="paper-bottom-section">
            <div className="paper-notes">
              <strong>NOTES:</strong>
              <p>
                {notesText.replace(/#?(ORD|INV|RCT)-(\d{4})-(\d+)/gi, (match) => {
                  const cleaned = formatDocumentNumber(match)
                  return cleaned || ''
                }).trim()}
              </p>
            </div>

            <div className="paper-total-card">
              <div className="total-row">
                <span>SUB TOTAL</span>
                <strong>
                  {cash(document.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0))}
                </strong>
              </div>
              {document.discount_percent > 0 && (
                <div className="total-row discount-summary">
                  <span>DISCOUNT ({document.discount_percent}%)</span>
                  <strong>
                    −
                    {cash(
                      document.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0) -
                        totalOf(document.items, document.discount_percent)
                    )}
                  </strong>
                </div>
              )}
              <div className="total-row grand-total-row">
                <span>GRAND TOTAL</span>
                <strong>{cash(totalOf(document.items, document.discount_percent))}</strong>
              </div>
              {document.type === 'invoice' && (
                <>
                  <div className="total-row paid-summary">
                    <span>PAID TO DATE</span>
                    <strong className="settled">{cash(paid)}</strong>
                  </div>
                  <div className="total-row balance-due-row">
                    <span>BALANCE DUE</span>
                    <strong className={balance > 0 ? 'due' : 'settled'}>{cash(balance)}</strong>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <PaperFooter settings={settings} />
    </div>
  )
}

async function renderPng(node: HTMLElement) {
  const { toPng } = await import('html-to-image')
  await document.fonts.ready
  await Promise.all(
    Array.from(node.querySelectorAll('img')).map(img => {
      if (img.complete) return Promise.resolve()
      return img.decode().catch(() => undefined)
    })
  )
  const originalStyle = node.getAttribute('style') || ''
  node.style.position = 'relative'
  node.style.left = '0'
  node.style.top = '0'
  node.style.zIndex = 'auto'
  node.style.transform = 'none'
  node.style.margin = '0'
  try {
    return await toPng(node, {
      width: 794,
      height: 1123,
      pixelRatio: 3,
      backgroundColor: '#f6f4ec',
      cacheBust: true,
      quality: 1,
      style: {
        transform: 'none',
        margin: '0',
      },
    })
  } finally {
    node.setAttribute('style', originalStyle)
  }
}

async function makeExport(
  documentData: SalesDocument | undefined,
  payments: Payment[],
  settings: CompanySettings,
  format: 'pdf' | 'png',
  payment?: Payment,
  statement?: StatementModel
) {
  const host = window.document.createElement('div')
  host.className = 'export-stage'
  window.document.body.appendChild(host)
  const reactRoot = createRoot(host)
  flushSync(() =>
    reactRoot.render(
      documentData ? (
        <DocumentCanvas document={documentData} payments={payments} settings={settings} payment={payment} />
      ) : (
        <DocumentCanvas statement={statement} />
      )
    )
  )
  // Give extra frame for SVG decor and font shapes to settle cleanly
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  await new Promise(resolve => setTimeout(resolve, 80))
  const node = host.querySelector<HTMLElement>('.paper-root')
  if (!node) {
    reactRoot.unmount()
    host.remove()
    throw new Error('Could not prepare the document preview.')
  }
  try {
    const dataUrl = await renderPng(node)
    const filename = payment ? payment.number : documentData?.number || 'customer-statement'
    if (format === 'png') {
      saveDataUrl(dataUrl, `NexTone_${filename}.png`)
      return
    }
    const { jsPDF } = await import('jspdf')
    // Standard ISO A4 dimensions in points: 595.28 pt x 841.89 pt (210mm x 297mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
      compress: false,
    })
    const a4WidthPt = pdf.internal.pageSize.getWidth()
    const a4HeightPt = pdf.internal.pageSize.getHeight()
    pdf.addImage(dataUrl, 'PNG', 0, 0, a4WidthPt, a4HeightPt, undefined, 'FAST')
    pdf.save(`NexTone_${filename}.pdf`)
  } finally {
    reactRoot.unmount()
    host.remove()
  }
}

function saveDataUrl(dataUrl: string, filename: string) {
  const link = window.document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

export async function downloadDocument(
  doc: SalesDocument,
  payments: Payment[],
  settings: CompanySettings,
  format: 'pdf' | 'png' = 'pdf',
  payment?: Payment
) {
  await makeExport(doc, payments, settings, format, payment)
}

export async function downloadStatement(
  statement: StatementModel,
  format: 'pdf' | 'png' = 'pdf'
) {
  await makeExport(undefined, statement.payments, statement.settings, format, undefined, statement)
}
