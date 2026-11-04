import bcrypt from "bcryptjs";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
	user: {
		findUnique: vi.fn(),
		findFirst: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
	},
	refreshToken: {
		create: vi.fn(),
		findUnique: vi.fn(),
		updateMany: vi.fn(),
	},
	auditLog: { create: vi.fn() },
	$transaction: vi.fn(),
}));

vi.mock("../src/config/prisma", () => ({ prisma: prismaMock }));

import app from "../src/app";
import { authorize } from "../src/middlewares/auth";
import { AppError } from "../src/utils/AppError";
import { hashToken, signAccessToken } from "../src/utils/tokens";

const baseUser = {
	id: "11111111-1111-1111-1111-111111111111",
	name: "Rahim Uddin",
	email: "rahim@example.com",
	phone: null,
	avatarUrl: null,
	role: "CUSTOMER" as const,
	status: "ACTIVE" as const,
	provider: "CREDENTIALS" as const,
	googleId: null,
	createdAt: new Date(),
	updatedAt: new Date(),
	deletedAt: null,
};

beforeEach(() => {
	vi.clearAllMocks();
	prismaMock.$transaction.mockImplementation(
		(fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock),
	);
	prismaMock.refreshToken.create.mockResolvedValue({});
	prismaMock.auditLog.create.mockResolvedValue({});
});

describe("POST /api/v1/auth/register", () => {
	it("rejects invalid input with a structured validation error", async () => {
		const res = await request(app)
			.post("/api/v1/auth/register")
			.send({ name: "R", email: "not-an-email", password: "short" });

		expect(res.status).toBe(400);
		expect(res.body.success).toBe(false);
		expect(res.body.message).toBe("Validation failed");
		const paths = res.body.errors.map((e: { path: string }) => e.path);
		expect(paths).toEqual(
			expect.arrayContaining(["name", "email", "password"]),
		);
	});

	it("creates a CUSTOMER, never trusting a role from the body", async () => {
		prismaMock.user.findUnique.mockResolvedValue(null);
		prismaMock.user.create.mockImplementation(
			({ data }: { data: Record<string, unknown> }) => ({
				...baseUser,
				...data,
			}),
		);

		const res = await request(app).post("/api/v1/auth/register").send({
			name: "Rahim Uddin",
			email: "RAHIM@Example.com",
			password: "Secret123",
			role: "ADMIN",
		});

		expect(res.status).toBe(201);
		const createArgs = prismaMock.user.create.mock.calls[0][0].data;
		expect(createArgs.role).toBe("CUSTOMER");
		expect(createArgs.email).toBe("rahim@example.com");
		expect(createArgs.password).not.toBe("Secret123");
		expect(res.body.data.accessToken).toEqual(expect.any(String));
		expect(res.body.data.user).not.toHaveProperty("password");
		expect(res.headers["set-cookie"]?.[0]).toMatch(/refreshToken=.*HttpOnly/);
	});

	it("returns 409 when the email is already registered", async () => {
		prismaMock.user.findUnique.mockResolvedValue({ id: baseUser.id });

		const res = await request(app).post("/api/v1/auth/register").send({
			name: "Rahim Uddin",
			email: "rahim@example.com",
			password: "Secret123",
		});

		expect(res.status).toBe(409);
		expect(res.body.success).toBe(false);
	});
});

describe("POST /api/v1/auth/login", () => {
	it("returns the same 401 message for wrong password and unknown email", async () => {
		const password = await bcrypt.hash("Secret123", 4);
		prismaMock.user.findUnique.mockResolvedValueOnce({
			...baseUser,
			password,
		});
		const wrongPassword = await request(app)
			.post("/api/v1/auth/login")
			.send({ email: baseUser.email, password: "Wrong1234" });

		prismaMock.user.findUnique.mockResolvedValueOnce(null);
		const unknownEmail = await request(app)
			.post("/api/v1/auth/login")
			.send({ email: "ghost@example.com", password: "Wrong1234" });

		expect(wrongPassword.status).toBe(401);
		expect(unknownEmail.status).toBe(401);
		expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
	});

	it("blocks login for BLOCKED users with 403", async () => {
		const password = await bcrypt.hash("Secret123", 4);
		prismaMock.user.findUnique.mockResolvedValue({
			...baseUser,
			password,
			status: "BLOCKED",
		});

		const res = await request(app)
			.post("/api/v1/auth/login")
			.send({ email: baseUser.email, password: "Secret123" });

		expect(res.status).toBe(403);
	});
});

describe("POST /api/v1/auth/refresh-token", () => {
	it("revokes all sessions when a revoked token is reused", async () => {
		prismaMock.refreshToken.findUnique.mockResolvedValue({
			id: "rt-1",
			userId: baseUser.id,
			tokenHash: hashToken("x".repeat(40)),
			revokedAt: new Date(),
			expiresAt: new Date(Date.now() + 60_000),
			user: baseUser,
		});
		prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 2 });

		const res = await request(app)
			.post("/api/v1/auth/refresh-token")
			.send({ refreshToken: "x".repeat(40) });

		expect(res.status).toBe(401);
		expect(res.body.message).toMatch(/reuse detected/);
		expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
			where: { userId: baseUser.id, revokedAt: null },
			data: { revokedAt: expect.any(Date) },
		});
	});
});

describe("authentication middleware", () => {
	it("returns 401 without a Bearer token", async () => {
		const res = await request(app)
			.patch("/api/v1/auth/change-password")
			.send({});

		expect(res.status).toBe(401);
		expect(res.body.success).toBe(false);
	});

	it("returns 401 for a forged token", async () => {
		const res = await request(app)
			.patch("/api/v1/auth/change-password")
			.set("Authorization", "Bearer not.a.jwt")
			.send({});

		expect(res.status).toBe(401);
		expect(res.body.message).toBe("Invalid token");
	});

	it("returns 403 when a valid token belongs to a blocked user", async () => {
		const token = signAccessToken({
			sub: baseUser.id,
			email: baseUser.email,
			role: "CUSTOMER",
		});
		prismaMock.user.findUnique.mockResolvedValue({
			...baseUser,
			status: "BLOCKED",
		});

		const res = await request(app)
			.patch("/api/v1/auth/change-password")
			.set("Authorization", `Bearer ${token}`)
			.send({});

		expect(res.status).toBe(403);
	});
});

describe("authorize()", () => {
	it("throws 403 for a role that is not allowed", () => {
		const middleware = authorize("ADMIN");
		const req = { user: { id: "u", email: "e", role: "CUSTOMER" } };

		expect(() => middleware(req as never, {} as never, vi.fn())).toThrowError(
			AppError,
		);
		try {
			middleware(req as never, {} as never, vi.fn());
		} catch (error) {
			expect((error as AppError).statusCode).toBe(403);
		}
	});

	it("calls next for an allowed role", () => {
		const next = vi.fn();
		authorize("ADMIN", "TECHNICIAN")(
			{ user: { id: "u", email: "e", role: "TECHNICIAN" } } as never,
			{} as never,
			next,
		);

		expect(next).toHaveBeenCalledOnce();
	});
});
