"use client";

import { PlasmicRootProvider, PlasmicComponent } from "@plasmicapp/loader-nextjs";
import { PLASMIC } from "@/plasmic-init";

export default function WelcomePage() {
  return (
    <PlasmicRootProvider loader={PLASMIC}>
      <PlasmicComponent component="/welcome" />
    </PlasmicRootProvider>
  );
}