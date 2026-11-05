// Form option lists — mirrored from longlakeloans-frontend/components/apply/options.ts
// so admin labels match exactly what applicants picked.
export type Option = { value: string; label: string };

export const LOAN_PURPOSES: Option[] = [
  { value: "debt_consolidation", label: "Debt consolidation" },
  { value: "credit_card", label: "Credit card refinancing/payoff" },
  { value: "home_improvement", label: "Home improvement/repairs" },
  { value: "emergency", label: "Emergency expenses" },
  { value: "medical", label: "Medical or dental bills" },
  { value: "major_purchase", label: "Major purchase" },
  { value: "auto_repair", label: "Auto repair or car expenses" },
  { value: "moving", label: "Moving or relocation" },
  { value: "rent_utilities", label: "Rent or utilities catch-up" },
  { value: "bill_payments", label: "Bill payments" },
  { value: "vacation_travel", label: "Vacation or travel" },
  { value: "wedding", label: "Wedding expenses" },
  { value: "education", label: "Education or tuition" },
  { value: "business", label: "Business expenses" },
  { value: "family_childcare", label: "Family or childcare expenses" },
  { value: "funeral", label: "Funeral or bereavement costs" },
  { value: "tax_payments", label: "Tax payments" },
  { value: "pet_veterinary", label: "Pet or veterinary expenses" },
  { value: "holiday_seasonal", label: "Holiday or seasonal spending" },
  { value: "other", label: "Other" },
];

export const US_STATES: Option[] = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["DC", "District of Columbia"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
].map(([value, label]) => ({ value, label }));

export const EMPLOYMENT_STATUSES: Option[] = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "self_employed", label: "Self-employed" },
  { value: "retired", label: "Retired" },
  { value: "benefits", label: "Benefits" },
  { value: "unemployed", label: "Not employed" },
];

export const ACCOUNT_TYPES: Option[] = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
];

export function optionLabel(list: Option[], value: string | null | undefined) {
  if (!value) return "—";
  return list.find((o) => o.value === value)?.label ?? value.replace(/_/g, " ");
}
