import type { UserRecipe } from "@/types/profile";

export function RecipeMeta({ r, ownerName }: { r: UserRecipe; ownerName?: string }) {
  const bits: { key: string; label: string; className: string }[] = [];
  if (r.origin === "dataset") bits.push({ key: "plan", label: "Plan library", className: "recipe-pill recipe-pill--plan" });
  else bits.push({
    key: "yours",
    label: ownerName ? `My own · ${ownerName}` : "My own",
    className: "recipe-pill recipe-pill--yours",
  });
  if (r.tags?.includes("tea")) bits.push({ key: "tea", label: "Tea", className: "recipe-pill recipe-pill--tea" });
  if (r.tags?.includes("original")) bits.push({ key: "orig", label: "Original", className: "recipe-pill recipe-pill--original" });
  return (
    <div className="recipe-meta-row">
      {bits.map((b) => (
        <span key={b.key} className={b.className}>
          {b.label}
        </span>
      ))}
    </div>
  );
}

type Props = {
  recipe: UserRecipe | null;
  onClose: () => void;
  /** When set with onAssign, shows primary “Add to …” like the Recipes tab */
  assignSlotLabel?: string;
  onAssign?: (recipe: UserRecipe) => void | Promise<void>;
  recipeOwnerName?: string;
};

export default function RecipeDetailModal({ recipe, onClose, assignSlotLabel, onAssign, recipeOwnerName }: Props) {
  if (!recipe) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recipe-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="recipe-modal-title" className="modal-panel__title">
          {recipe.name}
        </h2>
        <RecipeMeta r={recipe} ownerName={recipe.origin === "user" ? recipeOwnerName : undefined} />
        <div className="recipe-card-tile__metrics" style={{ marginTop: "0.65rem" }}>
          <div className="recipe-metric">
            <span className="recipe-metric__v">{recipe.calories}</span>
            <span className="recipe-metric__u">kcal</span>
          </div>
          <div className="recipe-metric">
            <span className="recipe-metric__v">{recipe.proteinG}</span>
            <span className="recipe-metric__u">Protein (g)</span>
          </div>
          <div className="recipe-metric">
            <span className="recipe-metric__v">{recipe.carbsG}</span>
            <span className="recipe-metric__u">Carbs (g)</span>
          </div>
          <div className="recipe-metric">
            <span className="recipe-metric__v">{recipe.fatG}</span>
            <span className="recipe-metric__u">Fat (g)</span>
          </div>
        </div>
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <>
            <h3 className="modal-panel__sub">Ingredients</h3>
            <ul className="modal-panel__list">
              {recipe.ingredients.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </>
        )}
        <h3 className="modal-panel__sub">Instructions</h3>
        <p className="modal-panel__body">{recipe.instructions || "—"}</p>
        <div className="modal-panel__actions">
          {assignSlotLabel && onAssign && (
            <button type="button" className="btn btn-primary btn-block" onClick={() => void onAssign(recipe)}>
              Add to {assignSlotLabel}
            </button>
          )}
          <button type="button" className="btn btn-secondary btn-block" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
