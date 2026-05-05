# Base Story - Furniture Showcase Website

## Product Goal

Build a furniture showcase website first, with future-ready architecture for ecommerce expansion.

## Tech Stack Requirements

- Git
- Next.js
- React
- Payload CMS
- PostgreSQL
- shadcn/ui
- Tailwind CSS
- Resend

## Core Information Architecture

### Home Page

1. Hero section with a large banner video showing furniture being crafted.
2. Highlight content block with exact message:
   - `Low price, customisable, all included services`
3. Furniture card grid:
   - Furniture image
   - Price
   - `Inquire` button
   - Click-through to furniture detail page

### Furniture Detail Page

Required content:

- Photos
- Size
- Dimension information
- Detailed description
- Wood type
- Similar-type section at the bottom

### Contact Us

Contact form fields:

- Name
- Phone or email
- Message content

Submission behavior:

- Sends message to admin email
- Admin recipient email is configurable in CMS
- Email delivery service uses Resend

## CMS Data Model Requirements

### Room Categories (initial)

- living room
- bedroom
- dinning room
- outdoor

### URL / Slug Pattern

Furniture slug must follow:

- `[room-category]/[furniture-category]/[name]/[size]`

## Header & Navigation Requirements

- Global header with navigation bar.
- Navigation initially contains:
  - living room
  - bedroom
  - dinning room
  - outdoor
  - contact us
- Navigation items must be CMS-controlled to support future category expansion.

## Future-readiness

- Keep structure ready for future selling/ecommerce features.
- Keep category/navigation management centralized in CMS.
