import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app";

describe("app shell", () => {
	it("returns the standard success envelope on health check", async () => {
		const res = await request(app).get("/api/v1/health");

		expect(res.status).toBe(200);
		expect(res.body.success).toBe(true);
		expect(res.body.message).toBe("Healthy");
		expect(res.body.data).toHaveProperty("uptime");
	});

	it("returns the standard error envelope for unknown routes", async () => {
		const res = await request(app).get("/api/v1/does-not-exist");

		expect(res.status).toBe(404);
		expect(res.body).toEqual({
			success: false,
			message: "Route GET /api/v1/does-not-exist not found",
			errors: [],
		});
	});

	it("returns 400 with error envelope for malformed JSON", async () => {
		const res = await request(app)
			.post("/api/v1/health")
			.set("Content-Type", "application/json")
			.send('{"broken": ');

		expect(res.status).toBe(400);
		expect(res.body.success).toBe(false);
		expect(res.body.message).toBe("Malformed JSON body");
	});

	it("sets security headers via helmet", async () => {
		const res = await request(app).get("/api/v1/health");

		expect(res.headers["x-content-type-options"]).toBe("nosniff");
	});
});
