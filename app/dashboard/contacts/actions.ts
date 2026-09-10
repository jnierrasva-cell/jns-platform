"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendSms } from "@/lib/sms/send";
import { sendGmailMessage } from "@/lib/google/send-email";

async function requireOrgMember(organizationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: membership } = await supabase
    .from("org_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!membership) throw new Error("Not a member of this organization");
  return { supabase, user };
}

export async function createContact(input: {
  organizationId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: "lead" | "booked" | "customer" | "inactive";
  note?: string;
}) {
  const { supabase, user } = await requireOrgMember(input.organizationId);

  const email = input.email?.trim().toLowerCase() || null;
  const phone = input.phone?.trim() || null;
  const firstName = input.firstName?.trim() || null;
  const lastName = input.lastName?.trim() || null;
  const status = input.status ?? "lead";

  if (!email && !phone) {
    throw new Error("Add an email or phone number");
  }
  if (email && !email.includes("@")) {
    throw new Error("Invalid email");
  }
  if (phone && phone.replace(/[\s\-()]/g, "").length < 8) {
    throw new Error("Enter a valid phone including country code");
  }

  if (email) {
    const { data: existing } = await supabase
      .from("contacts")
      .select("id")
      .eq("organization_id", input.organizationId)
      .ilike("email", email)
      .maybeSingle();

    if (existing) {
      throw new Error("A contact with this email already exists");
    }
  }

  const { data: contact, error } = await supabase
    .from("contacts")
    .insert({
      organization_id: input.organizationId,
      email,
      phone,
      first_name: firstName,
      last_name: lastName,
      status,
      source: "manual",
      tags: ["manual"],
      last_contacted_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !contact) {
    throw new Error(error?.message ?? "Could not create contact");
  }

  const note = input.note?.trim();
  if (note) {
    await supabase.from("contact_notes").insert({
      organization_id: input.organizationId,
      contact_id: contact.id,
      body: note,
      created_by: user.id,
    });
  }

  revalidatePath("/dashboard/contacts");
  revalidatePath("/dashboard");
  return { contactId: contact.id };
}

export async function updateContact(input: {
  contactId: string;
  organizationId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: "lead" | "booked" | "customer" | "inactive";
}) {
  await requireOrgMember(input.organizationId);
  const supabase = await createClient();

  const updates: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };

  if (input.firstName !== undefined) {
    updates.first_name = input.firstName.trim() || null;
  }
  if (input.lastName !== undefined) {
    updates.last_name = input.lastName.trim() || null;
  }
  if (input.email !== undefined) {
    const email = input.email.trim().toLowerCase();
    if (email && !email.includes("@")) throw new Error("Invalid email");
    updates.email = email || null;
  }
  if (input.phone !== undefined) {
    const phone = input.phone.trim();
    if (phone && phone.replace(/[\s\-()]/g, "").length < 8) {
      throw new Error("Enter a valid phone including country code");
    }
    updates.phone = phone || null;
  }
  if (input.status !== undefined) {
    updates.status = input.status;
  }

  const { error } = await supabase
    .from("contacts")
    .update(updates)
    .eq("id", input.contactId)
    .eq("organization_id", input.organizationId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/contacts");
  revalidatePath(`/dashboard/contacts/${input.contactId}`);
}

export async function addContactNote(input: {
  organizationId: string;
  contactId: string;
  body: string;
}) {
  const { supabase, user } = await requireOrgMember(input.organizationId);

  const body = input.body.trim();
  if (!body) throw new Error("Note cannot be empty");

  const { error } = await supabase.from("contact_notes").insert({
    organization_id: input.organizationId,
    contact_id: input.contactId,
    body,
    created_by: user.id,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/contacts/${input.contactId}`);
}

export async function sendContactEmail(input: {
  organizationId: string;
  contactId: string;
  subject: string;
  body: string;
}) {
  const { supabase } = await requireOrgMember(input.organizationId);

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, email, first_name")
    .eq("id", input.contactId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (!contact?.email) {
    throw new Error("This contact has no email address");
  }

  await sendGmailMessage({
    organizationId: input.organizationId,
    toEmail: contact.email,
    subject: input.subject,
    body: input.body,
    contactId: contact.id,
  });

  await supabase
    .from("contacts")
    .update({
      last_contacted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", contact.id);

  revalidatePath(`/dashboard/contacts/${contact.id}`);
  revalidatePath("/dashboard/contacts");
}

export async function sendContactSms(input: {
  organizationId: string;
  contactId: string;
  body: string;
}) {
  const { supabase } = await requireOrgMember(input.organizationId);

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, phone, first_name")
    .eq("id", input.contactId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (!contact?.phone) {
    throw new Error("This contact has no phone number");
  }

  await sendSms({
    organizationId: input.organizationId,
    toPhone: contact.phone,
    body: input.body,
    contactId: contact.id,
  });

  await supabase
    .from("contacts")
    .update({
      last_contacted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", contact.id);

  revalidatePath(`/dashboard/contacts/${contact.id}`);
  revalidatePath("/dashboard/contacts");
}