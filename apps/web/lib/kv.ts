import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function getWaitlistCount(): Promise<number> {
  const count = await redis.get<number>("waitlist_count");
  return count ?? 0;
}

export async function incrementWaitlistCount(): Promise<number> {
  return redis.incr("waitlist_count");
}

export async function addWaitlistEntry(entry: {
  email: string;
  propertyType?: string;
  unitCount?: string;
  desiredFeatures?: string;
  createdAt: string;
}): Promise<void> {
  await redis.lpush("waitlist_emails", JSON.stringify(entry));
}
