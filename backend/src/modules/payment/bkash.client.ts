import { StatusCodes } from "http-status-codes";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { CacheKeys, cache } from "../../utils/cache";
import { logger } from "../../utils/logger";

const REQUEST_TIMEOUT_MS = 30_000;
const TOKEN_SAFETY_MARGIN_SECONDS = 300;
const SUCCESS_CODE = "0000";

export interface BkashCreateResponse {
	paymentID: string;
	bkashURL: string;
	statusCode: string;
	statusMessage: string;
	transactionStatus?: string;
	amount?: string;
}

export interface BkashExecuteResponse {
	paymentID: string;
	statusCode: string;
	statusMessage: string;
	transactionStatus?: string;
	trxID?: string;
	amount?: string;
	customerMsisdn?: string;
	payerAccount?: string;
}

interface BkashErrorBody {
	statusCode?: string;
	statusMessage?: string;
	errorCode?: string;
	errorMessage?: string;
}

interface Credentials {
	baseUrl: string;
	username: string;
	password: string;
	appKey: string;
	appSecret: string;
	callbackUrl: string;
}

function credentials(): Credentials {
	const {
		BKASH_BASE_URL,
		BKASH_USERNAME,
		BKASH_PASSWORD,
		BKASH_APP_KEY,
		BKASH_APP_SECRET,
		BKASH_CALLBACK_URL,
	} = env;
	if (
		!BKASH_USERNAME ||
		!BKASH_PASSWORD ||
		!BKASH_APP_KEY ||
		!BKASH_APP_SECRET ||
		!BKASH_CALLBACK_URL
	) {
		throw new AppError(
			StatusCodes.SERVICE_UNAVAILABLE,
			"bKash payment is not configured on this server",
		);
	}
	return {
		baseUrl: BKASH_BASE_URL,
		username: BKASH_USERNAME,
		password: BKASH_PASSWORD,
		appKey: BKASH_APP_KEY,
		appSecret: BKASH_APP_SECRET,
		callbackUrl: BKASH_CALLBACK_URL,
	};
}

async function post<T>(
	path: string,
	body: unknown,
	headers: Record<string, string>,
): Promise<T> {
	const { baseUrl } = credentials();
	let response: Response;
	try {
		response = await fetch(`${baseUrl}${path}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				...headers,
			},
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		});
	} catch (error) {
		logger.error(`bKash ${path} network error`, error);
		throw AppError.badGateway("Could not reach bKash, please try again");
	}

	const json = (await response.json().catch(() => ({}))) as T & BkashErrorBody;
	if (!response.ok) {
		logger.error(`bKash ${path} HTTP ${response.status}`, json);
		throw AppError.badGateway(
			json.statusMessage ?? json.errorMessage ?? "bKash request failed",
		);
	}
	return json;
}

// In-process fallback when Redis is not configured
let memoryToken: { value: string; expiresAt: number } | null = null;

async function grantToken(): Promise<string> {
	const cached = await cache.get<string>(CacheKeys.bkashToken);
	if (cached) return cached;
	if (memoryToken && memoryToken.expiresAt > Date.now()) {
		return memoryToken.value;
	}

	const { username, password, appKey, appSecret } = credentials();
	const result = await post<{
		id_token?: string;
		expires_in?: number;
		statusCode?: string;
		statusMessage?: string;
	}>(
		"/tokenized/checkout/token/grant",
		{ app_key: appKey, app_secret: appSecret },
		{ username, password },
	);
	if (!result.id_token) {
		throw AppError.badGateway(
			`bKash authentication failed: ${result.statusMessage ?? "unknown error"}`,
		);
	}

	const ttl = Math.max(
		(result.expires_in ?? 3600) - TOKEN_SAFETY_MARGIN_SECONDS,
		60,
	);
	await cache.set(CacheKeys.bkashToken, result.id_token, ttl);
	memoryToken = { value: result.id_token, expiresAt: Date.now() + ttl * 1000 };
	return result.id_token;
}

async function authorizedPost<T>(path: string, body: unknown): Promise<T> {
	const token = await grantToken();
	return post<T>(path, body, {
		Authorization: token,
		"X-APP-Key": credentials().appKey,
	});
}

export interface CreatePaymentParams {
	amount: string;
	merchantInvoiceNumber: string;
	payerReference: string;
}

async function createPayment(
	params: CreatePaymentParams,
): Promise<BkashCreateResponse> {
	const result = await authorizedPost<BkashCreateResponse>(
		"/tokenized/checkout/create",
		{
			mode: "0011",
			payerReference: params.payerReference,
			callbackURL: credentials().callbackUrl,
			amount: params.amount,
			currency: "BDT",
			intent: "sale",
			merchantInvoiceNumber: params.merchantInvoiceNumber,
		},
	);
	if (result.statusCode !== SUCCESS_CODE || !result.bkashURL) {
		throw AppError.badGateway(
			`bKash rejected the payment: ${result.statusMessage ?? "unknown error"}`,
		);
	}
	return result;
}

function executePayment(paymentID: string): Promise<BkashExecuteResponse> {
	return authorizedPost<BkashExecuteResponse>("/tokenized/checkout/execute", {
		paymentID,
	});
}

function queryPayment(paymentID: string): Promise<BkashExecuteResponse> {
	return authorizedPost<BkashExecuteResponse>(
		"/tokenized/checkout/payment/status",
		{ paymentID },
	);
}

export function isCompleted(result: BkashExecuteResponse): boolean {
	return (
		result.statusCode === SUCCESS_CODE &&
		result.transactionStatus === "Completed" &&
		Boolean(result.trxID)
	);
}

export const bkashClient = {
	createPayment,
	executePayment,
	queryPayment,
	isCompleted,
};
