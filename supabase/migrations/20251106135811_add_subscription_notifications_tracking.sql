/*
  # Add Subscription Notifications Tracking

  1. Purpose
    - Track when notifications were last shown to users
    - Store notification preferences
    - Enable one-notification-per-day logic

  2. Changes
    - Add last_notification_shown_at to subscriptions table
    - Add notification_dismissed_at to subscriptions table
    - These fields help track when to show notifications again

  3. Notes
    - last_notification_shown_at: When the last notification was displayed
    - notification_dismissed_at: When user dismissed/acknowledged the notification
*/

-- Add notification tracking fields to subscriptions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'last_notification_shown_at'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN last_notification_shown_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'notification_dismissed_at'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN notification_dismissed_at timestamptz;
  END IF;
END $$;