import { describe, it, expect } from "vitest";
import {
	calculateProratedAmount,
	calculateProratedCharge,
	getBillingCycleEndDate,
} from ".";
import type { SubscriptionPlanSchema } from "@/db/models/subscription-plan";
import { differenceInDays, getDaysInYear } from "date-fns";

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
			startDate,
			endDate: changeDate,
		});

		expect(result).toBeCloseTo(expectedAmount, 2);
	});

	it("should calculate prorated charge correctly for a full month", () => {
		const fullBillingAmount = 100;
		const startDate = new Date("2024-10-01");
		const endDate = new Date("2024-10-31");

		const result = calculateProratedCharge({
			fullBillingAmount,
			billing_cycle: "monthly",
			startDate,
			endDate,
		});

		expect(result).toBeCloseTo(100, 2);
	});

	it("should calculate prorated charge correctly for a partial year", () => {
		const fullBillingAmount = 1200;
		const startDate = new Date("2024-01-01");
		const endDate = new Date("2024-06-30");
		const diffDays = differenceInDays(endDate, startDate) + 1;
		const expectedAmount = Number(
			((fullBillingAmount / getDaysInYear(startDate)) * diffDays).toFixed(2),
		);

		const result = calculateProratedCharge({
			fullBillingAmount,
			billing_cycle: "yearly",
			startDate,
			endDate,
		});

		expect(result).toBeCloseTo(expectedAmount, 2);
	});

	it("should handle leap years correctly", () => {
		const fullBillingAmount = 366;
		const startDate = new Date("2024-01-01");
		const endDate = new Date("2024-12-31");

		const result = calculateProratedCharge({
			fullBillingAmount,
			billing_cycle: "yearly",
			startDate,
			endDate,
		});

		expect(result).toBeCloseTo(366, 2);
	});
});

