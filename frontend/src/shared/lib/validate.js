export const required = (msg) => (val) =>
  !String(val ?? "").trim() ? msg : null;

export const minLength = (n, msg) => (val) =>
  val?.length < n ? msg : null;

export const pattern = (re, msg) => (val) =>
  val && !re.test(val) ? msg : null;

export const match = (field, msg) => (val, form) =>
  val !== form[field] ? msg : null;

export const chain = (...rules) =>
  (val, form) => {
    for (const rule of rules) {
      const err = rule(val, form);
      if (err) return err;
    }
    return null;
  };

export function validate(form, schema) {
  const errors = {};
  for (const [field, rule] of Object.entries(schema)) {
    const msg = rule(form[field] ?? "", form);
    if (msg) errors[field] = msg;
  }
  return errors;
}
