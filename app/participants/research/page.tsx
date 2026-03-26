import { Suspense } from "react";
import TeamBoard from "../_components/TeamBoard";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem" }}>Loading…</div>}>
      <TeamBoard teamKey="hypothesis" />
    </Suspense>
  );
}

