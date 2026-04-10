/**
 * One-off generator: run `node build-recipes.mjs` → writes recipes-data.js
 */
import fs from "fs";

function r(cat, title, ingredients, kcal, protein, note = "", source = null, fromData = null) {
  return {
    category: cat,
    title,
    ingredients,
    kcal: String(kcal),
    protein: String(protein),
    note,
    source,
    fromData,
  };
}

const breakfast = [
  r("breakfast", "Overnight oats (classic)", ["Rolled oats 50 g", "Semi-skimmed milk 150 ml", "Greek or low-fat yoghurt 80 g", "Chia seeds 1 tsp", "Berries or chopped apple", "Optional: 1 tsp honey"], "~320", "~14", "Mix night before; eat cold.", "https://www.bbcgoodfood.com/recipes/collection/overnight-oats-recipes"),
  r("breakfast", "Masala savoury oats", ["Rolled oats 45 g", "Water 200 ml", "Onion ¼ chopped", "Tomato ½ chopped", "Green chilli 1", "Turmeric ¼ tsp", "Cumin seeds ½ tsp", "Oil 1 tsp", "Salt", "Coriander to garnish"], "~280", "~9", "Cook like savoury porridge; desi twist.", null, "Inspired by common masala oats patterns"),
  r("breakfast", "Egg bhurji + 1 roti", ["Eggs 2", "Onion, tomato, green chilli", "Turmeric pinch", "Oil 1 tsp", "Wholemeal roti 1 medium"], "~340", "~22", "High protein desi breakfast."),
  r("breakfast", "Boiled eggs + fruit", ["Eggs 2 boiled", "Apple or orange 1"], "~220", "~18", "Quick uni morning."),
  r("breakfast", "Moong dal cheela", ["Soaked moong dal paste 80 g raw wt", "Onion + ginger + chilli", "Oil spray or 1 tsp oil", "Mint chutney 1 tbsp portion"], "~260", "~16", "Griddle like thin pancake."),
  r("breakfast", "Besan chilla", ["Besan 40 g", "Water to batter", "Onion, tomato, coriander", "Turmeric pinch", "Oil 1 tsp"], "~240", "~12", "Chickpea flour omelette style."),
  r("breakfast", "Dalia (broken wheat) porridge", ["Dalia 40 g dry", "Milk + water 250 ml", "Cardamom pinch", "Sweetener or ½ tsp honey"], "~280", "~9", "Fiber-rich warm bowl."),
  r("breakfast", "Banana peanut butter roti roll", ["Wholemeal roti 1", "Peanut butter 1 tbsp", "Banana ½ sliced"], "~320", "~12", "Portable; watch pb portion."),
  r("breakfast", "Low-fat yoghurt + granola small", ["Plain yoghurt 180 g", "Low-sugar granola 25 g", "Cinnamon pinch"], "~280", "~15", "Pre-portion granola."),
  r("breakfast", "Vegetable omelette", ["Eggs 2", "Spinach, peppers ½ cup", "Oil 1 tsp", "Feta 15 g optional"], "~280", "~20", "Fold veg into eggs."),
  r("breakfast", "Chana chaat (breakfast bowl)", ["Boiled kabuli chana 120 g", "Onion, tomato, cucumber", "Lemon, chaat masala pinch", "Green chilli"], "~320", "~18", "Meal-prep chana on Sunday."),
  r("breakfast", "Suji upma (light)", ["Rava 35 g dry", "Mustard seeds pinch", "Curry leaves if available", "Peas + carrot ½ cup", "Oil 1 tsp"], "~250", "~7", "South Indian style; keep oil low."),
  r("breakfast", "Paneer bhurji (light)", ["Crumble paneer 80 g", "Tomato onion masala", "Turmeric, chilli", "Oil 1 tsp"], "~300", "~22", "Saute until dry."),
  r("breakfast", "Avocado toast (1 slice)", ["Wholegrain bread 1 slice", "Avocado 35 g mash", "Lemon, chilli flakes", "Boiled egg 1 optional side"], "~260", "~14", "Optional egg boosts protein.", "https://www.nhs.uk/live-well/eat-well/how-to-eat-a-balanced-diet/eatwell-guide/"),
  r("breakfast", "Oats smoothie", ["Oats 30 g", "Banana ½", "Milk 200 ml", "Cinnamon", "Ice optional"], "~280", "~10", "Blitz until smooth."),
  r("breakfast", "Roti + leftover masala chicken", ["Roti 1", "Chicken curry 100 g lean pieces", "Cucumber sticks"], "~380", "~35", "Use batch chicken."),
  r("breakfast", "Greek yoghurt parfait", ["Yoghurt 150 g", "Berries 80 g", "Flaked almonds 8", "Honey ½ tsp"], "~240", "~16"),
  r("breakfast", "Stuffed roti (gobi light)", ["Grated cauliflower ½ cup cooked dry", "Spices dry", "Roti 1", "Oil 1 tsp total"], "~300", "~10", "Cook filling without extra oil."),
  r("breakfast", "Masala scrambled tofu", ["Firm tofu 120 g crumbled", "Onion tomato", "Turmeric, cumin", "Oil 1 tsp"], "~240", "~18", "Vegan high protein."),
  r("breakfast", "Egg sandwich (brown bread)", ["Bread 2 slices", "Eggs 1–2 sliced or mayo-free", "Lettuce, tomato"], "~300", "~18", "Skip mayo; use mustard if needed."),
  r("breakfast", "Rice flakes (poha) light", ["Poha 40 g", "Onion, peas", "Turmeric, lemon", "Oil 1 tsp", "Roasted peanuts 5 g"], "~270", "~8", "Rinse poha briefly."),
  r("breakfast", "Cottage cheese + fruit plate", ["Low-fat cottage cheese 120 g", "Melon or papaya 150 g", "Black pepper"], "~220", "~24", "Fast plate."),
];

