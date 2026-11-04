import { randomBytes } from "node:crypto";

const SUFFIX_BYTES = 3;

function datePart(date: Date): string {
	const yyyy = date.getUTCFullYear();
	const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
	const dd = String(date.getUTCDate()).padStart(2, "0");
	return `${yyyy}${mm}${dd}`;
}

function randomSuffix(): string {
	return randomBytes(SUFFIX_BYTES).toString("hex").toUpperCase();
}

/** e.g. WO-20261104-3FA9C2 — human friendly, unique enforced by DB */
export function generateWorkOrderCode(date: Date = new Date()): string {
	return `WO-${datePart(date)}-${randomSuffix()}`;
}

/** e.g. INV-20261104-91B0E4 */
export function generateInvoiceNo(date: Date = new Date()): string {
	return `INV-${datePart(date)}-${randomSuffix()}`;
}
