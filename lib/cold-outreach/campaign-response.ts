export type PerformanceLevel = "excellent" | "good" | "average" | "poor";

type CampaignMetrics = {
	sentCount: number;
	openedCount: number;
	repliedCount: number;
	clickedCount: number;
	bouncedCount: number;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const toNumber = (value: unknown, fallback = 0) => {
	const num = typeof value === "number" ? value : Number(value ?? fallback);
	return Number.isFinite(num) ? num : fallback;
};

const toDate = (value?: unknown) => {
	if (!value) return undefined;
	const date = value instanceof Date ? value : new Date(value as string);
	return Number.isNaN(date.getTime()) ? undefined : date;
};

const computeMetrics = (campaign: any): CampaignMetrics => ({
	sentCount: toNumber(campaign?.sentCount),
	openedCount: toNumber(campaign?.openedCount),
	repliedCount: toNumber(campaign?.repliedCount),
	clickedCount: toNumber(campaign?.clickedCount),
	bouncedCount: toNumber(campaign?.bouncedCount ?? campaign?.bounceCount),
});

export const calculatePerformanceScore = (metrics: CampaignMetrics): PerformanceLevel => {
	const openRate = metrics.sentCount > 0 ? (metrics.openedCount / metrics.sentCount) * 100 : 0;
	const replyRate = metrics.sentCount > 0 ? (metrics.repliedCount / metrics.sentCount) * 100 : 0;
	const bounceRate = metrics.sentCount > 0 ? (metrics.bouncedCount / metrics.sentCount) * 100 : 0;

	if (openRate >= 30 && replyRate >= 3 && bounceRate <= 2) return "excellent";
	if (openRate >= 20 && replyRate >= 2 && bounceRate <= 5) return "good";
	if (openRate >= 10 && replyRate >= 1 && bounceRate <= 10) return "average";
	return "poor";
};

export const generateCampaignInsights = (metrics: CampaignMetrics): string[] => {
	const insights: string[] = [];
	const openRate = metrics.sentCount > 0 ? (metrics.openedCount / metrics.sentCount) * 100 : 0;
	const replyRate = metrics.sentCount > 0 ? (metrics.repliedCount / metrics.sentCount) * 100 : 0;
	const bounceRate = metrics.sentCount > 0 ? (metrics.bouncedCount / metrics.sentCount) * 100 : 0;

	if (openRate > 25) insights.push("Excellent open rate - your subject lines are performing well");
	else if (openRate < 10) insights.push("Low open rate - consider improving subject lines");

	if (replyRate > 2) insights.push("Strong reply rate - your messaging resonates with recipients");
	else if (replyRate < 1) insights.push("Low reply rate - consider refining your messaging approach");

	if (bounceRate > 5) insights.push("High bounce rate - review contact list quality");

	return insights;
};

export const calculateOptimalSendTimes = (campaign: any) => {
	const baseHour = 9; // 9 AM default

	if (campaign?.priority === "high" || campaign?.priority === "urgent") {
		return { hour: baseHour, day: "Monday" };
	}

	if (campaign?.status === "active") {
		return { hour: baseHour + 1, day: "Tuesday" };
	}

	return { hour: baseHour, day: "Wednesday" };
};

export const predictCampaignCompletion = (input: {
	status?: string;
	startDate?: string | Date | null;
	sentCount: number;
	contactCount: number;
}) => {
	if (input.status !== "active") return null;
	if (!input.startDate) return null;

	const startDate = input.startDate instanceof Date ? input.startDate : new Date(input.startDate);
	if (Number.isNaN(startDate.getTime())) return null;

	const elapsedDays = Math.max(1, (Date.now() - startDate.getTime()) / DAY_IN_MS);
	const sentRate = input.sentCount / elapsedDays;
	const remainingContacts = Math.max(0, input.contactCount - input.sentCount);
	if (sentRate <= 0) return null;

	const estimatedDays = remainingContacts / sentRate;
	return new Date(Date.now() + estimatedDays * DAY_IN_MS);
};

export const buildCampaignResponse = (campaign: any) => {
	const metrics = computeMetrics(campaign);
	const targetContacts = Array.isArray(campaign?.targetContacts) ? campaign.targetContacts : [];
	const targetSegments = Array.isArray(campaign?.targetSegments) ? campaign.targetSegments : [];
	const contactCount = Math.max(targetContacts.length, metrics.sentCount);

	const openRate = metrics.sentCount > 0 ? Math.round((metrics.openedCount / metrics.sentCount) * 100) : 0;
	const replyRate = metrics.sentCount > 0 ? Math.round((metrics.repliedCount / metrics.sentCount) * 100) : 0;
	const clickRate = metrics.sentCount > 0 ? Math.round((metrics.clickedCount / metrics.sentCount) * 100) : 0;
	const bounceRate = metrics.sentCount > 0 ? Math.round((metrics.bouncedCount / metrics.sentCount) * 100) : 0;

	const performance = calculatePerformanceScore(metrics);
	const insights = generateCampaignInsights(metrics);
	const optimalSendTime = calculateOptimalSendTimes(campaign);
	const estimatedCompletion = predictCampaignCompletion({
		status: campaign?.status,
		startDate: campaign?.startDate,
		sentCount: metrics.sentCount,
		contactCount,
	});

	const updatedAt = toDate(campaign?.updatedAt);
	const createdAt = toDate(campaign?.createdAt);
	const lastActivity = updatedAt ?? createdAt ?? new Date();

	return {
		...campaign,
		targetContacts,
		targetSegments,
		sentCount: metrics.sentCount,
		openedCount: metrics.openedCount,
		repliedCount: metrics.repliedCount,
		clickedCount: metrics.clickedCount,
		bouncedCount: metrics.bouncedCount,
		contactCount,
		openRate,
		replyRate,
		clickRate,
		bounceRate,
		performance,
		insights,
		optimalSendTime,
		estimatedCompletion,
		lastActivity,
	};
};