const lunch = [
  r("lunch", "Chicken rice bowl (batch)", ["Chicken 100 g cooked", "Basmati rice 120 g cooked", "Cucumber raita 80 g"], "~440", "~35", "Your plan staple."),
  r("lunch", "Masoor daal + roti", ["Masoor daal 1 cup cooked", "Roti 1", "Salad"], "~380", "~22"),
  r("lunch", "Chana daal + sabzi + roti", ["Chana daal ¾ cup", "Mixed sabzi 1 cup", "Roti 1"], "~420", "~20"),
  r("lunch", "Grilled chicken salad pita", ["Chicken breast 120 g", "Wholemeal pita ½", "Lettuce tomato onion", "Yoghurt mint dip 2 tbsp"], "~400", "~38"),
  r("lunch", "Quinoa veg bowl", ["Cooked quinoa 150 g", "Roast veg 1 cup", "Chickpeas 80 g", "Lemon dressing 1 tsp oil"], "~420", "~18", null, "https://www.eatingwell.com/gallery/12279/our-best-quinoa-bowl-recipes/"),
  r("lunch", "Turkey or chicken lettuce wraps", ["Minced lean chicken 120 g", "Garlic ginger soy lite", "Lettuce cups 4", "Grated carrot"], "~350", "~36"),
  r("lunch", "Tuna salad sandwich", ["Canned tuna in water 1 small can", "Low-fat yoghurt 2 tbsp instead of mayo", "Celery onion", "Bread 2 slices wholemeal"], "~380", "~32", null, "https://www.nhs.uk/live-well/eat-well/food-types/how-to-eat-more-fish/"),
  r("lunch", "Rajma (kidney bean curry) + small rice", ["Rajma ¾ cup cooked", "Tomato onion gravy", "Oil 1 tsp", "Rice 80 g cooked"], "~430", "~18"),
  r("lunch", "Palak paneer (light) + roti", ["Paneer 70 g", "Spinach 2 cups pureed", "Milk 50 ml", "Roti 1"], "~420", "~24", "Limit cream."),
  r("lunch", "Chicken tikka pieces + salad", ["Chicken 120 g tikka cubes", "Onion rings, lemon", "Mint chutney 1 tbsp"], "~380", "~40"),
  r("lunch", "Fish curry + rice (weekly)", ["White fish 120 g", "Tomato coconut-lite gravy", "Rice 100 g"], "~420", "~34", "Optional fish from dietitian list."),
  r("lunch", "Mixed veg pulao (oil controlled)", ["Basmati rice 90 g dry → cooked", "Mixed veg 1.5 cups", "Oil 1.5 tsp", "Spices"], "~400", "~9", "Add yoghurt side for protein."),
  r("lunch", "Chickpea spinach stew", ["Chickpeas 150 g", "Spinach 2 cups", "Tomato base", "Cumin", "1 roti"], "~440", "~20"),
  r("lunch", "Lentil soup + wholemeal roll", ["Red lentils 60 g dry", "Carrot celery", "Vegetable stock", "Small roll 40 g"], "~380", "~20"),
  r("lunch", "Chicken shawarma bowl (homemade)", ["Chicken 120 g strips", "Cumin paprika marinade", "Brown rice 100 g", "Salad, toum replaced by yoghurt garlic"], "~450", "~40"),
  r("lunch", "Egg fried rice (cauliflower half swap)", ["Cauliflower rice 150 g + rice 50 g cooked", "Eggs 2", "Peas carrot", "Soy sauce 1 tsp", "Oil 1 tsp"], "~400", "~26"),
  r("lunch", "Stuffed bell pepper (quinoa)", ["Pepper 1 large", "Quinoa + turkey mince 100 g mix", "Tomato sauce no sugar"], "~400", "~32"),
  r("lunch", "Mediterranean chickpea salad", ["Chickpeas 150 g", "Cucumber tomato parsley", "Feta 20 g", "Olive oil 1 tsp", "Lemon"], "~410", "~18"),
  r("lunch", "Chicken noodle soup (veg noodles)", ["Chicken breast 100 g shredded", "Vegetable soup base", "Wholewheat noodles 40 g dry"], "~360", "~34"),
  r("lunch", "Aloo gobi (dry) + daal + roti", ["Potato cauliflower dry sabzi 1 cup", "Daal ½ cup", "Roti 1"], "~400", "~14"),
  r("lunch", "Soba + edamame sesame", ["Soba noodles 50 g dry", "Edamame 80 g", "Sesame 1 tsp", "Soy ginger dressing"], "~380", "~20"),
  r("lunch", "Chicken Caesar salad (yoghurt dressing)", ["Chicken 120 g", "Romaine 2 cups", "Parmesan 10 g", "Yoghurt lemon garlic dressing"], "~380", "~40"),
  r("lunch", "Falafel bowl (baked)", ["Baked falafels 3 small", "Hummus 2 tbsp", "Salad", "Pickle"], "~420", "~16", "Bake instead of fry."),
  r("lunch", "Thai basil chicken (light)", ["Chicken mince 120 g", "Thai basil handful", "Chilli garlic", "Jasmine rice 100 g"], "~450", "~36", "Use minimal oil."),
];

