---
name: add-copy
description: Add or change user-facing text in the bilingual (Greek/English) UI. Use whenever a new string, label, button, error message, or empty state is introduced, and for any locale or date/number formatting.
---

The app is Greek-first and bilingual. All copy lives in `lib/translations.ts` (~1270 lines) as two parallel objects: `el` then `en`, closed with `as const`.

## TypeScript does not protect you here

```ts
type TranslationKey = keyof typeof translations.el
```

The key type is derived from the **Greek** object only. A key present in `el` but missing from `en` is therefore not a type error — and `getTranslation` falls back `dict[key] ?? translations.en[key] ?? String(key)`, so for an English-language user the raw key name renders in the UI.

There were 24 such keys until 2026-10 (English users saw `statusApproved` where a label belonged); they are fixed and the parity check below now prints nothing. Keep it that way.

## Procedure

1. Add the key to **both** blocks, under the matching section comment, with the same key name and ordering.
2. Run the parity check below. It must print nothing.
3. Reference it through the existing accessor (`getTranslation`, or the `t(...)` wiring the component already uses) — never an inline conditional.

## Parity check

```bash
el_start=$(grep -n "^  el: {" lib/translations.ts | cut -d: -f1)
en_start=$(grep -n "^  en: {" lib/translations.ts | cut -d: -f1)
end=$(grep -n "^} as const" lib/translations.ts | cut -d: -f1)
keys() { sed -n "$1,$2p" lib/translations.ts | grep -oE '^    [A-Za-z0-9_]+:' | tr -d ' :' | sort; }
echo "--- missing from en ---"
comm -23 <(keys $((el_start+1)) $((en_start-1))) <(keys $((en_start+1)) $((end-1)))
echo "--- missing from el ---"
comm -13 <(keys $((el_start+1)) $((en_start-1))) <(keys $((en_start+1)) $((end-1)))
```

Run it after your edit; it must print nothing.

## Formatting

Locale formatting lives in `lib/format.ts`: `localeFor`, `formatTime`, `formatDateShort`, `formatDateLong`, `formatDateFull`, `formatDateTimeFull`. Each takes `language` as its last argument.

In components, read from `useLanguage()` (`app/contexts/LanguageContext.tsx`), which returns `{ language, setLanguage, toggleLanguage, mounted, isEl, locale }`.

```ts
// ✅
const { isEl, language } = useLanguage()
formatDateLong(booking.startTime, language)

// ❌ do not reintroduce these
const locale = language === 'el' ? 'el-GR' : 'en-US'
new Date(x).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US')
```

Prefer `isEl` over re-deriving `language === 'el'`, and the `lib/format` helpers over using `locale` directly.

## Enum-ish values stored in the database

Values like vibes, heating agents, and energy classes are stored in **English** and translated at render time by `translateValue(language, value)`, which handles comma-separated lists, case-insensitive matching, and accent-stripped Greek. `reverseTranslateValue` maps a displayed string back to the stored key. When adding a new such value, add its `el` and `en` entries like any other key — the matcher resolves it by key, not by position.

## Scope note

`lib/translations.ts` has not been migrated to next-intl/i18next (known issue 9). Adding keys the existing way is correct; do not start a migration as a side effect of adding a label.
