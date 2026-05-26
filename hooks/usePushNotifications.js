'use client';

import { useCallback, useEffect, useState } from 'react';

function toUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function supportsPush() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    if (!supportsPush()) return;

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        setIsSubscribed(Boolean(subscription));
      })
      .catch(() => {
        setIsSubscribed(false);
      });
  }, []);

  const subscribe = useCallback(async () => {
    if (!supportsPush()) {
      return { ok: false, error: 'push_not_supported' };
    }

    const vapidPublicKey = String(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim();
    if (!vapidPublicKey) {
      return { ok: false, error: 'missing_vapid_public_key' };
    }

    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);

      if (nextPermission !== 'granted') {
        return { ok: false, error: 'permission_not_granted' };
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toUint8Array(vapidPublicKey)
        });
      }

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON())
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        return { ok: false, error: payload?.error || 'push_subscribe_failed' };
      }

      setIsSubscribed(true);
      return { ok: true, subscription };
    } catch (error) {
      return { ok: false, error: error?.message || 'push_subscribe_failed' };
    }
  }, []);

  return { permission, isSubscribed, subscribe };
}
