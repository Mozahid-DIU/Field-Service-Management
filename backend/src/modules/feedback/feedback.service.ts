import { prisma } from "../../config/prisma";
import type { AuthUser } from "../../types/express";
import { AppError } from "../../utils/AppError";
import { AuditAction, recordAudit } from "../../utils/auditLog";
import { loadAccessibleOrder } from "../workOrder/workOrder.access";
import { lockTechnician } from "../workOrder/workOrder.scheduling";
import type { CreateFeedbackInput } from "./feedback.validation";

/** Customer rates a PAID job once; technician's average is recomputed atomically. */
async function create(
	workOrderId: string,
	input: CreateFeedbackInput,
	customer: AuthUser,
) {
	const order = await loadAccessibleOrder(workOrderId, customer);
	if (order.status !== "PAID") {
		throw AppError.conflict("Feedback can only be given after the job is paid");
	}
	if (!order.technicianId) {
		throw AppError.conflict("This work order has no technician to rate");
	}
	const technicianId = order.technicianId;

	return prisma.$transaction(async (tx) => {
		// Serialize rating recomputation per technician (no lost updates)
		await lockTechnician(tx, technicianId);
		const existing = await tx.feedback.findUnique({
			where: { workOrderId },
			select: { id: true },
		});
		if (existing) {
			throw AppError.conflict("Feedback was already submitted for this job");
		}

		const feedback = await tx.feedback.create({
			data: {
				workOrderId,
				customerId: customer.id,
				technicianId,
				rating: input.rating,
				comment: input.comment,
			},
		});

		const aggregate = await tx.feedback.aggregate({
			where: { technicianId },
			_avg: { rating: true },
			_count: { rating: true },
		});
		await tx.technicianProfile.update({
			where: { userId: technicianId },
			data: {
				avgRating: aggregate._avg.rating ?? 0,
				ratingCount: aggregate._count.rating,
			},
		});

		await recordAudit(
			{
				actorId: customer.id,
				action: AuditAction.FEEDBACK_SUBMITTED,
				entity: "WorkOrder",
				entityId: workOrderId,
				after: { rating: input.rating },
			},
			tx,
		);
		return feedback;
	});
}

export const feedbackService = { create };
