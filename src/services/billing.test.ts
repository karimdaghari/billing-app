import { describe, it, expect } from "vitest";
import {
	calculateProratedAmount,
	calculateProratedCharge,
	getBillingCycleEndDate,
} from "./billing";
import type { SubscriptionPlanSchema } from "@/db/schema";
import { isSameDay } from "date-fns";

describe("calculateProratedAmount", () => {
	const originalPlan: SubscriptionPlanSchema = {
		id: crypto.randomUUID(),
		name: "Basic",
		price: 100,
		billing_cycle: "monthly",
		status: "active",
	};

	const newPlan: SubscriptionPlanSchema = {
		id: crypto.randomUUID(),
		name: "Pro",
		price: 200,
		billing_cycle: "monthly",
		status: "active",
	};

	it("should handle change on the first day of the cycle", () => {
		const changeDate = new Date("2024-10-01");
		const result = calculateProratedAmount({
			originalPlan,
			newPlan,
			changeDate,
		});
		const expectedAmount = 200 - 100;
		expect(result).toBeCloseTo(expectedAmount, 2);
	});

	it("should calculate prorated amount correctly for upgrade", () => {
		const changeDate = new Date("2024-09-10");
		const result = calculateProratedAmount({
			originalPlan,
			newPlan,
			changeDate,
		});
		const expectedAmount = (200 - 100) * (21 / 30); // 21 days remaining in a 30-day cycle
		expect(result).toBeCloseTo(expectedAmount, 2);
	});

	it("should calculate prorated amount correctly for downgrade", () => {
		const changeDate = new Date("2024-10-15");
		const result = calculateProratedAmount({
			originalPlan: newPlan,
			newPlan: originalPlan,
			changeDate,
		});
		const expectedAmount = (100 - 200) * (16 / 30); // 16 days remaining in a 30-day cycle
		expect(result).toBeCloseTo(expectedAmount, 2);
	});

	it("should handle change on the last day of the cycle", () => {
		const changeDate = new Date("2024-10-30");
		const result = calculateProratedAmount({
			originalPlan,
			newPlan,
			changeDate,
		});
		const expectedAmount = (200 - 100) * (1 / 30); // 1 day remaining in a 30-day cycle
		expect(result).toBeCloseTo(expectedAmount, 2);
	});

	it("should handle yearly billing cycle", () => {
		const yearlyOriginalPlan: SubscriptionPlanSchema = {
			...originalPlan,
			billing_cycle: "yearly",
			price: 1000,
		};
		const yearlyNewPlan: SubscriptionPlanSchema = {
			...newPlan,
			billing_cycle: "yearly",
			price: 2000,
		};
		const changeDate = new Date("2024-07-01");
		const result = calculateProratedAmount({
			originalPlan: yearlyOriginalPlan,
			newPlan: yearlyNewPlan,
			changeDate,
		});

		// Calculate the number of days remaining in the year
		const daysInYear = 365;
		const daysRemaining = daysInYear - 182; // July 1st is the 183rd day of the year (182 days have passed)

		// Calculate expected prorated amounts
		const originalProratedRefund = (1000 / daysInYear) * daysRemaining;
		const newProratedCharge = (2000 / daysInYear) * daysRemaining;

		const expectedAmount = newProratedCharge - originalProratedRefund;

		expect(result).toBeCloseTo(expectedAmount, 2);
	});
});

describe("calculateProratedCharge", () => {
	it("should calculate prorated charge correctly for a partial month", () => {
		const fullBillingAmount = 90;
		const changeDate = new Date("2024-10-10"); // 10th day of a 30-day month
		const result = calculateProratedCharge({
			fullBillingAmount,
			billing_cycle: "monthly",
			changeDate,
		});

		// Expected prorated charge: $3 per day * 21 days = $63
		const expectedAmount = 63;

		expect(result.toNumber()).toBeCloseTo(expectedAmount, 2);
	});
});
