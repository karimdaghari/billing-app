import { describe, it, expect } from "vitest";
import {
	calculateProratedAmount,
	calculateProratedCharge,
	getBillingCycleEndDate,
} from ".";
import type { SubscriptionPlanSchema } from "@/db/models/subscription-plan";

describe("getBillingCycleEndDate", () => {
	it("should return the correct end date for monthly billing cycle", () => {
		const currentDate = new Date("2024-03-15");
		const result = getBillingCycleEndDate(currentDate, "monthly");
		expect(result).toBe("2024-04-15");
	});

	it("should return the correct end date for yearly billing cycle", () => {
		const currentDate = new Date("2024-03-15");
		const result = getBillingCycleEndDate(currentDate, "yearly");
		expect(result).toBe("2025-03-15");
	});

	it("should handle month rollover correctly for monthly billing", () => {
		const currentDate = new Date("2024-12-31");
		const result = getBillingCycleEndDate(currentDate, "monthly");
		expect(result).toBe("2025-01-31");
	});

	it("should handle year rollover correctly for yearly billing", () => {
		const currentDate = new Date("2024-12-31");
		const result = getBillingCycleEndDate(currentDate, "yearly");
		expect(result).toBe("2025-12-31");
	});

	it("should handle leap years correctly for monthly billing", () => {
		const currentDate = new Date("2024-01-31");
		const result = getBillingCycleEndDate(currentDate, "monthly");
		expect(result).toBe("2024-02-29"); // 2024 is a leap year
	});

	it("should handle leap years correctly for yearly billing", () => {
		const currentDate = new Date("2024-02-29");
		const result = getBillingCycleEndDate(currentDate, "yearly");
		expect(result).toBe("2025-02-28"); // 2025 is not a leap year
	});
});

describe("calculateProratedCharge", () => {
	it("should calculate prorated charge correctly for a partial month", () => {
		const fullBillingAmount = 100;
		const startDate = new Date("2024-10-01");
		const changeDate = new Date("2024-10-10");
		const expectedAmount = 32.26;

		const result = calculateProratedCharge({
			fullBillingAmount,
			billing_cycle: "monthly",
			changeDate,
			startDate,
		});

		expect(result).toBeCloseTo(expectedAmount, 2);
	});
});

describe.skip("calculateProratedAmount", () => {
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
