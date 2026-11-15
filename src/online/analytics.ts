// PostHog analytics. Only the events below are sent: no autocapture, no
// session recording, no nicknames. Without VITE_POSTHOG_KEY nothing loads.
import type { PostHog } from 'posthog-js';

export type AnalyticsEvent =
  | 'game_started'
  | 'day_completed'
  | 'semester_completed'
  | 'share_tapped'
  | 'vendor_viewed'
  | 'vendor_order_tapped'
  | 'advertise_tapped'
  | 'clearance_completed'
  | 'graduated'
  | 'withdrawn';

const KEY = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let loading: Promise<PostHog | null> | null = null;

/** Downloads and starts PostHog. Called once the page is idle. */
export function initAnalytics(): Promise<PostHog | null> {
  if (!KEY) return Promise.resolve(null);
  loading ??= import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(KEY, {
        api_host: HOST,
        autocapture: false,
        capture_pageview: true,
        capture_pageleave: false,
        disable_session_recording: true,
        disable_surveys: true,
        persistence: 'localStorage',
        person_profiles: 'identified_only',
      });
      return posthog;
    })
    .catch(() => null);
  return loading;
}

export function track(event: AnalyticsEvent, props?: Record<string, string | number | boolean>): void {
  if (!KEY) return;
  void initAnalytics().then((ph) => ph?.capture(event, props));
}
