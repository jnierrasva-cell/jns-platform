"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type TodayBooking = {
  id: string;
  title: string;
  starts_at: string;
  contacts:
    | { first_name: string | null; last_name: string | null; email: string | null }
    | { first_name: string | null; last_name: string | null; email: string | null }[]
    | null;
};

function subscribeToLocalDate() {
  return () => {};
}

function getLocalDate() {
  return new Intl.DateTimeFormat().format(new Date());
}

function getContactName(booking: TodayBooking) {
  const contact = Array.isArray(booking.contacts)
    ? booking.contacts[0]
    : booking.contacts;
  if (!contact) return "No contact linked";
  return (
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    contact.email ||
    "No contact linked"
  );
}

export function TodaySchedule({ bookings }: { bookings: TodayBooking[] }) {
  const localDate = useSyncExternalStore(
    subscribeToLocalDate,
    getLocalDate,
    () => null,
  );

  const todaysBookings = localDate
    ? bookings.filter(
        (booking) =>
          new Intl.DateTimeFormat().format(new Date(booking.starts_at)) ===
          localDate,
      )
    : [];

  return (
    <Card className="mt-6 overflow-hidden shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Today&apos;s schedule</CardTitle>
          <CardDescription className="mt-1">
            Times shown in your browser timezone.
          </CardDescription>
        </div>
        <Link
          href="/dashboard/bookings"
          className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-text-secondary underline underline-offset-2 hover:text-foreground"
        >
          View schedule
        </Link>
      </CardHeader>
      <CardContent>
        {localDate === null ? (
          <p className="py-3 text-sm text-text-muted" aria-live="polite">
            Loading today&apos;s schedule...
          </p>
        ) : todaysBookings.length === 0 ? (
          <p className="py-3 text-sm text-text-muted">
            No bookings scheduled today.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {todaysBookings.map((booking) => (
              <li
                key={booking.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {booking.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-text-secondary">
                    {getContactName(booking)}
                  </p>
                </div>
                <time
                  dateTime={booking.starts_at}
                  className="shrink-0 rounded-full bg-surface-inset px-3 py-1.5 text-sm font-medium tabular-nums text-foreground"
                >
                  {new Date(booking.starts_at).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
