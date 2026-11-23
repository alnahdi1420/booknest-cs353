import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogView } from "./CatalogView";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = { title: "Browse books" };

export default function BooksPage() {
  return (
    <div className="container-page py-10">
      <Suspense fallback={<Spinner label="Loading catalog..." />}>
        <CatalogView />
      </Suspense>
    </div>
  );
}
