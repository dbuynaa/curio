import { Suspense } from "react";

import { EditCollectionPage } from "../../_components/edit-collection-page";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return (
    <Suspense fallback={<div className="bg-background min-h-screen" />}>
      <EditCollectionPage id={id} />
    </Suspense>
  );
}
