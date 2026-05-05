import { postgresAdapter } from "@payloadcms/db-postgres";
import { resendAdapter } from "@payloadcms/email-resend";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";

import { Furniture } from "@/collections/Furniture";
import { Media } from "@/collections/Media";
import { Users } from "@/collections/Users";
import { SiteSettings } from "@/globals/SiteSettings";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const resendApiKey = process.env.RESEND_API_KEY;

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: dirname,
      importMapFile: path.resolve(dirname, "src/app/(payload)/importMap.js"),
    },
  },
  collections: [Users, Media, Furniture],
  globals: [SiteSettings],
  editor: lexicalEditor(),
  db: postgresAdapter({
    pool: {
      connectionString:
        process.env.DATABASE_URI ?? "postgresql://postgres:postgres@localhost:5432/furniture_shop",
    },
  }),
  email: resendApiKey
    ? resendAdapter({
        apiKey: resendApiKey,
        defaultFromAddress:
          process.env.RESEND_FROM_EMAIL ?? "noreply@furnitureshop.com",
        defaultFromName: process.env.RESEND_FROM_NAME ?? "Furniture Shop",
      })
    : undefined,
  secret: process.env.PAYLOAD_SECRET ?? "furniture-shop-dev-secret",
  typescript: {
    outputFile: path.resolve(dirname, "src/payload-types.ts"),
  },
});