const dinner = [
  r("dinner", "Low-cal chicken steak (dietitian style)", ["Chicken breast steaks 200–250 g total (4 thin pieces meal-prep)", "Olive oil 2 tbsp total marinade", "Garlic powder 1 tsp", "Paprika 1 tsp", "Salt 1 tsp", "Black pepper ½ tsp", "Cayenne ¼ tsp optional", "Parsley or thyme garnish"], "~260", "~40", "Per 1 steak serving from photo notes; split batch.", null, "Macros & ingredients from your data/PHOTO chicken steak images"),
  r("dinner", "Wholemeal pasta + lean beef sauce", ["Wholewheat pasta 70 g dry", "Lean mince 100 g", "Tomato tin, onion garlic", "Italian herbs"], "~480", "~34", "Dinner list: Pasta — from dietitian sheet.", "https://www.bbcgoodfood.com/recipes/collection/healthy-pasta-recipes"),
  r("dinner", "Chicken tomato soup", ["Chicken breast 150 g", "Tinned tomatoes 400 g", "Onion carrot celery", "Stock", "Herbs"], "~320", "~38", "Dietitian dinner list item.", null, "From dietitian photo dinner list"),
  r("dinner", "Steamed chicken + greens", ["Chicken breast 150 g", "Ginger spring onion steam", "Broccoli + beans 2 cups", "Soy 1 tsp + sesame drops"], "~350", "~45", "Minimal oil steam.", null, "Dietitian: Steam chicken"),
  r("dinner", "Chicken curry + steamed veg", ["Chicken thigh trimmed 120 g", "Onion tomato gravy 1 tsp oil", "Steamed carrots + beans 1.5 cups"], "~430", "~35", "Curry oil controlled.", null, "Dietitian dinner list"),
  r("dinner", "Pasta salad (protein)", ["Wholewheat pasta 60 g dry", "Chicken 100 g or chickpeas", "Cherry tomato cucumber", "Yoghurt herb dressing"], "~420", "~32", null, "https://www.eatingwell.com/healthy-pasta-salad-recipes-7095526"),
  r("dinner", "Steam fish with ginger (optional)", ["White fish fillet 150 g", "Ginger soy steam", "Pak choi 1 cup"], "~320", "~34", "Optional fish note from sheet.", null, "Dietitian: Steam fish optional"),
  r("dinner", "Masala chicken + salad + roti", ["Chicken thigh 120 g", "Yoghurt marinade", "Salad", "Roti 1", "Oil 1 tsp cook"], "~430", "~38"),
  r("dinner", "Turkey meatballs + zucchini noodles", ["Turkey mince 120 g", "Zucchini spirals 2 cups", "Marinara 150 g"], "~380", "~38"),
  r("dinner", "Eggplant + daal + roti", ["Roast baingan mash", "Toor daal ½ cup", "Roti 1"], "~400", "~16"),
  r("dinner", "Chicken seekh (oven) + raita", ["Seekh mix lean chicken 150 g", "Onion mint", "Raita 100 g"], "~420", "~36", "Bake skewers."),
  r("dinner", "Stuffed zucchini (mince)", ["Zucchini boats", "Chicken mince 100 g", "Tomato topping", "Cheese 15 g"], "~380", "~36"),
  r("dinner", "Keema matar (lean) + roti", ["Lean mince 120 g", "Peas ½ cup", "Tomato onion", "Roti 1"], "~450", "~32"),
  r("dinner", "Grilled salmon + sweet potato", ["Salmon 120 g", "Sweet potato 150 g roast", "Green beans"], "~480", "~34", "Omega-3 boost meal."),
  r("dinner", "Chicken tortilla soup", ["Chicken 120 g", "Black beans 80 g", "Tomato broth", "Tortilla strip 20 g baked"], "~400", "~36"),
  r("dinner", "Bhindi masala dry + daal + roti", ["Okra dry 1 cup", "Masoor daal ½ cup", "Roti 1"], "~400", "~15"),
  r("dinner", "Prawn garlic stir-fry + rice", ["Prawns 130 g", "Garlic ginger", "Veg mix", "Rice 90 g cooked"], "~430", "~34"),
  r("dinner", "Stuffed tomato (quinoa paneer)", ["Large tomato 2 hollowed", "Paneer 50 g + quinoa filling", "Bake"], "~360", "~22"),
  r("dinner", "Chicken pho-style broth bowl", ["Chicken breast 120 g", "Rice noodles 40 g dry", "Broth spices star anise lite", "Bean sprouts herbs"], "~400", "~36", "Keep noodles modest."),
  r("dinner", "Mushroom stroganoff (yoghurt)", ["Mushrooms 200 g", "Chicken strips 80 g optional", "Yoghurt paprika sauce", "Wholewheat pasta 55 g dry"], "~440", "~30"),
  r("dinner", "Sarson saag + makki roti small + daal", ["Saag 1 cup", "Makki roti 1 small or wheat 1", "Maash daal ¼ cup"], "~430", "~16", "Portion control roti."),
  r("dinner", "Chicken chilli dry (minimal oil)", ["Chicken 150 g strips", "Capsicum onion", "Soy vinegar", "Oil 1.5 tsp"], "~400", "~40"),
  r("dinner", "Greek chicken tray bake", ["Chicken thigh skinless 130 g", "Potato 120 g", "Peppers onion", "Oregano lemon"], "~460", "~38", "One tray easy."),
  r("dinner", "Tofu stir-fry + brown rice", ["Firm tofu 150 g", "Mixed veg", "Ginger garlic", "Brown rice 100 g cooked"], "~420", "~22"),
  r("dinner", "Channa palak + roti", ["Kabuli chana 120 g", "Spinach gravy", "Roti 1"], "~430", "~18"),
  r("dinner", "Baked pesto chicken + veg", ["Chicken 150 g", "Pesto 1 tbsp", "Tray veg 2 cups"], "~430", "~42"),
  r("dinner", "Veg kofta yoghurt gravy + roti", ["Bottle gourd kofta baked 3", "Yoghurt cashew-light gravy", "Roti 1"], "~400", "~12"),
  r("dinner", "Harissa chicken + couscous", ["Chicken 130 g", "Harissa 1 tsp paste", "Wholewheat couscous 50 g dry", "Salad"], "~450", "~40"),
];

