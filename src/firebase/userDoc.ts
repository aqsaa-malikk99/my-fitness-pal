import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  writeBatch,
  type Firestore,
  type DocumentData,
} from "firebase/firestore";
import type {
  CalculatorEntry,
  CustomRecipe,
  DailyLogDoc,
  DailyMealPlanDoc,
  MealSlotId,
  MealSlots,
  ProgressEntry,
  UserProfile,
  UserRecipe,
  UserRecipeDoc,
} from "@/types/profile";
import type { JsonRecipeRow } from "@/lib/recipeMapping";
import { datasetDocId, jsonRowToUserRecipeDoc } from "@/lib/recipeMapping";
import { stripUndefinedDeep } from "@/lib/firestoreSanitize";
import { getDb } from "./config";
import { migrateProfile, emptyMealSlots } from "@/lib/profileMigrate";
import { MEAL_SLOT_ORDER } from "@/lib/mealSlotOrder";

const userPath = (uid: string) => `users/${uid}`;

export { emptyMealSlots };

export async function loadProfile(uid: string, database?: Firestore): Promise<UserProfile | null> {
  const db = database ?? getDb();
  const snap = await getDoc(doc(db, userPath(uid)));
  if (!snap.exists()) return null;
  return migrateProfile(snap.data() as UserProfile);
}

export async function saveProfile(uid: string, profile: UserProfile, database?: Firestore): Promise<void> {
  const db = database ?? getDb();
  const normalized = stripUndefinedDeep(migrateProfile(profile)) as UserProfile;
  await setDoc(doc(db, userPath(uid)), normalized, { merge: true });
}

export async function updateProfilePartial(
  uid: string,
  partial: Partial<UserProfile>,
  database?: Firestore
): Promise<void> {
  const db = database ?? getDb();
  const payload = stripUndefinedDeep({ ...partial, updatedAt: new Date().toISOString() });
  await updateDoc(doc(db, userPath(uid)), payload);
}

export async function listCustomRecipes(uid: string, database?: Firestore): Promise<CustomRecipe[]> {
  const db = database ?? getDb();
  const q = query(collection(db, userPath(uid), "customRecipes"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CustomRecipe, "id">) }));
}

export async function addCustomRecipe(
  uid: string,
  recipe: Omit<CustomRecipe, "id" | "createdAt">,
  database?: Firestore
): Promise<string> {
  const db = database ?? getDb();
  const ref = await addDoc(
    collection(db, userPath(uid), "customRecipes"),
    stripUndefinedDeep({
      ...recipe,
      createdAt: new Date().toISOString(),
    })
  );
  return ref.id;
}

export async function deleteCustomRecipe(uid: string, recipeId: string, database?: Firestore): Promise<void> {
  const db = database ?? getDb();
  await deleteDoc(doc(db, userPath(uid), "customRecipes", recipeId));
}

export async function listUserRecipes(uid: string, database?: Firestore): Promise<UserRecipe[]> {
  const db = database ?? getDb();
  const snap = await getDocs(collection(db, userPath(uid), "recipes"));
  const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as UserRecipeDoc) }));
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

export async function importDatasetRecipes(
  uid: string,
  rows: JsonRecipeRow[],
  database?: Firestore
): Promise<{ count: number }> {
  const db = database ?? getDb();
  const now = new Date().toISOString();
  let batch = writeBatch(db);
  let opCount = 0;
  let count = 0;
  for (const row of rows) {
    const ref = doc(db, userPath(uid), "recipes", datasetDocId(row.id));
    const payload = stripUndefinedDeep(jsonRowToUserRecipeDoc(row, now)) as DocumentData;
    batch.set(ref, payload, { merge: true });
    opCount++;
    count++;
    if (opCount >= 500) {
      await batch.commit();
      batch = writeBatch(db);
      opCount = 0;
    }
  }
  if (opCount > 0) await batch.commit();
  return { count };
}

export async function addUserRecipe(
  uid: string,
  data: Omit<UserRecipeDoc, "createdAt" | "updatedAt">,
  database?: Firestore
): Promise<string> {
  const db = database ?? getDb();
  const now = new Date().toISOString();
  const ref = await addDoc(
    collection(db, userPath(uid), "recipes"),
    stripUndefinedDeep({ ...data, createdAt: now, updatedAt: now }) as DocumentData
  );
  return ref.id;
}

export async function updateUserRecipe(
  uid: string,
  recipeDocId: string,
  data: Partial<UserRecipeDoc>,
  database?: Firestore
): Promise<void> {
  const db = database ?? getDb();
  const now = new Date().toISOString();
  await updateDoc(
    doc(db, userPath(uid), "recipes", recipeDocId),
    stripUndefinedDeep({ ...data, updatedAt: now }) as DocumentData
  );
}

/** Replaces the document so removed fields (e.g. tags) are cleared. */
export async function setUserRecipeFull(
  uid: string,
  recipeDocId: string,
  data: UserRecipeDoc,
  database?: Firestore
): Promise<void> {
  const db = database ?? getDb();
  await setDoc(doc(db, userPath(uid), "recipes", recipeDocId), stripUndefinedDeep(data) as DocumentData);
}

function stripRecipeIdFromMealSlots(
  slots: MealSlots | undefined,
  recipeId: string
): { next: MealSlots; changed: boolean } {
  const base = slots ?? emptyMealSlots();
  const next: MealSlots = { ...base };
  let changed = false;
  for (const slot of MEAL_SLOT_ORDER) {
    const a = base[slot];
    if (a?.recipeId === recipeId) {
      next[slot] = null;
      changed = true;
    }
  }
  return { next, changed };
}

