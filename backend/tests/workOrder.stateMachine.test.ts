import { describe, expect, it } from "vitest";
import { overlapsWindow } from "../src/modules/workOrder/workOrder.scheduling";
import {
	allowedNextStatuses,
	assertTransition,
	TRANSITIONS,
} from "../src/modules/workOrder/workOrder.stateMachine";
import type { AppError } from "../src/utils/AppError";

function statusCodeOf(fn: () => void): number | undefined {
	try {
		fn();
		return undefined;
	} catch (error) {
		return (error as AppError).statusCode;
	}
}

describe("work order state machine", () => {
	it("allows the full happy path with the right actors", () => {
		const path = [
			["PENDING", "APPROVED", "ADMIN"],
			["APPROVED", "ASSIGNED", "ADMIN"],
			["ASSIGNED", "EN_ROUTE", "TECHNICIAN"],
			["EN_ROUTE", "IN_PROGRESS", "TECHNICIAN"],
			["IN_PROGRESS", "COMPLETED", "TECHNICIAN"],
			["COMPLETED", "PAID", "SYSTEM"],
		] as const;

		for (const [from, to, actor] of path) {
			expect(() => assertTransition(from, to, actor)).not.toThrow();
		}
	});

	it("rejects skipping steps with 409 Conflict", () => {
		expect(
			statusCodeOf(() => assertTransition("PENDING", "COMPLETED", "ADMIN")),
		).toBe(409);
		expect(
			statusCodeOf(() => assertTransition("APPROVED", "IN_PROGRESS", "ADMIN")),
		).toBe(409);
	});

	it("rejects a valid transition by the wrong role with 403", () => {
		expect(
			statusCodeOf(() => assertTransition("PENDING", "APPROVED", "CUSTOMER")),
		).toBe(403);
		expect(
			statusCodeOf(() =>
				assertTransition("ASSIGNED", "CANCELLED", "TECHNICIAN"),
			),
		).toBe(403);
	});

	it("never lets a human mark an order as PAID", () => {
		for (const actor of ["CUSTOMER", "TECHNICIAN", "ADMIN"] as const) {
			expect(
				statusCodeOf(() => assertTransition("COMPLETED", "PAID", actor)),
			).toBe(403);
		}
	});

	it("treats PAID, REJECTED and CANCELLED as final", () => {
		for (const status of ["PAID", "REJECTED", "CANCELLED"] as const) {
			expect(Object.keys(TRANSITIONS[status])).toHaveLength(0);
		}
	});

	it("does not allow cancelling once the technician is on the way", () => {
		expect(
			statusCodeOf(() => assertTransition("EN_ROUTE", "CANCELLED", "ADMIN")),
		).toBe(409);
	});

	it("lists next statuses per actor", () => {
		expect(allowedNextStatuses("PENDING", "ADMIN").sort()).toEqual([
			"APPROVED",
			"CANCELLED",
			"REJECTED",
		]);
		expect(allowedNextStatuses("PENDING", "CUSTOMER")).toEqual(["CANCELLED"]);
	});
});

describe("schedule overlap rule", () => {
	const at = (hhmm: string) => new Date(`2026-12-01T${hhmm}:00.000Z`);

	it("builds strict inequalities so back-to-back visits are allowed", () => {
		const where = overlapsWindow({ start: at("15:00"), end: at("17:00") });

		expect(where).toEqual({
			scheduledStart: { lt: at("17:00") },
			scheduledEnd: { gt: at("15:00") },
		});
	});

	it("matches the overlap definition for sample windows", () => {
		const overlaps = (
			aStart: string,
			aEnd: string,
			bStart: string,
			bEnd: string,
		) => at(aStart) < at(bEnd) && at(aEnd) > at(bStart);

		expect(overlaps("15:00", "17:00", "16:00", "18:00")).toBe(true);
		expect(overlaps("15:00", "17:00", "14:00", "15:30")).toBe(true);
		expect(overlaps("15:00", "17:00", "17:00", "18:00")).toBe(false);
		expect(overlaps("15:00", "17:00", "13:00", "15:00")).toBe(false);
	});
});
