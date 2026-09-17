"use client";

import { PlasmicRootProvider, PlasmicComponent } from "@plasmicapp/loader-nextjs";
import { PLASMIC } from "@/plasmic-init";

export default function Homepage() {
  return (
    <PlasmicRootProvider loader={PLASMIC}>
      <PlasmicComponent component="/homepage" />
    </PlasmicRootProvider>
  );
}