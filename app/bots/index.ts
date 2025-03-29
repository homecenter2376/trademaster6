import { Bot } from "../store/mask";

import { type BuiltinMask } from "./typing";
export { type BuiltinMask } from "./typing";

export const BUILTIN_MASK_ID = 100000;

export const BUILTIN_MASK_STORE = {
  buildinId: BUILTIN_MASK_ID,
  masks: {} as Record<string, BuiltinMask>,
  get(id?: string) {
    if (!id) return undefined;
    return this.masks[id] as Bot | undefined;
  },
  add(m: BuiltinMask) {
    const mask = { ...m, id: this.buildinId++, builtin: true };
    this.masks[mask.id] = mask;
    return mask;
  },
};

// Initialize as empty array - will be populated from masks.json
export const BUILTIN_MASKS: BuiltinMask[] = [];

if (typeof window != "undefined") {
  // run in browser skip in next server
  fetch("/masks.json")
    .then((res) => res.json())
    .catch((error) => {
      console.error("[Fetch] failed to fetch masks", error);
      return { en: [] };
    })
    .then((masks) => {
      const { en = [] } = masks;
      // Only clear and add if we have new masks to add
      if (en.length > 0) {
        BUILTIN_MASKS.length = 0;
        en.forEach((m: BuiltinMask) => {
          const mask = BUILTIN_MASK_STORE.add(m);
          BUILTIN_MASKS.push(mask);
        });
      }
    });
}
