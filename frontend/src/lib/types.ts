export type Role = "CUSTOMER" | "TECHNICIAN" | "ADMIN";
export type UserStatus = "ACTIVE" | "BLOCKED";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type WorkOrderStatus =
	| "PENDING"
	| "APPROVED"
	| "REJECTED"
	| "ASSIGNED"
	| "EN_ROUTE"
	| "IN_PROGRESS"
	| "COMPLETED"
	| "PAID"
	| "CANCELLED";
export type InvoiceStatus = "UNPAID" | "PAID" | "VOID";
export type PaymentStatus = "INITIATED" | "SUCCESS" | "FAILED" | "CANCELLED";

/** Prisma Decimal values arrive as strings */
export type Money = string | number;

export interface ApiSuccess<T> {
	success: true;
	message: string;
	data: T;
	meta?: PageMeta;
}

export interface ApiErrorBody {
	success: false;
	message: string;
	errors: { path: string; message: string }[];
}

export interface PageMeta {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface Paged<T> {
	data: T[];
	meta: PageMeta;
}

export interface Skill {
	id: string;
	name: string;
}

export interface TechnicianProfile {
	bio: string | null;
	isAvailable: boolean;
	avgRating: Money;
	ratingCount: number;
	totalJobs: number;
	skills: Skill[];
}

export interface User {
	id: string;
	name: string;
	email: string;
	phone: string | null;
	avatarUrl: string | null;
	role: Role;
	status: UserStatus;
	provider: "CREDENTIALS" | "GOOGLE";
	createdAt: string;
	updatedAt: string;
	deletedAt?: string | null;
	technicianProfile?: TechnicianProfile | null;
}

export interface AuthPayload {
	user: User;
	accessToken: string;
	refreshToken: string;
}

export interface Category {
	id: string;
	name: string;
	description: string | null;
	basePrice: Money;
	isActive: boolean;
	_count?: { technicians: number };
}

export interface PersonRef {
	id: string;
	name: string;
	phone: string | null;
	email?: string;
}

export interface InvoiceRef {
	id: string;
	invoiceNo: string;
	status: InvoiceStatus;
	total: Money;
}

export interface ServiceReport {
	id: string;
	workDone: string;
	partsUsed: { name: string; qty: number; unitCost: number }[];
	partsCost: Money;
	laborMinutes: number;
	createdAt: string;
}

export interface PaymentRef {
	id: string;
	status: PaymentStatus;
	amount: Money;
	trxId: string | null;
	paidAt: string | null;
	createdAt: string;
}

export interface Feedback {
	id: string;
	rating: number;
	comment: string | null;
	createdAt: string;
}

export interface WorkOrder {
	id: string;
	code: string;
	title: string;
	description: string;
	address: string;
	priority: Priority;
	status: WorkOrderStatus;
	preferredDate: string | null;
	scheduledStart: string | null;
	scheduledEnd: string | null;
	images: string[];
	adminNote: string | null;
	cancelReason: string | null;
	createdAt: string;
	updatedAt: string;
	category: { id: string; name: string; basePrice: Money };
	customer: PersonRef;
	technician: PersonRef | null;
	invoice: InvoiceRef | null;
}

export interface WorkOrderDetail extends Omit<WorkOrder, "invoice"> {
	report: ServiceReport | null;
	invoice:
		| (InvoiceRef & {
				serviceFee: Money;
				partsCost: Money;
				issuedAt: string;
				paidAt: string | null;
				payments: PaymentRef[];
		  })
		| null;
	feedback: Feedback | null;
}

export interface HistoryEntry {
	id: string;
	action: string;
	before: Record<string, unknown> | null;
	after: Record<string, unknown> | null;
	createdAt: string;
	actor: { id: string; name: string; role: Role } | null;
}

export interface TechnicianListItem {
	id: string;
	name: string;
	email: string;
	phone: string | null;
	avatarUrl: string | null;
	status: UserStatus;
	technicianProfile: TechnicianProfile | null;
	isFreeInWindow?: boolean;
}

export interface Payment {
	id: string;
	amount: Money;
	status: PaymentStatus;
	bkashPaymentId: string | null;
	trxId: string | null;
	payerAccount: string | null;
	failureReason: string | null;
	paidAt: string | null;
	createdAt: string;
	invoice: {
		id: string;
		invoiceNo: string;
		total: Money;
		status: InvoiceStatus;
		workOrder: { id: string; code: string; title: string };
	};
}

export interface DashboardStats {
	users: Partial<Record<Role, number>>;
	workOrders: {
		total: number;
		byStatus: Partial<Record<WorkOrderStatus, number>>;
		byCategory: { category: string; count: number }[];
	};
	revenue: {
		totalCollected: Money;
		successfulPayments: number;
		last30Days: Money;
		outstanding: Money;
		unpaidInvoices: number;
	};
	topTechnicians: {
		id: string;
		name: string;
		totalJobs: number;
		avgRating: Money;
		ratingCount: number;
	}[];
	generatedAt: string;
}

export interface AuditLog {
	id: string;
	action: string;
	entity: string;
	entityId: string;
	before: Record<string, unknown> | null;
	after: Record<string, unknown> | null;
	createdAt: string;
	actor: { id: string; name: string; role: Role } | null;
}

export interface TechnicianStats {
	technician: TechnicianListItem;
	jobsByStatus: Partial<Record<WorkOrderStatus, number>>;
	upcomingJobs: number;
	revenueGenerated: Money;
}
