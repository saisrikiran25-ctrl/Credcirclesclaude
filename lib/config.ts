/** Single place to rename the product. */
export const APP_NAME = "Circlo";
export const APP_TAGLINE = "SHG for Gen Z";
export const APP_ONE_LINER =
  "Pool small amounts with people you trust, lend to each other, and keep every rupee visible.";

export const CITIES = [
  "Hyderabad",
  "Bengaluru",
  "Pune",
  "Delhi NCR",
  "Mumbai",
  "Chennai",
  "Ahmedabad",
] as const;

export const SEGMENTS = [
  { id: "student", label: "College student", blurb: "18-24, hostel/PG, limited income" },
  { id: "professional", label: "Young professional", blurb: "22-30, early career, gig/freelance" },
  { id: "club", label: "Campus club / team", blurb: "Group with a treasury" },
  { id: "microentrepreneur", label: "Microentrepreneur", blurb: "Young seller, freelancer, small vendor" },
] as const;

export const CIRCLE_TYPES = [
  { id: "college", label: "College group" },
  { id: "hostel", label: "Hostel group" },
  { id: "friends", label: "Friend circle" },
  { id: "professionals", label: "Young professionals' group" },
  { id: "club", label: "Campus club/team" },
] as const;

export const PURPOSES = [
  { id: "education", label: "Education / fees" },
  { id: "skills", label: "Skills / upskilling" },
  { id: "emergency", label: "Emergency" },
  { id: "business", label: "Micro-business (inventory, equipment, working capital)" },
  { id: "gadgets", label: "Gadgets / lifestyle" },
  { id: "event", label: "Event / club" },
] as const;

export type CityName = (typeof CITIES)[number];
export type SegmentId = (typeof SEGMENTS)[number]["id"];
export type CircleTypeId = (typeof CIRCLE_TYPES)[number]["id"];
export type PurposeId = (typeof PURPOSES)[number]["id"];
