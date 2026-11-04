"use client";

import {
  Contact as ContactIcon,
  Download,
  MoreVertical,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContact,
  updateContact,
  sendContactEmail,
  sendContactSms,
  importContactsCsv,
  setContactPipelineStage,
} from "@/app/dashboard/contacts/actions";
import { CountryPhoneInput } from "@/components/country-phone-input";

// TEMP: full file restored from main; mobile cards applied in follow-up commit
export { ContactsClient } from "./contacts-client-main-body";
