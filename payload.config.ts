import { postgresAdapter } from "@payloadcms/db-postgres";
import { resendAdapter } from "@payloadcms/email-resend";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";

import { Furniture } from "@/collections/Furniture";
import { Media } from "@/collections/Media";
import { Model3DHookLogs } from "@/collections/Model3DHookLogs";
import { Users } from "@/collections/Users";
import { SiteSettings } from "@/globals/SiteSettings";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const resendApiKey = process.env.RESEND_API_KEY;
const r2Endpoint = process.env.R2_ENDPOINT;
const r2Bucket = process.env.R2_BUCKET;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2MediaPrefix = process.env.R2_MEDIA_PREFIX?.trim() || "media";

const r2Configured = Boolean(r2Endpoint && r2Bucket && r2AccessKeyId && r2SecretAccessKey);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: dirname,
      importMapFile: path.resolve(dirname, "src/app/(payload)/importMap.js"),
    },
  },
  collections: [Users, Media, Furniture, Model3DHookLogs],
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
  plugins: [
    s3Storage({
      enabled: r2Configured,
      bucket: r2Bucket ?? "",
      collections: {
        media: {
          prefix: r2MediaPrefix,
          signedDownloads: {
            // Serve large 3D assets via presigned object-storage URLs instead of proxy streaming.
            shouldUseSignedURL: ({ filename }) =>
              /\.(glb|gltf|fbx|obj|usdz|stl|3mf)$/i.test(filename),
            expiresIn: 60 * 60,
          },
        },
      },
      config: {
        endpoint: r2Endpoint,
        region: "auto",
        credentials: {
          accessKeyId: r2AccessKeyId ?? "",
          secretAccessKey: r2SecretAccessKey ?? "",
        },
      },
      useCompositePrefixes: true,
    }),
  ],
  secret: process.env.PAYLOAD_SECRET ?? "furniture-shop-dev-secret",
  typescript: {
    outputFile: path.resolve(dirname, "src/payload-types.ts"),
  },
});
