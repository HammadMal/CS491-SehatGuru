import type { MealPlanItem, MealType } from "../types/meal.types";

type ParsedDish = Omit<MealPlanItem, "id" | "userId" | "planId" | "logged" | "createdAt">;

/**
 * Parses the meal plan markdown produced by the backend.
 *
 * Each dish line is enforced by the prompt to follow:
 *   - DISH_NAME | PORTION | NNN kcal | Ng protein | Ng carbs | Ng fat
 *
 * Returns [] if nothing could be parsed.
 */
export function parseMealPlan(markdown: string): ParsedDish[] {
  const results: ParsedDish[] = [];

  // Match section headers in any of these forms the LLM might produce:
  //   **Breakfast**  |  **Breakfast (~400 kcal)**  |  **Breakfast:**  |  ## Breakfast
  const sectionRegex =
    /\*\*(Breakfast|Lunch|Dinner|Snacks?)[^*]*\*\*|^#{1,3}\s*(Breakfast|Lunch|Dinner|Snacks?)\b/gim;
  const sectionMatches = [...markdown.matchAll(sectionRegex)];
  if (sectionMatches.length === 0) return [];

  for (let i = 0; i < sectionMatches.length; i++) {
    const match = sectionMatches[i];
    const rawLabel = (match[1] || match[2]).toLowerCase();

    let mealType: MealType;
    if (rawLabel === "breakfast") mealType = "Breakfast";
    else if (rawLabel === "lunch") mealType = "Lunch";
    else if (rawLabel === "dinner") mealType = "Dinner";
    else mealType = "Snack";

    const start = (match.index ?? 0) + match[0].length;
    const end =
      i + 1 < sectionMatches.length
        ? sectionMatches[i + 1].index ?? markdown.length
        : markdown.length;

    const sectionText = markdown.slice(start, end);

    for (const line of sectionText.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("-")) continue;
      if (/total|daily total/i.test(trimmed)) continue;

      // Expected: - NAME | PORTION | NNN kcal | Ng protein | Ng carbs | Ng fat
      const body = trimmed.replace(/^-\s*/, "").replace(/\*\*/g, "");
      const parts = body.split("|").map((p) => p.trim());

      if (parts.length < 4) continue;

      const foodName = parts[0].trim();

      const calories = extractNumber(parts, /(\d+(?:\.\d+)?)\s*kcal/i);
      const protein = extractNumber(parts, /(\d+(?:\.\d+)?)\s*g?\s*protein/i);
      const carbs = extractNumber(parts, /(\d+(?:\.\d+)?)\s*g?\s*carbs?/i);
      const fat = extractNumber(parts, /(\d+(?:\.\d+)?)\s*g?\s*fat/i);

      if (!foodName || calories <= 0) continue;

      results.push({ foodName, mealType, grams: 100, calories, protein, carbs, fat });
    }
  }

  return results;
}

function extractNumber(parts: string[], pattern: RegExp): number {
  for (const part of parts) {
    const m = part.match(pattern);
    if (m) return parseFloat(m[1]);
  }
  return 0;
}
