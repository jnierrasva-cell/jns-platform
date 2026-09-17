import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: process.env.NEXT_PUBLIC_PLASMIC_PROJECT_ID!,
      token: process.env.NEXT_PUBLIC_PLASMIC_API_TOKEN!,
    },
  ],
  preview: true, // good while designing; later set false for production
});