const snack = [
  r("snack", "Protein yoghurt cup", ["Yoghurt 150 g", "Chia 1 tsp", "Berries"], "~180", "~15"),
  r("snack", "Apple + almonds", ["Apple 1", "Almonds 10"], "~160", "~5"),
  r("snack", "Cottage cheese + tomatoes", ["Cottage cheese 100 g", "Cherry tomatoes"], "~140", "~18"),
  r("snack", "Hummus + carrot", ["Hummus 40 g", "Carrot sticks 150 g"], "~180", "~8"),
  r("snack", "Boiled egg + cucumber", ["Egg 1", "Cucumber"], "~120", "~12"),
  r("snack", "Roasted chana handful", ["Dry roasted chana 30 g"], "~130", "~8"),
  r("snack", "Protein shake (powder)", ["Water or milk 250 ml", "Whey scoop 25 g"], "~180", "~22", "If supplementing."),
  r("snack", "Rice cake + peanut butter", ["Rice cake 2", "Peanut butter 1 tsp each thin"], "~180", "~7"),
  r("snack", "Dates + walnuts", ["Dates 2", "Walnut halves 3"], "~150", "~3"),
  r("snack", "Edamame pods salted light", ["Edamame 100 g pods"], "~120", "~12"),
  r("snack", "Caprese skewer", ["Mozzarella light 40 g", "Tomato basil", "Balsamic spray"], "~120", "~12"),
  r("snack", "Popcorn air-popped", ["Corn kernels 15 g unpopped"], "~120", "~3", "No butter."),
  r("snack", "Tuna on cucumber rounds", ["Tuna 60 g", "Cucumber slices"], "~120", "~16"),
  r("snack", "Sliced chicken roll-ups", ["Chicken slices 80 g", "Lettuce mustard"], "~140", "~22"),
  r("snack", "Fruit chaat (no syrup)", ["Mixed fruit 200 g", "Lemon chaat masala"], "~120", "~2"),
  r("snack", "Roasted makhana 25 g", ["Foxnuts 25 g", "Spices dry"], "~90", "~3"),
];

