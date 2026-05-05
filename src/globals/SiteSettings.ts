import type { GlobalConfig } from "payload";

import { DEFAULT_NAV_ITEMS } from "@/lib/constants";

export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  label: "Site Settings",
  fields: [
    {
      name: "heroVideoURL",
      label: "Hero Video URL",
      type: "text",
      required: false,
      defaultValue:
        "https://cdn.pixabay.com/video/2021/09/09/88185-605677686_large.mp4",
    },
    {
      name: "navigationItems",
      label: "Navigation Items",
      type: "array",
      minRows: 1,
      fields: [
        {
          name: "label",
          type: "text",
          required: true,
        },
        {
          name: "href",
          type: "text",
          required: true,
        },
      ],
      defaultValue: DEFAULT_NAV_ITEMS.map((item) => ({
        label: item.label,
        href: item.href,
      })),
    },
    {
      name: "contactRecipientEmail",
      label: "Contact Recipient Email",
      type: "email",
      required: true,
      defaultValue: "admin@furnitureshop.com",
    },
  ],
};
