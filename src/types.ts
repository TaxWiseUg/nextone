export type Customer = { id: string; name: string; phone: string; email: string; address: string; created_at: string }
export type CatalogItem = { id: string; name: string; description: string; unit: string; price: number; category: string; created_at: string }
export type LineItem = { id: string; catalog_id?: string; description: string; quantity: number; unit: string; unit_price: number }
export type DocumentType = 'quotation' | 'invoice'
export type PaymentMethod = 'Cash' | 'Mobile Money' | 'Airtel Pay' | 'Bank transfer' | 'Card' | 'Other'
export type Payment = { id: string; document_id: string; number: string; paid_at: string; amount: number; method: PaymentMethod; reference: string; created_at: string }
export type SalesDocument = {
  id: string; type: DocumentType; number: string; customer_id: string; customer_name: string; customer_phone: string;
  customer_email: string; customer_address: string; items: LineItem[]; discount_percent: number; notes: string;
  status: 'draft' | 'sent' | 'accepted' | 'converted' | 'unpaid' | 'paid' | 'partial' | 'overdue'; issue_date: string;
  due_date: string; source_quote?: string; created_at: string
}
export type CompanySettings = {
  name: string; tagline: string; address: string; phone: string; email: string; website: string; logo_url: string; default_notes: string;
  payment_methods: PaymentMethod[];
  mobile_money_provider: string;
  mobile_money_number: string;
  mobile_money_name: string;
  airtel_pay_code: string;
  airtel_pay_name: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  payment_instructions: string;
}
export const defaultSettings: CompanySettings = {
  name: 'NexTone', tagline: 'Printing & Branding', address: '', phone: '+256 756 286 160',
  email: 'orders@nextone.ug', website: 'nextone.ug', logo_url: '',
  default_notes: 'We prioritize customer satisfaction. Our team is dedicated to delivering exceptional quality printing and branding solutions, ensuring complete satisfaction on every project.',
  payment_methods: ['Mobile Money', 'Airtel Pay', 'Bank transfer', 'Cash'],
  mobile_money_provider: 'MTN / Airtel',
  mobile_money_number: '+256 756 286 160',
  mobile_money_name: 'NexTone Printing & Branding',
  airtel_pay_code: '',
  airtel_pay_name: '',
  bank_name: '',
  bank_account_name: '',
  bank_account_number: '',
  payment_instructions: '',
}