const drink = [
  r("drink", "Cinnamon green tea + ACV + honey (anti-inflammatory)", ["Water", "Cinnamon stick 1", "Green tea bag or leaves", "Apple cider vinegar 1 tbsp after cooling", "Honey 1 tsp"], "~40", "~0", "Boil water with cinnamon 5 min; steep green tea 2–3 min; strain; cool slightly; stir ACV + honey. Drink before last meal.", null, "Steps from data/PHOTO-2025-12-15-14-45-45 2.jpg"),
  r("drink", "Golden milk (turmeric latte)", ["Semi-skimmed milk 200 ml", "Turmeric ½ tsp", "Black pepper pinch", "Cinnamon pinch", "Sweetener small"], "~120", "~8", "Warm; anti-inflammatory spices."),
  r("drink", "Ginger lemon warm water", ["Water 250 ml", "Ginger slices", "Lemon ½", "Optional honey ½ tsp"], "~25", "~0", "Morning hydration."),
  r("drink", "Green juice (cucumber celery spinach)", ["Cucumber ½", "Celery stalk 1", "Spinach handful", "Lemon squeeze"], "~50", "~2", "Cold-press or blitz + strain."),
  r("drink", "Mint cucumber cooler", ["Cucumber 100 g", "Mint leaves", "Water", "Lime", "Salt pinch"], "~20", "~1", "No sugar soda alternative."),
  r("drink", "Rose hibiscus tea (no sugar)", ["Dried hibiscus", "Water", "Rose water drop"], "~5", "~0", "Steep 5 min."),
  r("drink", "Berry kefir smoothie", ["Kefir or yoghurt 200 ml", "Mixed berries 80 g", "Flax 1 tsp ground"], "~200", "~12", "Gut-friendly option."),
  r("drink", "Tart cherry + water", ["Tart cherry concentrate 1 tbsp", "Water 300 ml"], "~80", "~0", "Recovery drink some athletes use."),
  r("drink", "Tulsi ginger tea", ["Holy basil tea bag", "Ginger", "Hot water"], "~5", "~0", "Herbal calm."),
  r("drink", "Moringa lemon water", ["Moringa powder ½ tsp", "Water", "Lemon"], "~15", "~1", "Trend greens — watch sourcing."),
];

const all = [...breakfast, ...lunch, ...dinner, ...snack, ...drink];

if (all.length !== 100) {
  console.error("Expected 100 recipes, got", all.length);
  process.exit(1);
}

const banner = `/* Auto-generated by build-recipes.mjs — ${all.length} items. Run: node build-recipes.mjs */\n`;
fs.writeFileSync("recipes-data.js", banner + "window.MFP_RECIPES = " + JSON.stringify(all, null, 2) + ";\n");
console.log("Wrote recipes-data.js with", all.length, "recipes.");
