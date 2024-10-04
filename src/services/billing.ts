import type { SubscriptionPlanSchema } from "@/db/schema";
import { differenceInDays, endOfMonth, endOfYear } from "date-fns";
import BigNumber from "bignumber.js";

interface CalculateProratedAmountParams {
	originalPlan: SubscriptionPlanSchema;
	newPlan: SubscriptionPlanSchema;
	changeDate: Date;
}

export const getBillingCycleEndDate = (
	currentDate: Date,
	billingCycle: "monthly" | "yearly",
): Date =>
	billingCycle === "monthly" ? endOfMonth(currentDate) : endOfYear(currentDate);

export function calculateProratedAmount({
	originalPlan,
	newPlan,
	changeDate,
}: CalculateProratedAmountParams): number {
	const billingCycleEndDate = getBillingCycleEndDate(
		changeDate,
		newPlan.billing_cycle,
	);

	const remainingDays = differenceInDays(billingCycleEndDate, changeDate);
	const cycleLength = differenceInDays(billingCycleEndDate, changeDate) + 1; // +1 to include the change date

	const originalDailyRate = new BigNumber(originalPlan.price).dividedBy(
		cycleLength,
	);
	const newDailyRate = new BigNumber(newPlan.price).dividedBy(cycleLength);

	const proratedRefund = originalDailyRate.multipliedBy(remainingDays);
	const proratedCharge = newDailyRate.multipliedBy(remainingDays);

	return proratedCharge.minus(proratedRefund).toNumber();
}
