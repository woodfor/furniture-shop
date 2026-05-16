export const ROOM_CATEGORY_OPTIONS = [
  { label: "Living Room", value: "living-room" },
  { label: "Bedroom", value: "bedroom" },
  { label: "Dinning Room", value: "dinning-room" },
  { label: "Outdoor", value: "outdoor" },
] as const;

export const DEFAULT_NAV_ITEMS = [
  { label: "Living Room", href: "/category/living-room" },
  { label: "Bedroom", href: "/category/bedroom" },
  { label: "Dinning Room", href: "/category/dinning-room" },
  { label: "Outdoor", href: "/category/outdoor" },
  { label: "Showroom", href: "/visualizer" },
  { label: "Contact Us", href: "/contact-us" },
] as const;

export const ROOM_CATEGORY_LABEL_MAP = ROOM_CATEGORY_OPTIONS.reduce<
  Record<string, string>
>((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});
