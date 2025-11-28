import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, Loader2 } from 'lucide-react';

type EventKey = 'order_placed' | 'cart_abandoned_1h' | 'cart_abandoned_23h';

interface SettingRowState {
  event: EventKey;
  enabled: boolean;
  phonesText: string; // comma-separated
  loading: boolean;
  saving: boolean;
  lastVerifiedOk: boolean | null; // null = unknown, true/false = last verification result
}

const EVENT_DEFS: Record<EventKey, { label: string; hint: string }> = {
  order_placed: {
    label: 'Order successfully placed',
    hint: 'Notify when a customer order is completed (checkout.completed)',
  },
  cart_abandoned_1h: {
    label: 'Shopping cart abandoned for 1 hour',
    hint: 'Notify when a cart has been inactive for 1 hour',
  },
  cart_abandoned_23h: {
    label: 'Shopping cart abandoned for 23 hours',
    hint: 'Notify when a cart has been inactive for 23 hours',
  },
};

function normalizePhonesInput(text: string): string[] {
  // Split by comma, trim, remove empty, remove duplicates
  const list = text
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  // De-duplicate
  const unique = Array.from(new Set(list));
  return unique;
}

const SmsNotificationTab: React.FC = () => {
  const [rows, setRows] = useState<Record<EventKey, SettingRowState>>({
    order_placed: {
      event: 'order_placed',
      enabled: false,
      phonesText: '',
      loading: true,
      saving: false,
      lastVerifiedOk: null,
    },
    cart_abandoned_1h: {
      event: 'cart_abandoned_1h',
      enabled: false,
      phonesText: '',
      loading: true,
      saving: false,
      lastVerifiedOk: null,
    },
    cart_abandoned_23h: {
      event: 'cart_abandoned_23h',
      enabled: false,
      phonesText: '',
      loading: true,
      saving: false,
      lastVerifiedOk: null,
    },
  });

  const allLoading = useMemo(
    () => Object.values(rows).some((r) => r.loading),
    [rows]
  );

  useEffect(() => {
    const load = async () => {
      try {
        // Try to fetch all settings at once
        const { data, error } = await supabase
          .from('sms_notification_settings')
          .select('event_name, is_enabled, notification_phones');

        // If table missing or error, fall back to defaults (UI still allows saving which will create via upsert)
        if (error) {
          // Mark all as not loading to let user interact
          setRows((prev) => {
            const next = { ...prev };
            (Object.keys(next) as EventKey[]).forEach((k) => {
              next[k] = { ...next[k], loading: false };
            });
            return next;
          });
          return;
        }

        // Map data into rows
        const byEvent = new Map<string, { is_enabled: boolean; notification_phones: string[] }>();
        (data || []).forEach((row: any) => {
          if (row?.event_name) {
            byEvent.set(row.event_name, {
              is_enabled: !!row.is_enabled,
              notification_phones: Array.isArray(row.notification_phones)
                ? row.notification_phones
                : [],
            });
          }
        });

        setRows((prev) => {
          const next: Record<EventKey, SettingRowState> = { ...prev };
          (Object.keys(next) as EventKey[]).forEach((k) => {
            const found = byEvent.get(k);
            next[k] = {
              ...next[k],
              enabled: found?.is_enabled ?? false,
              phonesText: (found?.notification_phones || []).join(', '),
              loading: false,
              lastVerifiedOk: null,
            };
          });
          return next;
        });
      } catch {
        setRows((prev) => {
          const next = { ...prev };
          (Object.keys(next) as EventKey[]).forEach((k) => {
            next[k] = { ...next[k], loading: false };
          });
          return next;
        });
      }
    };

    load();
  }, []);

  const handleToggle = (event: EventKey, checked: boolean) => {
    setRows((prev) => ({
      ...prev,
      [event]: {
        ...prev[event],
        enabled: checked,
        lastVerifiedOk: null,
      },
    }));
  };

  const handlePhonesChange = (event: EventKey, value: string) => {
    setRows((prev) => ({
      ...prev,
      [event]: {
        ...prev[event],
        phonesText: value,
        lastVerifiedOk: null,
      },
    }));
  };

  const saveOne = async (event: EventKey) => {
    setRows((prev) => ({
      ...prev,
      [event]: { ...prev[event], saving: true, lastVerifiedOk: null },
    }));

    try {
      const current = rows[event];
      const parsedPhones = normalizePhonesInput(current.phonesText);

      // Upsert the row; onConflict ensures a single row per event_name
      const { error: upsertErr } = await supabase
        .from('sms_notification_settings')
        .upsert(
          {
            event_name: event,
            is_enabled: current.enabled,
            notification_phones: parsedPhones,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'event_name' as any }
        );

      if (upsertErr) {
        alert(`Failed to save settings for ${EVENT_DEFS[event].label}: ${upsertErr.message || 'Unknown error'}`);
        setRows((prev) => ({
          ...prev,
          [event]: { ...prev[event], saving: false, lastVerifiedOk: false },
        }));
        return;
      }

      // Verify by reading back
      const { data: verify, error: vErr } = await supabase
        .from('sms_notification_settings')
        .select('event_name, is_enabled, notification_phones')
        .eq('event_name', event)
        .single();

      const verified =
        !vErr &&
        verify &&
        verify.event_name === event &&
        !!verify.is_enabled === !!current.enabled &&
        Array.isArray(verify.notification_phones) &&
        verify.notification_phones.join(',') === parsedPhones.join(',');

      if (verified) {
        alert(`Saved successfully: ${EVENT_DEFS[event].label}`);
        setRows((prev) => ({
          ...prev,
          [event]: { ...prev[event], saving: false, lastVerifiedOk: true },
        }));
      } else {
        alert(`Save verification failed for ${EVENT_DEFS[event].label}. Please try again.`);
        setRows((prev) => ({
          ...prev,
          [event]: { ...prev[event], saving: false, lastVerifiedOk: false },
        }));
      }
    } catch (e: any) {
      alert(`Error saving ${EVENT_DEFS[event].label}: ${e?.message || 'Unknown error'}`);
      setRows((prev) => ({
        ...prev,
        [event]: { ...prev[event], saving: false, lastVerifiedOk: false },
      }));
    }
  };

  const SaveButton: React.FC<{ event: EventKey }> = ({ event }) => {
    const state = rows[event];
    return (
      <button
        onClick={() => saveOne(event)}
        disabled={state.loading || state.saving}
        className={`px-3 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2 ${
          state.saving
            ? 'bg-gray-300 text-gray-700 cursor-not-allowed'
            : 'bg-purple-600 text-white hover:bg-purple-700'
        }`}
      >
        {state.saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        Save
      </button>
    );
  };

  const Row: React.FC<{ event: EventKey }> = ({ event }) => {
    const state = rows[event];
    const def = EVENT_DEFS[event];
    return (
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-gray-900">{def.label}</div>
            <div className="text-sm text-gray-600">{def.hint}</div>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={state.enabled}
              onChange={(e) => handleToggle(event, e.target.checked)}
              disabled={state.loading}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-purple-600 transition-colors"></div>
          </label>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notification phone numbers (comma-separated)
          </label>
          <input
            type="text"
            value={state.phonesText}
            onChange={(e) => handlePhonesChange(event, e.target.value)}
            placeholder="+15551234567, +15557654321"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            disabled={state.loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Include country code, e.g. +1 for US/Canada. Multiple numbers allowed, separated by commas.
          </p>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <SaveButton event={event} />
          {state.lastVerifiedOk === true && (
            <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">Verified</span>
          )}
          {state.lastVerifiedOk === false && (
            <span className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded">Verification failed</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">SMS Notifications</h2>
        <p className="text-sm text-gray-600 mt-1">
          Configure SMS notifications for key events. Each save will be verified and you will receive a confirmation dialog.
        </p>
      </div>

      {allLoading ? (
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="animate-spin" size={18} />
          Loading current settings...
        </div>
      ) : (
        <div className="space-y-4">
          <Row event="order_placed" />
          <Row event="cart_abandoned_1h" />
          <Row event="cart_abandoned_23h" />
        </div>
      )}
    </div>
  );
};

export default SmsNotificationTab;
