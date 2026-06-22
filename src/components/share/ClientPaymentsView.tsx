"use client";

import { useState, useEffect } from "react";
import { Check, ChevronDown, ChevronRight, Loader2 } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";

interface RfProject {
  id: string;
  title: string;
}

interface PaymentGroup {
  id: string;
  parentId: string | null;
  rfProjectId: string | null;
  name: string;
  order: number;
  rfProject?: RfProject | null;
}

interface Payment {
  id: string;
  groupId: string | null;
  name: string;
  amount: number;
  status: "pending" | "paid";
  order: number;
}

function formatPLN(amount: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(amount);
}

function PaymentRow({ payment }: { payment: Payment }) {
  const t = useT();
  return (
    <div className="flex items-center gap-3 py-2.5 px-4">
      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
        payment.status === "paid"
          ? "bg-green-500 border-green-500 text-white"
          : "border-muted-foreground"
      }`}>
        {payment.status === "paid" && <Check size={10} />}
      </div>
      <span className={`flex-1 text-sm ${payment.status === "paid" ? "line-through text-muted-foreground" : ""}`}>
        {payment.name}
      </span>
      <span className="text-sm font-medium tabular-nums">{formatPLN(payment.amount)}</span>
      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
        payment.status === "paid"
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      }`}>
        {payment.status === "paid" ? t.share.paymentsPaid : t.share.paymentsDue}
      </span>
    </div>
  );
}

function GroupBlock({ group, payments, groups, depth }: { group: PaymentGroup; payments: Payment[]; groups: PaymentGroup[]; depth: number }) {
  const [collapsed, setCollapsed] = useState(false);
  const groupPayments = payments.filter((p) => p.groupId === group.id).sort((a, b) => a.order - b.order);
  const childGroups = groups.filter((g) => g.parentId === group.id).sort((a, b) => a.order - b.order);

  return (
    <div style={{ paddingLeft: depth > 0 ? `${depth * 12}px` : undefined }}>
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center gap-2 py-2 px-4 hover:bg-muted/40 text-left transition-colors"
      >
        {collapsed ? <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />}
        <span className="text-sm font-semibold flex-1">{group.name}</span>
      </button>
      {!collapsed && (
        <>
          {groupPayments.map((p) => <PaymentRow key={p.id} payment={p} />)}
          {childGroups.map((child) => <GroupBlock key={child.id} group={child} payments={payments} groups={groups} depth={depth + 1} />)}
        </>
      )}
    </div>
  );
}

export default function ClientPaymentsView({ projectId }: { projectId: string }) {
  const t = useT();
  const [groups, setGroups] = useState<PaymentGroup[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionCollapsed, setSectionCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch(`/api/client/${projectId}/payments`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) { setGroups(data.groups); setPayments(data.payments); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  const topGroups = groups.filter((g) => g.parentId === null);
  const ungroupedPayments = payments.filter((p) => p.groupId === null).sort((a, b) => a.order - b.order);

  // Collect unique rfProjectIds
  const rfProjectIds = Array.from(new Set(topGroups.map((g) => g.rfProjectId)));

  const sections: { key: string; label: string; rfProjectId: string | null; topGroups: PaymentGroup[] }[] = [];

  for (const rfProjId of rfProjectIds) {
    if (rfProjId === null) continue;
    const rfProject = topGroups.find((g) => g.rfProjectId === rfProjId)?.rfProject;
    sections.push({
      key: rfProjId,
      label: rfProject?.title ?? "Projekt",
      rfProjectId: rfProjId,
      topGroups: topGroups.filter((g) => g.rfProjectId === rfProjId).sort((a, b) => a.order - b.order),
    });
  }

  const unassignedGroups = topGroups.filter((g) => g.rfProjectId === null).sort((a, b) => a.order - b.order);

  const paidTotal = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const total = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = total - paidTotal;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-xl font-bold">{t.share.payments}</h1>

        {/* Summary */}
        {payments.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t.share.paymentsTotal}</p>
              <p className="text-sm font-bold tabular-nums">{formatPLN(total)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t.share.paymentsPaid}</p>
              <p className="text-sm font-bold tabular-nums text-green-600 dark:text-green-400">{formatPLN(paidTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t.share.paymentsDue}</p>
              <p className={`text-sm font-bold tabular-nums ${remaining > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>{formatPLN(Math.max(0, remaining))}</p>
            </div>
          </div>
        )}

        {/* Sections per project */}
        {sections.map((section) => (
          <div key={section.key} className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setSectionCollapsed((c) => ({ ...c, [section.key]: !c[section.key] }))}
              className="w-full flex items-center gap-2 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left border-b border-border"
            >
              {sectionCollapsed[section.key] ? <ChevronRight size={15} className="text-muted-foreground flex-shrink-0" /> : <ChevronDown size={15} className="text-muted-foreground flex-shrink-0" />}
              <span className="text-sm font-semibold flex-1">{section.label}</span>
              <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">ProjectFlow</span>
            </button>
            {!sectionCollapsed[section.key] && (
              <div className="divide-y divide-border/30">
                {section.topGroups.map((g) => <GroupBlock key={g.id} group={g} payments={payments} groups={groups} depth={0} />)}
              </div>
            )}
          </div>
        ))}

        {/* Unassigned */}
        {(unassignedGroups.length > 0 || ungroupedPayments.length > 0) && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setSectionCollapsed((c) => ({ ...c, unassigned: !c["unassigned"] }))}
              className="w-full flex items-center gap-2 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left border-b border-border"
            >
              {sectionCollapsed["unassigned"] ? <ChevronRight size={15} className="text-muted-foreground flex-shrink-0" /> : <ChevronDown size={15} className="text-muted-foreground flex-shrink-0" />}
              <span className="text-sm font-semibold flex-1">{t.share.paymentsRemaining}</span>
            </button>
            {!sectionCollapsed["unassigned"] && (
              <div className="divide-y divide-border/30">
                {unassignedGroups.map((g) => <GroupBlock key={g.id} group={g} payments={payments} groups={groups} depth={0} />)}
                {ungroupedPayments.map((p) => <PaymentRow key={p.id} payment={p} />)}
              </div>
            )}
          </div>
        )}

        {payments.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">{t.share.noPayments}</p>
        )}
      </div>
    </div>
  );
}
