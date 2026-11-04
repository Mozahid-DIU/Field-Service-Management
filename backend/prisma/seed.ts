import "dotenv/config";
import {
	type Priority,
	Prisma,
	PrismaClient,
	type WorkOrderStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import {
	generateInvoiceNo,
	generateWorkOrderCode,
} from "../src/utils/codeGenerator";

const prisma = new PrismaClient();

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const SALT_ROUNDS = 10;

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@fixflow.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "Password@123";

const at = (offsetMs: number): Date => new Date(Date.now() + offsetMs);

const CATEGORIES = [
	{
		key: "ac",
		name: "AC Repair & Servicing",
		basePrice: 1500,
		description: "Gas refill, cleaning, cooling issues",
	},
	{
		key: "plumbing",
		name: "Plumbing",
		basePrice: 800,
		description: "Leaks, pipe fitting, bathroom and kitchen lines",
	},
	{
		key: "electrical",
		name: "Electrical Wiring",
		basePrice: 1000,
		description: "Wiring, switchboards, circuit faults",
	},
	{
		key: "appliance",
		name: "Home Appliance Repair",
		basePrice: 1200,
		description: "Washing machine, microwave, oven",
	},
	{
		key: "fridge",
		name: "Refrigerator Repair",
		basePrice: 1300,
		description: "Cooling, compressor and thermostat issues",
	},
	{
		key: "cctv",
		name: "CCTV Installation",
		basePrice: 2500,
		description: "Camera setup, DVR/NVR configuration",
	},
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

const TECHNICIANS: {
	key: string;
	name: string;
	email: string;
	phone: string;
	bio: string;
	skills: CategoryKey[];
}[] = [
	{
		key: "karim",
		name: "Karim Hossain",
		email: "karim.tech@fixflow.com",
		phone: "01711000001",
		bio: "8 years in HVAC and refrigeration",
		skills: ["ac", "fridge"],
	},
	{
		key: "rafiq",
		name: "Rafiq Ahmed",
		email: "rafiq.tech@fixflow.com",
		phone: "01711000002",
		bio: "Certified plumber",
		skills: ["plumbing"],
	},
	{
		key: "sumon",
		name: "Sumon Das",
		email: "sumon.tech@fixflow.com",
		phone: "01711000003",
		bio: "Electrician and CCTV specialist",
		skills: ["electrical", "cctv"],
	},
	{
		key: "nasrin",
		name: "Nasrin Akter",
		email: "nasrin.tech@fixflow.com",
		phone: "01711000004",
		bio: "Appliance repair expert",
		skills: ["appliance", "fridge"],
	},
];

const CUSTOMERS = [
	{
		key: "rahim",
		name: "Rahim Uddin",
		email: "rahim@example.com",
		phone: "01811000001",
	},
	{
		key: "fatema",
		name: "Fatema Begum",
		email: "fatema@example.com",
		phone: "01811000002",
	},
	{
		key: "tanvir",
		name: "Tanvir Hasan",
		email: "tanvir@example.com",
		phone: "01811000003",
	},
] as const;

type CustomerKey = (typeof CUSTOMERS)[number]["key"];

interface OrderSeed {
	customer: CustomerKey;
	category: CategoryKey;
	technician?: string;
	status: WorkOrderStatus;
	priority: Priority;
	title: string;
	description: string;
	address: string;
	scheduleOffsetMs?: number;
	durationHours?: number;
	partsCost?: number;
	rating?: number;
	comment?: string;
	adminNote?: string;
	cancelReason?: string;
}

const ORDERS: OrderSeed[] = [
	{
		customer: "rahim",
		category: "ac",
		status: "PENDING",
		priority: "HIGH",
		title: "AC not cooling",
		description: "Split AC runs but blows warm air since yesterday.",
		address: "House 12, Road 5, Mirpur 10, Dhaka",
	},
	{
		customer: "fatema",
		category: "plumbing",
		status: "PENDING",
		priority: "URGENT",
		title: "Kitchen sink pipe leaking",
		description: "Water leaking under the kitchen sink, floor getting wet.",
		address: "Flat 4B, Dhanmondi 27, Dhaka",
	},
	{
		customer: "tanvir",
		category: "cctv",
		status: "PENDING",
		priority: "LOW",
		title: "Install 4 CCTV cameras",
		description: "Need 4 cameras for shop entrance and storage room.",
		address: "Shop 21, Bashundhara City, Dhaka",
	},
	{
		customer: "rahim",
		category: "electrical",
		status: "APPROVED",
		priority: "MEDIUM",
		title: "Switchboard sparking",
		description: "Bedroom switchboard sparks when fan is turned on.",
		address: "House 12, Road 5, Mirpur 10, Dhaka",
		adminNote: "Approved - safety issue",
	},
	{
		customer: "fatema",
		category: "appliance",
		status: "APPROVED",
		priority: "MEDIUM",
		title: "Washing machine not spinning",
		description: "Drum does not spin in the final cycle.",
		address: "Flat 4B, Dhanmondi 27, Dhaka",
	},
	{
		customer: "tanvir",
		category: "ac",
		status: "REJECTED",
		priority: "LOW",
		title: "Install AC in rooftop tent",
		description: "Temporary AC for rooftop event tent.",
		address: "Uttara Sector 7, Dhaka",
		adminNote: "Outside service scope (temporary structure)",
	},
	{
		customer: "rahim",
		category: "fridge",
		technician: "karim",
		status: "ASSIGNED",
		priority: "HIGH",
		title: "Refrigerator not cooling",
		description: "Freezer works but lower compartment is warm.",
		address: "House 12, Road 5, Mirpur 10, Dhaka",
		scheduleOffsetMs: DAY_MS + 3 * HOUR_MS,
		durationHours: 2,
	},
	{
		customer: "fatema",
		category: "electrical",
		technician: "sumon",
		status: "ASSIGNED",
		priority: "MEDIUM",
		title: "New ceiling light wiring",
		description: "Wire 3 new ceiling lights in the living room.",
		address: "Flat 4B, Dhanmondi 27, Dhaka",
		scheduleOffsetMs: 2 * DAY_MS,
		durationHours: 3,
	},
	{
		customer: "tanvir",
		category: "plumbing",
		technician: "rafiq",
		status: "EN_ROUTE",
		priority: "HIGH",
		title: "Bathroom drain blocked",
		description: "Water not draining from bathroom floor.",
		address: "House 3, Block C, Banani, Dhaka",
		scheduleOffsetMs: HOUR_MS,
		durationHours: 2,
	},
	{
		customer: "rahim",
		category: "appliance",
		technician: "nasrin",
		status: "IN_PROGRESS",
		priority: "MEDIUM",
		title: "Microwave not heating",
		description: "Microwave turns on but food stays cold.",
		address: "House 12, Road 5, Mirpur 10, Dhaka",
		scheduleOffsetMs: -HOUR_MS,
		durationHours: 2,
	},
	{
		customer: "fatema",
		category: "ac",
		technician: "karim",
		status: "COMPLETED",
		priority: "HIGH",
		title: "AC gas refill",
		description: "AC cooling weak, needs gas check.",
		address: "Flat 4B, Dhanmondi 27, Dhaka",
		scheduleOffsetMs: -DAY_MS,
		durationHours: 2,
		partsCost: 1800,
	},
	{
		customer: "tanvir",
		category: "electrical",
		technician: "sumon",
		status: "COMPLETED",
		priority: "MEDIUM",
		title: "Main breaker tripping",
		description: "Main breaker trips every evening.",
		address: "House 3, Block C, Banani, Dhaka",
		scheduleOffsetMs: -2 * DAY_MS,
		durationHours: 2,
		partsCost: 650,
	},
	{
		customer: "rahim",
		category: "plumbing",
		technician: "rafiq",
		status: "PAID",
		priority: "MEDIUM",
		title: "Water tap replacement",
		description: "Replace 2 broken bathroom taps.",
		address: "House 12, Road 5, Mirpur 10, Dhaka",
		scheduleOffsetMs: -5 * DAY_MS,
		durationHours: 1,
		partsCost: 900,
		rating: 5,
		comment: "Quick and clean work, very professional.",
	},
	{
		customer: "fatema",
		category: "fridge",
		technician: "nasrin",
		status: "PAID",
		priority: "HIGH",
		title: "Fridge thermostat issue",
		description: "Fridge freezing everything, thermostat faulty.",
		address: "Flat 4B, Dhanmondi 27, Dhaka",
		scheduleOffsetMs: -7 * DAY_MS,
		durationHours: 2,
		partsCost: 1100,
		rating: 4,
		comment: "Fixed the issue, arrived 20 minutes late.",
	},
	{
		customer: "tanvir",
		category: "appliance",
		status: "CANCELLED",
		priority: "LOW",
		title: "Oven light not working",
		description: "Oven inside light bulb is dead.",
		address: "House 3, Block C, Banani, Dhaka",
		cancelReason: "Fixed it myself",
	},
];

const SCHEDULED_STATUSES: WorkOrderStatus[] = [
	"ASSIGNED",
	"EN_ROUTE",
	"IN_PROGRESS",
	"COMPLETED",
	"PAID",
];

function assertSafeToReset(): void {
	if (
		process.env.NODE_ENV === "production" &&
		process.env.ALLOW_SEED_RESET !== "true"
	) {
		throw new Error(
			"Refusing to reset a production database. Set ALLOW_SEED_RESET=true to override.",
		);
	}
}

async function resetDatabase(): Promise<void> {
	await prisma.$transaction([
		prisma.auditLog.deleteMany(),
		prisma.feedback.deleteMany(),
		prisma.payment.deleteMany(),
		prisma.invoice.deleteMany(),
		prisma.serviceReport.deleteMany(),
		prisma.workOrder.deleteMany(),
		prisma.refreshToken.deleteMany(),
		prisma.technicianProfile.deleteMany(),
		prisma.serviceCategory.deleteMany(),
		prisma.user.deleteMany(),
	]);
}

async function main(): Promise<void> {
	assertSafeToReset();
	await resetDatabase();

	const [adminHash, defaultHash] = await Promise.all([
		bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS),
		bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS),
	]);

	const admin = await prisma.user.create({
		data: {
			name: "FixFlow Admin",
			email: ADMIN_EMAIL,
			password: adminHash,
			phone: "01700000000",
			role: "ADMIN",
		},
	});

	const categoryIds = new Map<CategoryKey, { id: string; basePrice: number }>();
	for (const { key, ...data } of CATEGORIES) {
		const created = await prisma.serviceCategory.create({ data });
		categoryIds.set(key, { id: created.id, basePrice: data.basePrice });
	}
	const category = (key: CategoryKey) => {
		const found = categoryIds.get(key);
		if (!found) throw new Error(`Unknown category ${key}`);
		return found;
	};

	const technicianIds = new Map<string, string>();
	for (const tech of TECHNICIANS) {
		const created = await prisma.user.create({
			data: {
				name: tech.name,
				email: tech.email,
				phone: tech.phone,
				password: defaultHash,
				role: "TECHNICIAN",
				technicianProfile: {
					create: {
						bio: tech.bio,
						skills: {
							connect: tech.skills.map((key) => ({ id: category(key).id })),
						},
					},
				},
			},
		});
		technicianIds.set(tech.key, created.id);
	}

	const customerIds = new Map<CustomerKey, string>();
	for (const { key, ...data } of CUSTOMERS) {
		const created = await prisma.user.create({
			data: { ...data, password: defaultHash },
		});
		customerIds.set(key, created.id);
	}

	for (const order of ORDERS) {
		await seedOrder(order, {
			adminId: admin.id,
			customerId: customerIds.get(order.customer) as string,
			technicianId: order.technician
				? technicianIds.get(order.technician)
				: undefined,
			category: category(order.category),
		});
	}

	await refreshTechnicianStats([...technicianIds.values()]);

	const counts = {
		users: await prisma.user.count(),
		categories: await prisma.serviceCategory.count(),
		workOrders: await prisma.workOrder.count(),
		invoices: await prisma.invoice.count(),
		payments: await prisma.payment.count(),
		feedback: await prisma.feedback.count(),
	};
	process.stdout.write(`Seed complete: ${JSON.stringify(counts)}\n`);
	process.stdout.write(`Admin login: ${ADMIN_EMAIL}\n`);
}

