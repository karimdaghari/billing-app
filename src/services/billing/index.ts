import { z } from "zod";
import {
	add,
	differenceInDays,
	getDaysInMonth,
	getDaysInYear,
	lightFormat,
} from "date-fns";
import { SubscriptionPlanSchema } from "@/db/models/subscription-plan";

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
): string {
	const endDate =
		billingCycle === "monthly"
			? add(currentDate, { months: 1 })
			: add(currentDate, { years: 1 });

	return lightFormat(endDate, "yyyy-MM-dd");
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
		startDate: changeDate,
	});

	const proratedCharge = calculateProratedCharge({
		fullBillingAmount: newPlan.price,
		billing_cycle,
		changeDate,
		startDate: changeDate,
	});

	return proratedCharge - proratedRefund;
}

const ProratedChargeParamsSchema = z
	.object({
		fullBillingAmount: z.number(),
		changeDate: z.date(),
		startDate: z.date(),
	})
	.merge(SubscriptionPlanSchema.pick({ billing_cycle: true }));

type ProratedChargeParams = z.infer<typeof ProratedChargeParamsSchema>;

export const calculateProratedCharge = (
	params: ProratedChargeParams,
): number => {
	const { billing_cycle, changeDate, fullBillingAmount, startDate } =
		ProratedChargeParamsSchema.parse(params);

	const totalDays =
		billing_cycle === "monthly"
			? getDaysInMonth(startDate)
			: getDaysInYear(startDate);

	const dailyRate = fullBillingAmount / totalDays;
	const daysUsed = differenceInDays(changeDate, startDate) + 1;

	const proratedCharge = dailyRate * daysUsed;

	return Number(proratedCharge.toFixed(2));
};
