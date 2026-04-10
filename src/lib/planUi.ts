import type { WeeklyPlanDay } from "@/types/profile";

/** Small emoji hint for the day’s focus (gym vs home/rest get location tone). */
export function focusEmoji(day: WeeklyPlanDay): string {
  const f = day.focus.toLowerCase();
  const loc = day.location;
  if (loc === "rest") return "😴";
  if (loc === "home") return "🏠";
  if (f.includes("chest")) return "💪";
  if (f.includes("shoulder")) return "🏋️";
  if (f.includes("back")) return "🧗";
  if (f.includes("leg") || f.includes("lower") || f.includes("quad") || f.includes("ham")) return "🦵";
  if (f.includes("glute")) return "🍑";
  if (f.includes("arm") || f.includes("bicep") || f.includes("tricep")) return "💪";
  if (f.includes("cardio")) return "🏃";
  if (f.includes("mobility") || f.includes("stretch")) return "🧘";
  if (f.includes("core") || f.includes("abs")) return "🔥";
  return "🏋️";
}