interface OrderContext {
	adminId: string;
	customerId: string;
	technicianId?: string;
	category: { id: string; basePrice: number };
}

async function seedOrder(order: OrderSeed, ctx: OrderContext): Promise<void> {
	const isScheduled = SCHEDULED_STATUSES.includes(order.status);
	const scheduledStart =
		isScheduled && order.scheduleOffsetMs !== undefined
			? at(order.scheduleOffsetMs)
			: null;
	const scheduledEnd = scheduledStart
		? new Date(scheduledStart.getTime() + (order.durationHours ?? 2) * HOUR_MS)
		: null;
	const createdAt = at((order.scheduleOffsetMs ?? 0) - 2 * DAY_MS);

	const workOrder = await prisma.workOrder.create({
		data: {
			code: generateWorkOrderCode(createdAt),
			customerId: ctx.customerId,
			technicianId: ctx.technicianId ?? null,
			categoryId: ctx.category.id,
			title: order.title,
			description: order.description,
			address: order.address,
			priority: order.priority,
			status: order.status,
			preferredDate: at((order.scheduleOffsetMs ?? DAY_MS) - HOUR_MS),
			scheduledStart,
			scheduledEnd,
			adminNote: order.adminNote,
			cancelReason: order.cancelReason,
			createdAt,
		},
	});

	await prisma.auditLog.create({
		data: {
			actorId: ctx.customerId,
			action: "WORK_ORDER_CREATED",
			entity: "WorkOrder",
			entityId: workOrder.id,
			after: { status: "PENDING" },
			createdAt,
		},
	});
	if (order.status !== "PENDING") {
		await prisma.auditLog.create({
			data: {
				actorId: ctx.adminId,
				action: "WORK_ORDER_STATUS_CHANGED",
				entity: "WorkOrder",
				entityId: workOrder.id,
				before: { status: "PENDING" },
				after: { status: order.status },
			},
		});
	}

	if (order.partsCost === undefined || !ctx.technicianId) return;

	await prisma.serviceReport.create({
		data: {
			workOrderId: workOrder.id,
			workDone: `Diagnosed and resolved: ${order.title.toLowerCase()}.`,
			partsUsed: [{ name: "Replacement parts", qty: 1, cost: order.partsCost }],
			partsCost: order.partsCost,
			laborMinutes: (order.durationHours ?? 2) * 60,
		},
	});

	const total = ctx.category.basePrice + order.partsCost;
	const isPaid = order.status === "PAID";
	const paidAt =
		isPaid && scheduledEnd ? new Date(scheduledEnd.getTime() + HOUR_MS) : null;

	const invoice = await prisma.invoice.create({
		data: {
			invoiceNo: generateInvoiceNo(scheduledEnd ?? new Date()),
			workOrderId: workOrder.id,
			serviceFee: ctx.category.basePrice,
			partsCost: order.partsCost,
			total,
			status: isPaid ? "PAID" : "UNPAID",
			paidAt,
		},
	});

	if (!isPaid) return;

	// Historical demo payments — clearly marked as seed data (trxId prefix SEED-)
	await prisma.payment.create({
		data: {
			invoiceId: invoice.id,
			userId: ctx.customerId,
			amount: total,
			status: "SUCCESS",
			trxId: `SEED-${invoice.invoiceNo}`,
			payerAccount: "01XXXXXXXXX",
			paidAt,
			rawResponse: Prisma.JsonNull,
		},
	});

	if (order.rating) {
		await prisma.feedback.create({
			data: {
				workOrderId: workOrder.id,
				customerId: ctx.customerId,
				technicianId: ctx.technicianId,
				rating: order.rating,
				comment: order.comment,
			},
		});
	}
}

async function refreshTechnicianStats(technicianIds: string[]): Promise<void> {
	for (const technicianId of technicianIds) {
		const [ratings, totalJobs] = await Promise.all([
			prisma.feedback.aggregate({
				where: { technicianId },
				_avg: { rating: true },
				_count: { rating: true },
			}),
			prisma.workOrder.count({
				where: { technicianId, status: { in: ["COMPLETED", "PAID"] } },
			}),
		]);
		await prisma.technicianProfile.update({
			where: { userId: technicianId },
			data: {
				avgRating: ratings._avg.rating ?? 0,
				ratingCount: ratings._count.rating,
				totalJobs,
			},
		});
	}
}

main()
	.catch((error: unknown) => {
		process.stderr.write(`Seed failed: ${String(error)}\n`);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
