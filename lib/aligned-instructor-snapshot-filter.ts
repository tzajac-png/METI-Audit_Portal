/**
 * Remove METI course certification / legal boilerplate often pasted into form sheets
 * so it does not appear on the aligned instructor audit detail view.
 */
export function stripAlignedBoilerplateFromSnapshot(
  snapshot: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(snapshot)) {
    if (isAlignedBoilerplateField(k, v)) continue;
    out[k] = v;
  }
  return out;
}

function isAlignedBoilerplateField(key: string, value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  if (t.includes("By submitting this course for processing")) return true;
  if (t.includes("under the Michigan Emergency Training Institute")) return true;
  if (t.includes("I certify that the information submitted is accurate")) return true;
  if (t.includes("I acknowledge and agree that I am responsible")) return true;
  if (t.includes("I agree to retain all course records for a minimum of three")) return true;
  if (t.includes("Failure to maintain or provide required documentation")) return true;
  if (t.includes("Student rosters and sign-in sheets")) return true;
  if (t.includes("Skills check-off sheets") || t.includes("Skills checkoff sheets"))
    return true;
  if (t.includes("Course agendas and lesson plans")) return true;
  if (t.includes("Exams and assessment records")) return true;
  if (
    t.length > 600 &&
    /Michigan Emergency Training Institute \(METI\)/i.test(t) &&
    /quality assurance|compliance review|audit/i.test(t)
  ) {
    return true;
  }
  const ktrim = key.trim();
  if (
    /certif|acknowledg|agreement|legal|disclaimer|attestation|processing under/i.test(
      ktrim,
    ) &&
    t.length > 400
  ) {
    return true;
  }
  return false;
}
