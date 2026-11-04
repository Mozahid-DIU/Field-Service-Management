import { StatusCodes } from "http-status-codes";
import { requireUser } from "../../middlewares/auth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { workOrderService } from "./workOrder.service";
import type { ListWorkOrdersQuery } from "./workOrder.validation";
import { workOrderWorkflow } from "./workOrder.workflow";

const paramId = (locals: Record<string, unknown>): string =>
	(locals.validated as { params: { id: string } }).params.id;

const listQuery = (locals: Record<string, unknown>): ListWorkOrdersQuery =>
	(locals.validated as { query: ListWorkOrdersQuery }).query;

export const workOrderController = {
	create: catchAsync(async (req, res) => {
		const data = await workOrderService.create(req.body, requireUser(req.user));
		sendResponse(res, {
			statusCode: StatusCodes.CREATED,
			message: "Service request submitted",
			data,
		});
	}),

	list: catchAsync(async (req, res) => {
		const { data, meta } = await workOrderService.list(
			listQuery(res.locals),
			requireUser(req.user),
		);
		sendResponse(res, { message: "Work orders retrieved", data, meta });
	}),

	search: catchAsync(async (req, res) => {
		const { data, meta } = await workOrderService.list(
			listQuery(res.locals),
			requireUser(req.user),
		);
		sendResponse(res, {
			message: `Found ${meta.total} matching work orders`,
			data,
			meta,
		});
	}),

	getById: catchAsync(async (req, res) => {
		const data = await workOrderService.getById(
			paramId(res.locals),
			requireUser(req.user),
		);
		sendResponse(res, { message: "Work order retrieved", data });
	}),

	update: catchAsync(async (req, res) => {
		const data = await workOrderService.update(
			paramId(res.locals),
			req.body,
			requireUser(req.user),
		);
		sendResponse(res, { message: "Work order updated", data });
	}),

	remove: catchAsync(async (req, res) => {
		await workOrderService.softDelete(
			paramId(res.locals),
			requireUser(req.user),
		);
		sendResponse(res, { message: "Work order deleted", data: null });
	}),

	history: catchAsync(async (req, res) => {
		const data = await workOrderService.history(
			paramId(res.locals),
			requireUser(req.user),
		);
		sendResponse(res, { message: "Work order history retrieved", data });
	}),

	review: catchAsync(async (req, res) => {
		const data = await workOrderWorkflow.review(
			paramId(res.locals),
			req.body,
			requireUser(req.user),
		);
		sendResponse(res, {
			message: `Work order ${data.status.toLowerCase()}`,
			data,
		});
	}),

	assign: catchAsync(async (req, res) => {
		const data = await workOrderWorkflow.assign(
			paramId(res.locals),
			req.body,
			requireUser(req.user),
		);
		sendResponse(res, {
			message: "Technician assigned and visit scheduled",
			data,
		});
	}),

	updateStatus: catchAsync(async (req, res) => {
		const data = await workOrderWorkflow.updateStatus(
			paramId(res.locals),
			req.body,
			requireUser(req.user),
		);
		sendResponse(res, { message: `Status changed to ${data.status}`, data });
	}),

	cancel: catchAsync(async (req, res) => {
		const data = await workOrderWorkflow.cancel(
			paramId(res.locals),
			req.body.reason,
			requireUser(req.user),
		);
		sendResponse(res, { message: "Work order cancelled", data });
	}),

	submitReport: catchAsync(async (req, res) => {
		const data = await workOrderWorkflow.submitReport(
			paramId(res.locals),
			req.body,
			requireUser(req.user),
		);
		sendResponse(res, {
			statusCode: StatusCodes.CREATED,
			message: "Service report submitted, work completed and invoice issued",
			data,
		});
	}),
};
