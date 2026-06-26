const companySuffixes = new Set([
  "inc",
  "llc",
  "ltd",
  "corp",
  "corporation",
  "company",
  "co"
]);
const genericRoleWords = new Set([
  "analyst",
  "intern",
  "engineer",
  "associate",
  "manager",
  "consultant",
  "developer"
]);
const specialtyRoleWords = new Set([
  "software",
  "data",
  "financial",
  "finance",
  "business",
  "product",
  "marketing",
  "accounting",
  "operations",
  "cybersecurity",
  "security",
  "sales",
  "frontend",
  "backend",
  "fullstack",
  "engineering",
  "machine",
  "learning",
  "quantitative",
  "investment",
  "wealth",
  "retirement",
  "tax"
]);

function normalizeBase(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || null;
}

export function normalizeCompany(value: string | null | undefined) {
  const normalized = normalizeBase(value);

  if (!normalized) {
    return null;
  }

  const words = normalized.split(" ");

  while (words.length > 1 && companySuffixes.has(words[words.length - 1])) {
    words.pop();
  }

  return words.join(" ") || null;
}

export function normalizeRole(value: string | null | undefined) {
  return normalizeBase(value);
}

function getRoleWords(role: string) {
  return role.split(" ").filter(Boolean);
}

function countMeaningfulRoleWords(role: string) {
  return getRoleWords(role).filter((word) => !genericRoleWords.has(word))
    .length;
}

function hasSpecialtyRoleWord(role: string) {
  return getRoleWords(role).some((word) => specialtyRoleWords.has(word));
}

function isGenericRole(role: string) {
  const words = getRoleWords(role);

  return words.length > 0 && words.every((word) => genericRoleWords.has(word));
}

function isSpecificEnoughContainedRole(role: string) {
  const words = getRoleWords(role);

  return (
    countMeaningfulRoleWords(role) >= 3 ||
    (words.length >= 2 && hasSpecialtyRoleWord(role))
  );
}

export function areLikelySameRole(
  roleA: string | null | undefined,
  roleB: string | null | undefined
) {
  const normalizedRoleA = normalizeRole(roleA);
  const normalizedRoleB = normalizeRole(roleB);

  if (!normalizedRoleA || !normalizedRoleB) {
    return false;
  }

  if (isGenericRole(normalizedRoleA) || isGenericRole(normalizedRoleB)) {
    return false;
  }

  if (normalizedRoleA === normalizedRoleB) {
    return true;
  }

  const shorterRole =
    normalizedRoleA.length <= normalizedRoleB.length
      ? normalizedRoleA
      : normalizedRoleB;
  const longerRole =
    shorterRole === normalizedRoleA ? normalizedRoleB : normalizedRoleA;

  if (!isSpecificEnoughContainedRole(shorterRole)) {
    return false;
  }

  return ` ${longerRole} `.includes(` ${shorterRole} `);
}