/** Clears this recipe from the rolling template and every saved day plan. */
export async function removeRecipeFromAllMealPlans(uid: string, recipeDocId: string, database?: Firestore): Promise<void> {
  const db = database ?? getDb();
  const profile = await loadProfile(uid, db);
  if (profile) {
    const { next, changed } = stripRecipeIdFromMealSlots(profile.mealAssignments, recipeDocId);
    if (changed) await updateProfilePartial(uid, { mealAssignments: next }, db);
  }
  const map = await listDailyMealPlansMap(uid, db);
  for (const [date, assignments] of map) {
    const { next, changed } = stripRecipeIdFromMealSlots(assignments, recipeDocId);
    if (changed) await saveDailyMealPlan(uid, date, next, db);
  }
}

export async function deleteUserRecipe(uid: string, recipeDocId: string, database?: Firestore): Promise<void> {
  const db = database ?? getDb();
  await removeRecipeFromAllMealPlans(uid, recipeDocId, db);
  await deleteDoc(doc(db, userPath(uid), "recipes", recipeDocId));
}

export async function listProgress(uid: string, database?: Firestore, max = 60): Promise<ProgressEntry[]> {
  const db = database ?? getDb();
  const q = query(
    collection(db, userPath(uid), "progress"),
    orderBy("date", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProgressEntry, "id">) }));
}

export async function addProgressEntry(
  uid: string,
  entry: Omit<ProgressEntry, "id">,
  database?: Firestore
): Promise<string> {
  const db = database ?? getDb();
  const ref = await addDoc(collection(db, userPath(uid), "progress"), stripUndefinedDeep(entry));
  return ref.id;
}

export async function deleteProgressEntry(uid: string, entryId: string, database?: Firestore): Promise<void> {
  const db = database ?? getDb();
  await deleteDoc(doc(db, userPath(uid), "progress", entryId));
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getDailyLog(
  uid: string,
  date: string,
  database?: Firestore
): Promise<DailyLogDoc | null> {
  const db = database ?? getDb();
  const snap = await getDoc(doc(db, userPath(uid), "dailyLogs", date));
  if (!snap.exists()) return null;
  return snap.data() as DailyLogDoc;
}

export async function getDailyMealPlan(
  uid: string,
  date: string,
  database?: Firestore
): Promise<DailyMealPlanDoc | null> {
  const db = database ?? getDb();
  const snap = await getDoc(doc(db, userPath(uid), "dailyMealPlans", date));
  if (!snap.exists()) return null;
  return snap.data() as DailyMealPlanDoc;
}

/** Persists explicit meal assignments for one calendar day only (does not change other days). */
export async function saveDailyMealPlan(
  uid: string,
  date: string,
  mealAssignments: MealSlots,
  database?: Firestore
): Promise<void> {
  const db = database ?? getDb();
  await setDoc(
    doc(db, userPath(uid), "dailyMealPlans", date),
    stripUndefinedDeep({
      date,
      mealAssignments,
      updatedAt: new Date().toISOString(),
    }) as DocumentData,
    { merge: true }
  );
}

/** All days with an explicit saved meal plan (for calendar dots + resolution). */
export async function listDailyMealPlansMap(
  uid: string,
  database?: Firestore
): Promise<Map<string, MealSlots>> {
  const db = database ?? getDb();
  const snap = await getDocs(collection(db, userPath(uid), "dailyMealPlans"));
  const m = new Map<string, MealSlots>();
  for (const d of snap.docs) {
    const data = d.data() as DailyMealPlanDoc;
    if (data.mealAssignments) m.set(d.id, data.mealAssignments);
  }
  return m;
}

export async function saveDailyLog(
  uid: string,
  docDate: string,
  updates: { slotDone?: Partial<DailyLogDoc["slotDone"]> },
  database?: Firestore
): Promise<void> {
  const db = database ?? getDb();
  const ref = doc(db, userPath(uid), "dailyLogs", docDate);
  const prev = await getDoc(ref);
  const prevSlot = prev.exists() ? (prev.data() as DailyLogDoc).slotDone ?? {} : {};
  const slotDone = updates.slotDone ? { ...prevSlot, ...updates.slotDone } : prevSlot;
  await setDoc(
    ref,
    stripUndefinedDeep({
      date: docDate,
      slotDone,
      updatedAt: new Date().toISOString(),
    }) as DailyLogDoc,
    { merge: true }
  );
}

export async function listCalculatorDay(
  uid: string,
  date: string,
  database?: Firestore
): Promise<CalculatorEntry[]> {
  const db = database ?? getDb();
  const q = query(collection(db, userPath(uid), "foodLog"), where("date", "==", date));
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CalculatorEntry, "id">) }));
  rows.sort((a, b) => a.label.localeCompare(b.label));
  return rows;
}

export async function addCalculatorItem(
  uid: string,
  item: Omit<CalculatorEntry, "id">,
  database?: Firestore
): Promise<string> {
  const db = database ?? getDb();
  const ref = await addDoc(collection(db, userPath(uid), "foodLog"), stripUndefinedDeep(item));
  return ref.id;
}

export async function deleteCalculatorItem(uid: string, itemId: string, database?: Firestore): Promise<void> {
  const db = database ?? getDb();
  await deleteDoc(doc(db, userPath(uid), "foodLog", itemId));
}

/** Removes food-log rows tied to a meal-slot check (used when unchecking a slot). */
export async function deleteFoodLogEntriesForMealSlot(
  uid: string,
  date: string,
  slot: MealSlotId,
  database?: Firestore,
): Promise<void> {
  const items = await listCalculatorDay(uid, date, database);
  const db = database ?? getDb();
  for (const i of items) {
    if (i.fromMealSlot === slot) {
      await deleteDoc(doc(db, userPath(uid), "foodLog", i.id));
    }
  }
}
