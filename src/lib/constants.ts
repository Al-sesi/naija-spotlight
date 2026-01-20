export const NIGERIAN_STATES = [
  "All States",
  "Nationwide",
  "Remote",
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT (Abuja)",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
] as const;

export const OPPORTUNITY_TYPES = [
  { value: "government", label: "Recruitment", color: "bg-category-government" },
  { value: "ngo", label: "NGO Grants", color: "bg-category-ngo" },
  { value: "tech", label: "Tech Events", color: "bg-category-tech" },
  { value: "career", label: "Career", color: "bg-category-career" },
  { value: "scholarship", label: "Scholarships", color: "bg-category-scholarship" },
  { value: "social", label: "Social Events", color: "bg-category-social" },
] as const;

export const APPLICATION_STATUSES = [
  { value: "saved", label: "Saved", color: "bg-status-saved" },
  { value: "applied", label: "Applied", color: "bg-status-applied" },
  { value: "shortlisted", label: "Shortlisted", color: "bg-status-shortlisted" },
  { value: "rejected", label: "Rejected", color: "bg-status-rejected" },
] as const;

export type OpportunityType = typeof OPPORTUNITY_TYPES[number]["value"];
export type ApplicationStatus = typeof APPLICATION_STATUSES[number]["value"];
export type NigerianState = typeof NIGERIAN_STATES[number];

export const OWNER_EMAILS = [
  "abdulmajeedsesiadam@gmail.com",
  "naijalift01@gmail.com",
  "salomegift2018@gmail.com",
];