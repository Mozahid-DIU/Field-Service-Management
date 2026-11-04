import { StatusCodes } from "http-status-codes";
import { requireUser } from "../../middlewares/auth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { adminStatsService } from "./admin.stats.service";
import { adminUsersService } from "./admin.users.service";
import type { AuditLogQuery, ListUsersQuery } from "./admin.validation";

interface Validated<Q = unknown> {
	query: Q;
	params: { id: string };
}

const validated = <Q>(locals: Record<string, unknown>) =>
	locals.validated as Validated<Q>;

export const adminController = {
	listUsers: catchAsync(async (_req, res) => {
		const { query } = validated<ListUsersQuery>(res.locals);
		const { data, meta } = await adminUsersService.listUsers(query);
		sendResponse(res, { message: "Users retrieved", data, meta });
	}),

	createTechnician: catchAsync(async (req, res) => {
		const data = await adminUsersService.createTechnician(
			req.body,
			requireUser(req.user),
		);
		sendResponse(res, {
			statusCode: StatusCodes.CREATED,
			message: "Technician account created",
			data,
		});
	}),

	changeRole: catchAsync(async (req, res) => {
		const { params } = validated(res.locals);
		const data = await adminUsersService.changeRole(
			params.id,
			req.body.role,
			requireUser(req.user),
		);
		sendResponse(res, { message: `Role changed to ${data.role}`, data });
	}),

	changeStatus: catchAsync(async (req, res) => {
		const { params } = validated(res.locals);
		const data = await adminUsersService.changeStatus(
			params.id,
			req.body.status,
			req.body.reason,
			requireUser(req.user),
		);
		sendResponse(res, { message: `User is now ${data.status}`, data });
	}),

	dashboardStats: catchAsync(async (_req, res) => {
		const data = await adminStatsService.dashboardStats();
		sendResponse(res, { message: "Dashboard stats retrieved", data });
	}),

	auditLogs: catchAsync(async (_req, res) => {
		const { query } = validated<AuditLogQuery>(res.locals);
		const { data, meta } = await adminStatsService.auditLogs(query);
		sendResponse(res, { message: "Audit logs retrieved", data, meta });
	}),
};
