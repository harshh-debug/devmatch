"use server";

import { unstable_update } from "@/auth";
import { redirect } from "next/navigation";

/**
 * Marks onboarding complete on the session JWT, then routes the user into the
 * authenticated app. Called after the intent step succeeds.
 */
export async function completeOnboarding() {
  await unstable_update({ onboardingComplete: true });
  redirect("/discover");
}
