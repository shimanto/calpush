import { db } from '../lib/db.js';

export type Plan = 'free' | 'pro' | 'business';

interface PlanLimits {
  maxPushPerMonth: number;      // -1 = unlimited
  maxCalendars: number;
  maxNotifyDomains: number;
  customNotifyTime: boolean;
  customReminderMinutes: boolean;
}

const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxPushPerMonth: 200,
    maxCalendars: 1,
    maxNotifyDomains: 3,
    customNotifyTime: false,
    customReminderMinutes: false,
  },
  pro: {
    maxPushPerMonth: -1,
    maxCalendars: 5,
    maxNotifyDomains: -1,
    customNotifyTime: true,
    customReminderMinutes: true,
  },
  business: {
    maxPushPerMonth: -1,
    maxCalendars: -1,
    maxNotifyDomains: -1,
    customNotifyTime: true,
    customReminderMinutes: true,
  },
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[(plan as Plan)] ?? PLAN_LIMITS.free;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function getUsage(userId: string) {
  const month = currentMonth();
  const record = await db.usageRecord.findUnique({
    where: { userId_month: { userId, month } },
  });
  return { month, pushCount: record?.pushCount ?? 0 };
}

export async function incrementPushCount(userId: string): Promise<{ allowed: boolean; count: number }> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const limits = getPlanLimits(user.plan);
  const month = currentMonth();

  const record = await db.usageRecord.upsert({
    where: { userId_month: { userId, month } },
    update: { pushCount: { increment: 1 } },
    create: { userId, month, pushCount: 1 },
  });

  if (limits.maxPushPerMonth !== -1 && record.pushCount > limits.maxPushPerMonth) {
    // Rolled back: decrement
    await db.usageRecord.update({
      where: { userId_month: { userId, month } },
      data: { pushCount: { decrement: 1 } },
    });
    return { allowed: false, count: record.pushCount - 1 };
  }

  return { allowed: true, count: record.pushCount };
}

export async function canAddCalendar(userId: string): Promise<boolean> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const limits = getPlanLimits(user.plan);
  if (limits.maxCalendars === -1) return true;

  const count = await db.calendarLink.count({ where: { userId } });
  return count < limits.maxCalendars;
}

export async function getUserPlanInfo(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const limits = getPlanLimits(user.plan);
  const usage = await getUsage(userId);
  const calendarCount = await db.calendarLink.count({ where: { userId } });

  return {
    plan: user.plan,
    stripeSubStatus: user.stripeSubStatus,
    planExpiresAt: user.planExpiresAt,
    billingEnabled: !!process.env.STRIPE_SECRET_KEY,
    limits,
    usage: {
      pushCount: usage.pushCount,
      pushLimit: limits.maxPushPerMonth,
      pushRemaining: limits.maxPushPerMonth === -1 ? -1 : Math.max(0, limits.maxPushPerMonth - usage.pushCount),
      calendarCount,
      calendarLimit: limits.maxCalendars,
    },
  };
}
