import { z } from "zod";
import {
	addDays,
	differenceInDays,
	endOfMonth,
	getMonth,
	startOfMonth,
	startOfYear,
} from "date-fns";
import BigNumber from "bignumber.js";
import { SubscriptionPlanSchema } from "@/db/schema";

/**
 * Determines the end date of the billing cycle based on the billing cycle type.
 * We assume that end of the billing cycle is the last day of the month or year.
 * We assume that the month is 30 days and the year is 365 days.
 *
 * @param currentDate - The current date.
 * @param billingCycle - The billing cycle type ("monthly" or "yearly").
 * @returns The end date of the billing cycle.
 */
export function getBillingCycleEndDate(
	currentDate: Date,
	billingCycle: z.infer<typeof SubscriptionPlanSchema>["billing_cycle"],
): Date {
	if (billingCycle === "monthly") {
		// Check if it's February
		if (getMonth(currentDate) === 1) {
			// Get the last day of February
			return endOfMonth(currentDate);
		}
		// For other months, use the standard 30-day approach
		return addDays(startOfMonth(currentDate), 30);
	}
	return addDays(startOfYear(currentDate), 365);
}

const CalculateProratedAmountParamsSchema = z.object({
	originalPlan: SubscriptionPlanSchema,
	newPlan: SubscriptionPlanSchema,
	changeDate: z.date(),
});

type CalculateProratedAmountParams = z.infer<
	typeof CalculateProratedAmountParamsSchema
>;

/**
 * Calculates the prorated amount when changing subscription plans.
 * It computes the difference between the prorated charge for the new plan
 * and the prorated refund for the original plan based on the remaining days
 * in the billing cycle.
 *
 * @param params - Parameters including original plan, new plan, and change date.
 * @returns The net prorated amount as a number.
 */
export function calculateProratedAmount(
	params: CalculateProratedAmountParams,
): number {
	const { originalPlan, newPlan, changeDate } =
		CalculateProratedAmountParamsSchema.parse(params);
	const { billing_cycle } = newPlan;

	const proratedRefund = calculateProratedCharge({
		fullBillingAmount: originalPlan.price,
		billing_cycle,
		changeDate,
	});

	const proratedCharge = calculateProratedCharge({
		fullBillingAmount: newPlan.price,
		billing_cycle,
		changeDate,
	});

	return proratedCharge.minus(proratedRefund).toNumber();
}

const ProratedChargeParamsSchema = z
	.object({
		fullBillingAmount: z.number(),
		changeDate: z.date(),
	})
	.merge(SubscriptionPlanSchema.pick({ billing_cycle: true }));

type ProratedChargeParams = z.infer<typeof ProratedChargeParamsSchema>;

/**
 * Calculates the prorated charge for a subscription plan change.
 *
 * This function determines the prorated amount to charge based on the remaining days
 * in the current billing cycle after a plan change occurs.
 *
 * @param params - An object containing the parameters for the calculation
 * @param params.billing_cycle - The billing cycle of the subscription ('monthly' or 'yearly')
 * @param params.changeDate - The date when the plan change occurs
 * @param params.fullBillingAmount - The full amount for the billing cycle
 *
 * @returns A BigNumber representing the prorated charge
 */
export const calculateProratedCharge = (
	params: ProratedChargeParams,
): BigNumber => {
	const { billing_cycle, changeDate, fullBillingAmount } =
		ProratedChargeParamsSchema.parse(params);

	// Determine the length of the billing cycle in days
	const billingCycleLength = billing_cycle === "monthly" ? 30 : 365;

	// Calculate the end date of the current billing cycle
	const billingCycleEndDate = getBillingCycleEndDate(changeDate, billing_cycle);
	// Calculate the number of days remaining in the billing cycle
	const remainingDays = differenceInDays(billingCycleEndDate, changeDate) + 1;

	// Calculate the daily rate for the subscription
	const dailyRate = new BigNumber(fullBillingAmount).dividedBy(
		billingCycleLength,
	);

	// Calculate the prorated charge by multiplying the daily rate by the remaining days
	const proratedCharge = dailyRate.multipliedBy(remainingDays);

	return proratedCharge;
};
