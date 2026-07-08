/** Slug helpers — turn a fault title into a stable, URL-safe id used as the
 *  item id and (later) as a deep-link fragment. Pure & unit-tested. */

/** "AUTO FLT - RUDDER TRIM 1(2) FAULT" -> "auto-flt-rudder-trim-1-2-fault" */
export function slugify(input: string): string {
  return input
    .normalize("NFKD") // split accented letters into base + diacritic
    .replace(/[̀-ͯ]/g, "") // drop combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // any run of non-alnum -> single dash
    .replace(/^-+|-+$/g, ""); // trim leading/trailing dashes
}

/** Ensure a slug is unique within a set of already-used slugs, appending
 *  -2, -3, … as needed. Used when generating ids for imported items. */
export function uniqueSlug(base: string, used: Set<string>): string {
  const slug = slugify(base) || "item";
  if (!used.has(slug)) return slug;
  let n = 2;
  while (used.has(`${slug}-${n}`)) n++;
  return `${slug}-${n}`;
}
