function cleanString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normaliseTier(tier) {
  const value = cleanString(tier).toLowerCase();
  if (value === "pro") return "pro";
  if (value === "premium") return "premium";
  return "basic";
}

module.exports = {
  cleanString,
  normaliseTier
};