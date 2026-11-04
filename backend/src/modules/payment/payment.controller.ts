import { StatusCodes } from "http-status-codes";
import { requireUser } from "../../middlewares/auth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { paymentService } from "./payment.service";
import type { BkashCallbackQuery, MyPaymentsQuery } from "./payment.validation";

interface Validated<Q = unknown> {
	query: Q;
	params: { id: string };
}

const validated = <Q>(locals: Record<string, unknown>) =>
	locals.validated as Validated<Q>;

export const paymentController = {
	getInvoice: catchAsync(async (req, res) => {
		const { params } = validated(res.locals);
		const data = await paymentService.getInvoice(
			params.id,
			requireUser(req.user),
		);
		sendResponse(res, { message: "Invoice retrieved", data });
	}),

	initiate: catchAsync(async (req, res) => {
		const data = await paymentService.initiate(
			req.body.invoiceId,
			requireUser(req.user),
		);
		sendResponse(res, {
			statusCode: StatusCodes.CREATED,
			message: "bKash payment created. Redirect the customer to bkashURL.",
			data,
		});
	}),

	bkashCallback: catchAsync(async (_req, res) => {
		const { query } = validated<BkashCallbackQuery>(res.locals);
		const redirectUrl = await paymentService.handleCallback(query);
		res.redirect(StatusCodes.SEE_OTHER, redirectUrl);
	}),

	getById: catchAsync(async (req, res) => {
		const { params } = validated(res.locals);
		const data = await paymentService.getById(params.id, requireUser(req.user));
		sendResponse(res, { message: "Payment retrieved", data });
	}),

	listMine: catchAsync(async (req, res) => {
		const { query } = validated<MyPaymentsQuery>(res.locals);
		const { data, meta } = await paymentService.listMine(
			requireUser(req.user).id,
			query,
		);
		sendResponse(res, { message: "Payment history retrieved", data, meta });
	}),
};