describe("calculateProratedAmount", () => {
	const basicPlan: SubscriptionPlanSchema = {
		id: crypto.randomUUID(),
		name: "Basic",
		price: 10,
		billing_cycle: "monthly",
		status: "active",
	};

	const proPlan: SubscriptionPlanSchema = {
		id: crypto.randomUUID(),
		name: "Pro",
		price: 20,
		billing_cycle: "monthly",
		status: "active",
	};

	it("should handle change on the first day of the cycle", () => {
		const startDate = new Date("2024-10-01");
		const changeDate = new Date("2024-10-01");
		const endDate = new Date(getBillingCycleEndDate(startDate, "monthly"));
		const result = calculateProratedAmount({
			originalPlan: basicPlan,
			newPlan: proPlan,
			changeDate,
			startDate,
			endDate,
		});
		const originalPlanProratedAmount = calculateProratedCharge({
			fullBillingAmount: basicPlan.price,
			billing_cycle: "monthly",
			startDate: startDate,
			endDate: changeDate,
		});
		const proPlanProratedAmount = calculateProratedCharge({
			fullBillingAmount: proPlan.price,
			billing_cycle: "monthly",
			startDate: changeDate,
			endDate,
		});
		const expectedAmount = proPlanProratedAmount - originalPlanProratedAmount;
		expect(result).toBeCloseTo(expectedAmount, 2);
	});

	it("should calculate prorated amount correctly for upgrade", () => {
		const startDate = new Date("2024-09-01");
		const changeDate = new Date("2024-09-10");
		const endDate = new Date(getBillingCycleEndDate(startDate, "monthly"));
		const result = calculateProratedAmount({
			originalPlan: basicPlan,
			newPlan: proPlan,
			startDate,
			endDate,
			changeDate,
		});
		const originalPlanProratedAmount = calculateProratedCharge({
			fullBillingAmount: basicPlan.price,
			billing_cycle: "monthly",
			startDate: startDate,
			endDate: changeDate,
		});
		const proPlanProratedAmount = calculateProratedCharge({
			fullBillingAmount: proPlan.price,
			billing_cycle: "monthly",
			startDate: changeDate,
			endDate,
		});
		const expectedAmount = proPlanProratedAmount - originalPlanProratedAmount;
		expect(result).toBeCloseTo(expectedAmount, 2);
	});

	it("should calculate prorated amount correctly for downgrade", () => {
		const startDate = new Date("2024-10-01");
		const changeDate = new Date("2024-10-15");
		const endDate = new Date("2024-10-31");
		const result = calculateProratedAmount({
			originalPlan: proPlan,
			newPlan: basicPlan,
			changeDate,
			startDate,
			endDate,
		});
		const originalPlanProratedAmount = calculateProratedCharge({
			fullBillingAmount: proPlan.price,
			billing_cycle: "monthly",
			startDate: startDate,
			endDate: changeDate,
		});
		const basicPlanProratedAmount = calculateProratedCharge({
			fullBillingAmount: basicPlan.price,
			billing_cycle: "monthly",
			startDate: changeDate,
			endDate,
		});
		const expectedAmount = originalPlanProratedAmount - basicPlanProratedAmount;
		expect(result).toBeCloseTo(expectedAmount, 2);
	});

	it("should handle change on the last day of the cycle", () => {
		const startDate = new Date("2024-10-01");
		const changeDate = new Date("2024-10-31");
		const endDate = new Date("2024-10-31");
		const result = calculateProratedAmount({
			originalPlan: basicPlan,
			newPlan: proPlan,
			changeDate,
			startDate,
			endDate,
		});
		const expectedAmount = 10;
		expect(result).toBeCloseTo(expectedAmount, 2);
	});

	it("should handle yearly billing cycle", () => {
		const yearlyOriginalPlan: SubscriptionPlanSchema = {
			...basicPlan,
			billing_cycle: "yearly",
			price: 1000,
		};
		const yearlyNewPlan: SubscriptionPlanSchema = {
			...proPlan,
			billing_cycle: "yearly",
			price: 2000,
		};
		const startDate = new Date("2024-01-01");
		const changeDate = new Date("2024-07-01");
		const endDate = new Date(getBillingCycleEndDate(startDate, "yearly"));
		const result = calculateProratedAmount({
			originalPlan: yearlyOriginalPlan,
			newPlan: yearlyNewPlan,
			changeDate,
			startDate,
			endDate,
		});

		const originalPlanProratedAmount = calculateProratedCharge({
			fullBillingAmount: yearlyOriginalPlan.price,
			billing_cycle: "yearly",
			startDate: startDate,
			endDate: changeDate,
		});
		const newPlanProratedAmount = calculateProratedCharge({
			fullBillingAmount: yearlyNewPlan.price,
			billing_cycle: "yearly",
			startDate: changeDate,
			endDate,
		});
		const expectedAmount = newPlanProratedAmount - originalPlanProratedAmount;

		expect(result).toBeCloseTo(expectedAmount, 2);
	});

	it("should throw an error when changeDate is before startDate", () => {
		const startDate = new Date("2024-10-01");
		const changeDate = new Date("2024-09-30");
		const endDate = new Date("2024-10-31");

		expect(() =>
			calculateProratedAmount({
				originalPlan: basicPlan,
				newPlan: proPlan,
				changeDate,
				startDate,
				endDate,
			}),
		).toThrow("Invalid date range");
	});

	it("should throw an error when changeDate is after endDate", () => {
		const startDate = new Date("2024-10-01");
		const changeDate = new Date("2024-11-01");
		const endDate = new Date("2024-10-31");

		expect(() =>
			calculateProratedAmount({
				originalPlan: basicPlan,
				newPlan: proPlan,
				changeDate,
				startDate,
				endDate,
			}),
		).toThrow("Invalid date range");
	});

	it("should throw an error when endDate is before startDate", () => {
		const startDate = new Date("2024-10-01");
		const changeDate = new Date("2024-10-15");
		const endDate = new Date("2024-09-30");

		expect(() =>
			calculateProratedAmount({
				originalPlan: basicPlan,
				newPlan: proPlan,
				changeDate,
				startDate,
				endDate,
			}),
		).toThrow("Invalid date range");
	});

	it("should throw an error when plans have different billing cycles", () => {
		const startDate = new Date("2024-10-01");
		const changeDate = new Date("2024-10-15");
		const endDate = new Date("2024-10-31");
		const yearlyPlan: SubscriptionPlanSchema = {
			...proPlan,
			billing_cycle: "yearly",
		};

		expect(() =>
			calculateProratedAmount({
				originalPlan: basicPlan,
				newPlan: yearlyPlan,
				changeDate,
				startDate,
				endDate,
			}),
		).toThrow("Plans must have the same billing cycle");
	});
});
