import { requireUser } from "../../middlewares/auth";
import { catchAsync } from "../../utils/catchAsync";
import type { PageParams } from "../../utils/pagination";
import { sendResponse } from "../../utils/sendResponse";
import { technicianService } from "./technician.service";
import type {
	ListTechniciansQuery,
	MyJobsQuery,
} from "./technician.validation";

interface Validated<Q> {
	query: Q;
	params: { id: string };
}

const validated = <Q>(locals: Record<string, unknown>) =>
	locals.validated as Validated<Q>;

export const technicianController = {
	list: catchAsync(async (_req, res) => {
		const { query } = validated<ListTechniciansQuery>(res.locals);
		const { data, meta } = await technicianService.list(query);
		sendResponse(res, { message: "Technicians retrieved", data, meta });
	}),

	myJobs: catchAsync(async (req, res) => {
		const { id } = requireUser(req.user);
		const { query } = validated<MyJobsQuery>(res.locals);
		const { data, meta } = await technicianService.myJobs(id, query);
		sendResponse(res, { message: "Assigned jobs retrieved", data, meta });
	}),

	stats: catchAsync(async (req, res) => {
		const { params } = validated<unknown>(res.locals);
		const data = await technicianService.stats(
			params.id,
			requireUser(req.user),
		);
		sendResponse(res, { message: "Technician stats retrieved", data });
	}),

	feedback: catchAsync(async (_req, res) => {
		const { params, query } = validated<PageParams>(res.locals);
		const { data, meta } = await technicianService.feedback(params.id, query);
		sendResponse(res, { message: "Technician feedback retrieved", data, meta });
	}),
};
