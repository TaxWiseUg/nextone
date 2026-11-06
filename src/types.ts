export type Customer = { id: string; name: string; phone: string; email: string; address: string; created_at: string }
export type CatalogItem = { id: string; name: string; description: string; unit: string; price: number; category: string; created_at: string }
export type LineItem = { id: string; catalog_id?: string; description: string; quantity: number; unit: string; unit_price: number }
export type DocumentType = 'quotation' | 'invoice'
export type PaymentMethod = 'Cash' | 'Mobile Money' | 'Bank transfer' | 'Card' | 'Other'
export type Payment = { id: string; document_id: string; number: string; paid_at: string; amount: number; method: PaymentMethod; reference: string; created_at: string }
export type SalesDocument = {
  id: string; type: DocumentType; number: string; customer_id: string; customer_name: string; customer_phone: string;
  customer_email: string; customer_address: string; items: LineItem[]; discount_percent: number; notes: string;
  status: 'draft' | 'sent' | 'accepted' | 'converted' | 'unpaid' | 'paid' | 'partial' | 'overdue'; issue_date: string;
  due_date: string; source_quote?: string; created_at: string
}
export type CompanySettings = { name: string; tagline: string; address: string; phone: string; email: string; website: string; logo_url: string; default_notes: string }
export const defaultSettings: CompanySettings = {
  name: 'NexTone', tagline: 'Printing & Branding', address: '', phone: '+256 756 286 160',
  email: 'orders@nextone.ug', website: 'nextone.ug', logo_url: '',
  default_notes: 'We prioritize customer satisfaction. Our team is dedicated to delivering exceptional quality printing and branding solutions, ensuring complete satisfaction on every project.',
}
