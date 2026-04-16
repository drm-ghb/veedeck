"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { toast } from "sonner";

export default function PushNotificationButton() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setSupported(true);

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    });
  }, []);

  if (!supported) return null;

  async function toggle() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;

      if (subscribed) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setSubscribed(false);
        toast.success("Powiadomienia wyłączone");
      } else {
        // If already denied — browser won't show a dialog, explain manually
        if (Notification.permission === "denied") {
          toast.error("Powiadomienia są zablokowane w przeglądarce. Odblokuj je w ustawieniach witryny (ikona kłódki przy adresie).");
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Nie udzielono zgody na powiadomienia.");
          return;
        }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
          ),
        });

        const json = sub.toJSON();
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
        });

        setSubscribed(true);
        toast.success("Powiadomienia włączone");
      }
    } catch {
      toast.error("Nie udało się zmienić ustawień powiadomień");
    } finally {
      setLoading(false);
    }
  }

  const blocked = Notification.permission === "denied";

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={
        blocked
          ? "Powiadomienia zablokowane — odblokuj w ustawieniach przeglądarki"
          : subscribed
          ? "Wyłącz powiadomienia push"
          : "Włącz powiadomienia push"
      }
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
        blocked
          ? "text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          : subscribed
          ? "text-primary hover:bg-primary/10"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {blocked ? <BellOff size={16} /> : subscribed ? <BellRing size={16} /> : <Bell size={16} />}
    </button>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
