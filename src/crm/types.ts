export interface Company {
  id: string;
  name: string;
  industry: "SaaS" | "E-commerce" | "Healthcare" | "Finance" | "Education" | "Manufacturing" | "Other";
  website: string;
  notes: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  sortOrder: number;
  color: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyId: string;
  tagIds: string[];
  dealValue: number;
  status: "Lead" | "Qualified" | "Proposal" | "Negotiation" | "Won" | "Lost";
  createdAt?: string;
}

export interface Deal {
  id: string;
  contactId: string;
  companyId: string;
  value: number;
  status: "Lead" | "Qualified" | "Proposal" | "Negotiation" | "Won" | "Lost";
  tagIds: string[];
  title: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  description: string;
  imageUrl?: string | null;
  status?: "Active" | "Upcoming" | "Completed" | "On Hold";
  progress?: number;
  startDate?: string;
  endDate?: string;
  budget?: number;
  teamMembers?: { id: string; name: string; role: string }[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  stage: "Unassigned" | "Todo" | "In Progress" | "In Review" | "Done";
  assigneeId: string | null;
  dueDate: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  checklist: ChecklistItem[];
  commentCount: number;
  attachmentCount: number;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  userId?: string;
  name: string;
  email: string;
  avatar?: string | null;
  avatarUrl?: string | null;
  role: string;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  taskId: string;
  fileName: string;
  fileUrl?: string | null;
  fileSize: string | number;
  fileType: string;
  isPrimary?: boolean;
  uploadedBy: string;
  uploadedAt?: string;
  createdAt?: string;
}

export interface AttachmentComment {
  id: string;
  attachmentId: string;
  authorId: string | null;
  userId?: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectStage {
  id: string;
  name: "Unassigned" | "Todo" | "In Progress" | "In Review" | "Done";
  sortOrder: number;
}

export interface Activity {
  id: string;
  type: "Call" | "Meeting" | "Email" | "Task" | "Demo";
  title: string;
  date: string;
  contactId: string | null;
  dealId: string | null;
  notes: string;
  status: "Scheduled" | "Completed" | "Cancelled";
  duration: number; // in minutes
  createdAt: string;
}

export interface QuoteLineItem {
  id: string;
  product: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export interface QuoteStatusHistory {
  id: string;
  status: "Draft" | "Sent" | "Accepted" | "Rejected" | "Expired";
  timestamp: string;
  notes?: string;
}

export interface Quote {
  id: string;
  quoteNumber: string; // format: Q-YYYY-XXXX
  contactId: string;
  companyId: string;
  dealId: string | null;
  quoteDate: string;
  expiryDate: string;
  lineItems: QuoteLineItem[];
  subtotal: number;
  taxRate: number; // default 10%
  discount: number;
  grandTotal: number;
  status: "Draft" | "Sent" | "Accepted" | "Rejected" | "Expired";
  statusHistory: QuoteStatusHistory[];
  notes: string;
  createdAt: string;
}

export interface CompanySettings {
  id: string;
  companyName: string;
  logo: string | null;
  currency: "USD" | "EUR" | "GBP" | "JPY" | "AUD" | "CAD" | "CHF" | "CNY";
  taxRate: number;
  timezone: string;
  address: string;
  phone: string;
  email: string;
  termsConditions?: string | null;
  paymentDetails?: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Sales Manager" | "Sales Rep" | "Viewer";
  status: "Active" | "Inactive";
  permissions: {
    manageUsers: boolean;
    manageDeals: boolean;
    manageContacts: boolean;
    manageCompanies: boolean;
    manageSettings: boolean;
    viewReports: boolean;
    exportData: boolean;
  };
  avatar?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  jobTitle: string;
  employmentType: "Full-time" | "Part-time" | "Contract" | "Intern";
  status: "Active" | "On Leave" | "Terminated";
  startDate: string;
  salary: number;
  avatarUrl?: string | null;
  address: string;
  notes: string;
  createdAt: string;
}

export interface EmailAccount {
  id: string;
  provider: "gmail" | "outlook" | "smtp";
  label: string;
  emailAddress: string;
  displayName: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenExpires?: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: "general" | "order" | "support" | "marketing";
  variables: { name: string; defaultValue: string }[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface Email {
  id: string;
  accountId?: string | null;
  templateId?: string | null;
  // RFC 5322 standard headers
  messageId?: string;
  inReplyTo?: string;
  threadId?: string;
  // Addressing
  fromAddress: string;
  fromName: string;
  toAddresses: string[];
  ccAddresses: string[];
  bccAddresses: string[];
  replyTo: string;
  // Content
  subject: string;
  body: string;
  snippet: string;
  // Classification
  status: "draft" | "sent" | "failed" | "queued" | "received";
  category: "general" | "order" | "support" | "marketing";
  folder: "inbox" | "sent" | "drafts" | "trash" | "spam" | "archive";
  // Flags
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  // Metadata
  errorMessage?: string;
  externalId?: string;
  labels: string[];
  // Relations
  contactId?: string | null;
  customerId?: string | null;
  orderId?: string | null;
  dealId?: string | null;
  // Timestamps
  sentAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

// ── Asset Types ──

export interface AssetTag {
  id: string;
  name: string;
  color: string;
}

export interface AssetCollection {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  assetCount: number;
  createdAt: string;
}

export interface Asset {
  id: string;
  name: string;
  description: string;
  type: "Logo" | "Image" | "Document" | "Video" | "Font" | "Color Palette";
  fileUrl: string;
  thumbnailUrl: string;
  fileSize: string;
  fileFormat: string;
  dimensions?: string;
  collectionIds: string[];
  tagIds: string[];
  isFavorite: boolean;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsageGuideline {
  id: string;
  assetId: string;
  title: string;
  description: string;
  dosList: string[];
  dontsList: string[];
}

export interface ColorPaletteColor {
  id: string;
  name: string;
  hex: string;
  rgb: string;
  usage: string;
}

export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  colors: ColorPaletteColor[];
  assetId: string;
  createdAt: string;
}

export interface FontVariant {
  id: string;
  name: string;
  weight: string;
  style: string;
  fileUrl: string;
}

export interface FontAsset {
  id: string;
  assetId: string;
  fontFamily: string;
  variants: FontVariant[];
  sampleText: string;
  usage: string;
}

// ── Finance Types ──

export type TransactionCategory =
  | "Deal Revenue"
  | "E-commerce Revenue"
  | "Salary"
  | "Tax Payment"
  | "Office Supplies"
  | "Software & Tools"
  | "Marketing"
  | "Utilities"
  | "Travel"
  | "Insurance"
  | "Legal"
  | "Rent"
  | "Equipment"
  | "Consulting"
  | "Refund"
  | "Other";

export interface FinanceTransaction {
  id: string;
  type: "income" | "expense";
  category: TransactionCategory;
  source: "deals" | "ecommerce" | "payroll" | "tax" | "operational" | "other";
  description: string;
  amount: number;
  date: string;
  reference?: string;
  dealId?: string | null;
  orderId?: string | null;
  staffId?: string | null;
  status: "completed" | "pending" | "cancelled";
  notes?: string;
  createdAt: string;
}

export interface PayrollRecord {
  id: string;
  staffId: string;
  staffName: string;
  department: string;
  payPeriod: string; // e.g. "2026-02"
  grossSalary: number;
  // UK tax deductions
  incomeTax: number;        // PAYE
  nationalInsurance: number; // Employee NI
  employerNi: number;       // Employer NI
  pensionEmployee: number;  // Employee pension contribution
  pensionEmployer: number;  // Employer pension contribution
  studentLoan: number;
  otherDeductions: number;
  netPay: number;
  status: "draft" | "approved" | "paid";
  paidDate?: string | null;
  createdAt: string;
}

export interface TaxRecord {
  id: string;
  taxType: "VAT" | "Corporation Tax" | "PAYE" | "National Insurance" | "Capital Gains";
  period: string; // e.g. "Q1 2026" or "2025-2026"
  taxableAmount: number;
  taxRate: number;
  taxDue: number;
  taxPaid: number;
  balance: number;
  dueDate: string;
  status: "upcoming" | "due" | "paid" | "overdue";
  notes?: string;
  createdAt: string;
}

export interface FinancialAccount {
  id: string;
  name: string;
  type: "bank" | "cash" | "credit" | "investment";
  balance: number;
  currency: string;
  lastReconciled?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Budget {
  id: string;
  category: TransactionCategory;
  period: string; // e.g. "2026-02"
  allocated: number;
  spent: number;
  remaining: number;
  createdAt: string;
}
