import { z } from "zod";
import {
	add,
	differenceInDays,
	formatISO,
	getDaysInMonth,
	getDaysInYear,
	isAfter,
	isBefore,
	isSameDay,
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

	return formatISO(endDate, {
		representation: "date",
	});
}

const CalculateProratedAmountParamsSchema = z.object({
	originalPlan: SubscriptionPlanSchema,
	newPlan: SubscriptionPlanSchema,
	startDate: z.date(),
	changeDate: z.date(),
	endDate: z.date(),
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
	input: CalculateProratedAmountParams,
): number {
	const { originalPlan, newPlan, startDate, changeDate, endDate } =
		CalculateProratedAmountParamsSchema.parse(input);

	if (
		isBefore(changeDate, startDate) ||
		isAfter(changeDate, endDate) ||
		isBefore(endDate, startDate)
	) {
		throw new Error("Invalid date range");
	}

	if (originalPlan.billing_cycle !== newPlan.billing_cycle) {
		throw new Error("Plans must have the same billing cycle");
	}

	if (
		originalPlan.billing_cycle !== "monthly" &&
		originalPlan.billing_cycle !== "yearly"
	) {
		throw new Error("Invalid billing cycle");
	}

	const originalPlanProratedAmount = calculateProratedCharge({
		fullBillingAmount: originalPlan.price,
		billing_cycle: originalPlan.billing_cycle,
		startDate: startDate,
		endDate: changeDate,
	});

	// If the change date is the same as the end date, don't charge for the new plan
	const newPlanProratedAmount = isSameDay(changeDate, endDate)
		? 0
		: calculateProratedCharge({
				fullBillingAmount: newPlan.price,
				billing_cycle: newPlan.billing_cycle,
				startDate: changeDate,
				endDate: endDate,
			});

	// For upgrades, charge the difference
	if (!isSameDay(changeDate, endDate) && newPlan.price > originalPlan.price) {
		return newPlanProratedAmount - originalPlanProratedAmount;
	}

	// For downgrades or no change, calculate the refund or charge
	return originalPlanProratedAmount - newPlanProratedAmount;
}

const ProratedChargeParamsSchema = z
	.object({
		fullBillingAmount: z.number(),
		startDate: z.date(),
		endDate: z.date(),
	})
	.merge(SubscriptionPlanSchema.pick({ billing_cycle: true }));

type ProratedChargeParams = z.infer<typeof ProratedChargeParamsSchema>;

export const calculateProratedCharge = (
	params: ProratedChargeParams,
): number => {
	const { billing_cycle, endDate, fullBillingAmount, startDate } =
		ProratedChargeParamsSchema.parse(params);

	const totalDays = differenceInDays(endDate, startDate) + 1;
	const billingPeriodDays =
		billing_cycle === "monthly"
			? getDaysInMonth(startDate)
			: getDaysInYear(startDate);

	const dailyRate = fullBillingAmount / billingPeriodDays;

	// If the change is on the last day of the cycle, return 0
	if (totalDays === 0 || isSameDay(startDate, endDate)) {
		return 0;
	}

	const proratedCharge = dailyRate * totalDays;

	return Number(proratedCharge.toFixed(2));
};
