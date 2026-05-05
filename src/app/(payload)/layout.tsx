import configPromise from "@payload-config";
import { RootLayout } from "@payloadcms/next/layouts";
import "@payloadcms/next/css";

import { importMap } from "./importMap";
import { serverFunction } from "./serverFunction";

export default function Layout({ children }: { children: React.ReactNode }) {
  return RootLayout({
    children,
    config: configPromise,
    importMap,
    serverFunction,
  });
}
