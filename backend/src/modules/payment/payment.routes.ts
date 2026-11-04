import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { idParamSchema } from "../../utils/validators";
import { paymentController as c } from "./payment.controller";
import {
	bkashCallbackQuerySchema,
	initiatePaymentSchema,
	myPaymentsQuerySchema,
} from "./payment.validation";

export const paymentRoutes = Router();

paymentRoutes.post(
	"/bkash/initiate",
	auth("CUSTOMER"),
	validate({ body: initiatePaymentSchema }),
	c.initiate,
);
// Public: bKash redirects the customer's browser here; verification happens server-side
paymentRoutes.get(
	"/bkash/callback",
	validate({ query: bkashCallbackQuerySchema }),
	c.bkashCallback,
);
paymentRoutes.get(
	"/me",
	auth("CUSTOMER"),
	validate({ query: myPaymentsQuerySchema }),
	c.listMine,
);
paymentRoutes.get(
	"/:id",
	auth("CUSTOMER", "ADMIN"),
	validate({ params: idParamSchema }),
	c.getById,
);

export const invoiceRoutes = Router();

invoiceRoutes.get(
	"/:id",
	auth(),
	validate({ params: idParamSchema }),
	c.getInvoice,
);
