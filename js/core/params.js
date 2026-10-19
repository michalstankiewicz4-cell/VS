// Parameter schemas of the model kits (TurretKit, CarKit ...): a list of [key, label, min, max, step, default] rows, with 1-element rows as section titles.
// A toggle is a row 0..1 with step 1. The labs build their sliders from the schema; `sanitize` keeps imported / stored data safe.
export const schemaDefaults = (SCHEMA) => Object.fromEntries(SCHEMA.filter((s) => s.length > 1).map((s) => [s[0], s[5]]));

export function makeSanitize(SCHEMA) {
  const defaults = schemaDefaults(SCHEMA);
  // unknown keys dropped, numbers clamped and snapped to the step, missing ones taken from the defaults
  return (raw) => {
    const out = { ...defaults };
    if (!raw || typeof raw !== 'object') return out;
    for (const s of SCHEMA) {
      if (s.length < 2) continue;
      const [k, , lo, hi, step] = s, v = Number(raw[k]);
      if (Number.isFinite(v)) out[k] = Math.round(Math.min(hi, Math.max(lo, v)) / step) * step;
      out[k] = +out[k].toFixed(3);
    }
    return out;
  };
}
