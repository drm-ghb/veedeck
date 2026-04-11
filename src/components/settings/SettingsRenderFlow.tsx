"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { patchUser, SettingRow, SectionHeader } from "./SettingsShared";

type BoolField =
  | "allowDirectStatusChange"
  | "allowClientComments"
  | "allowClientAcceptance"
  | "requireClientEmail"
  | "hideCommentCount"
  | "requirePinTitle"
  | "autoClosePinsOnAccept"
  | "autoArchiveOnAccept"
  | "notifyClientOnStatusChange"
  | "notifyClientOnReply"
  | "allowClientVersionRestore";

interface Props {
  initialAllowDirectStatusChange: boolean;
  initialAllowClientComments: boolean;
  initialAllowClientAcceptance: boolean;
  initialRequireClientEmail: boolean;
  initialHideCommentCount: boolean;
  initialRequirePinTitle: boolean;
  initialMaxPinsPerRender: number | null;
  initialAutoClosePinsOnAccept: boolean;
  initialAutoArchiveOnAccept: boolean;
  initialDefaultRenderStatus: string;
  initialDefaultRenderOrder: string;
  initialNotifyClientOnStatusChange: boolean;
  initialNotifyClientOnReply: boolean;
  initialAllowClientVersionRestore: boolean;
}

export function SettingsRenderFlow({
  initialAllowDirectStatusChange,
  initialAllowClientComments,
  initialAllowClientAcceptance,
  initialRequireClientEmail,
  initialHideCommentCount,
  initialRequirePinTitle,
  initialMaxPinsPerRender,
  initialAutoClosePinsOnAccept,
  initialAutoArchiveOnAccept,
  initialDefaultRenderStatus,
  initialDefaultRenderOrder,
  initialNotifyClientOnStatusChange,
  initialNotifyClientOnReply,
  initialAllowClientVersionRestore,
}: Props) {
  const t = useT();

  const [bools, setBools] = useState<Record<BoolField, boolean>>({
    allowDirectStatusChange: initialAllowDirectStatusChange,
    allowClientComments: initialAllowClientComments,
    allowClientAcceptance: initialAllowClientAcceptance,
    requireClientEmail: initialRequireClientEmail,
    hideCommentCount: initialHideCommentCount,
    requirePinTitle: initialRequirePinTitle,
    autoClosePinsOnAccept: initialAutoClosePinsOnAccept,
    autoArchiveOnAccept: initialAutoArchiveOnAccept,
    notifyClientOnStatusChange: initialNotifyClientOnStatusChange,
    notifyClientOnReply: initialNotifyClientOnReply,
    allowClientVersionRestore: initialAllowClientVersionRestore,
  });

  const [maxPins, setMaxPins] = useState<string>(initialMaxPinsPerRender?.toString() ?? "");
  const [defaultStatus, setDefaultStatus] = useState(initialDefaultRenderStatus);
  const [defaultOrder, setDefaultOrder] = useState(initialDefaultRenderOrder);

  async function toggleBool(field: BoolField) {
    const next = !bools[field];
    const res = await patchUser({ [field]: next });
    if (res.ok) { setBools((s) => ({ ...s, [field]: next })); toast.success(t.settings.saved); }
    else toast.error(t.settings.saveError);
  }

  async function handleMaxPinsSave() {
    const val = maxPins === "" ? null : parseInt(maxPins, 10);
    if (maxPins !== "" && (isNaN(val as number) || (val as number) < 1)) {
      toast.error(t.renderflow.pinLimitError);
      return;
    }
    const res = await patchUser({ maxPinsPerRender: val });
    if (res.ok) toast.success(t.settings.saved);
    else toast.error(t.settings.saveError);
  }

  async function handleDefaultStatusChange(val: string) {
    setDefaultStatus(val);
    const res = await patchUser({ defaultRenderStatus: val });
    if (res.ok) toast.success(t.settings.saved);
    else toast.error(t.settings.saveError);
  }

  async function handleDefaultOrderChange(val: string) {
    setDefaultOrder(val);
    const res = await patchUser({ defaultRenderOrder: val });
    if (res.ok) toast.success(t.settings.saved);
    else toast.error(t.settings.saveError);
  }

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t.settings.renderflow}</h1>
        <p className="text-sm text-gray-500 mt-1">{t.settings.renderflowDesc2}</p>
      </div>

      {/* ── Uprawnienia klientów ── */}
      <section className="space-y-4">
        <SectionHeader title={t.renderflow.clientPermissions} />
        <div className="bg-card border border-border rounded-2xl p-6 divide-y divide-border">
          <SettingRow
            label={t.renderflow.selfRevertAcceptance}
            description={t.renderflow.selfRevertAcceptanceDesc}
            checked={bools.allowDirectStatusChange}
            onToggle={() => toggleBool("allowDirectStatusChange")}
          />
          <SettingRow
            label={t.renderflow.clientComments}
            description={t.renderflow.clientCommentsDesc}
            checked={bools.allowClientComments}
            onToggle={() => toggleBool("allowClientComments")}
          />
          <SettingRow
            label={t.renderflow.clientAcceptance}
            description={t.renderflow.clientAcceptanceDesc}
            checked={bools.allowClientAcceptance}
            onToggle={() => toggleBool("allowClientAcceptance")}
          />
          <SettingRow
            label={t.renderflow.requireEmail}
            description={t.renderflow.requireEmailDesc}
            checked={bools.requireClientEmail}
            onToggle={() => toggleBool("requireClientEmail")}
          />
          <SettingRow
            label={t.renderflow.hideCommentCount}
            description={t.renderflow.hideCommentCountDesc}
            checked={bools.hideCommentCount}
            onToggle={() => toggleBool("hideCommentCount")}
          />
          <SettingRow
            label={t.renderflow.selfRestoreVersion}
            description={t.renderflow.selfRestoreVersionDesc}
            checked={bools.allowClientVersionRestore}
            onToggle={() => toggleBool("allowClientVersionRestore")}
          />
        </div>
      </section>

      {/* ── Komentarze i piny ── */}
      <section className="space-y-4">
        <SectionHeader title={t.renderflow.commentsAndPins} />
        <div className="bg-card border border-border rounded-2xl p-6 divide-y divide-border">
          <SettingRow
            label={t.renderflow.requirePinTitle}
            description={t.renderflow.requirePinTitleDesc}
            checked={bools.requirePinTitle}
            onToggle={() => toggleBool("requirePinTitle")}
          />
          <SettingRow
            label={t.renderflow.autoClosePins}
            description={t.renderflow.autoClosePinsDesc}
            checked={bools.autoClosePinsOnAccept}
            onToggle={() => toggleBool("autoClosePinsOnAccept")}
          />
          <SettingRow
            label={t.renderflow.autoArchive}
            description={t.renderflow.autoArchiveDesc}
            checked={bools.autoArchiveOnAccept}
            onToggle={() => toggleBool("autoArchiveOnAccept")}
          />
          <div className="py-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.renderflow.pinLimit}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t.renderflow.pinLimitDesc}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Input
                  type="number"
                  min={1}
                  value={maxPins}
                  onChange={(e) => setMaxPins(e.target.value)}
                  placeholder="∞"
                  className="w-20 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleMaxPinsSave()}
                />
                <Button size="sm" onClick={handleMaxPinsSave} variant="outline">{t.common.save}</Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Nowe rendery ── */}
      <section className="space-y-4">
        <SectionHeader title={t.renderflow.newRenders} />
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.renderflow.defaultStatus}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t.renderflow.defaultStatusDesc}</p>
            </div>
            <div className="flex gap-1.5 bg-muted rounded-lg p-1 flex-shrink-0">
              {(["REVIEW", "ACCEPTED"] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleDefaultStatusChange(val)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                    defaultStatus === val
                      ? val === "ACCEPTED" ? "bg-green-500 text-white shadow-sm" : "bg-blue-500 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {val === "REVIEW" ? t.renderflow.statusReview : t.renderflow.statusAccepted}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.renderflow.defaultOrder}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t.renderflow.defaultOrderDesc}</p>
            </div>
            <div className="flex gap-1.5 bg-muted rounded-lg p-1 flex-shrink-0">
              {([["order", t.renderflow.orderManual], ["name", t.renderflow.orderName], ["newest", t.renderflow.orderNewest]] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleDefaultOrderChange(val)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                    defaultOrder === val
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Powiadomienia klientów ── */}
      <section className="space-y-4">
        <SectionHeader title={t.renderflow.clientNotifications} />
        <div className="bg-card border border-border rounded-2xl p-6 divide-y divide-border">
          <SettingRow
            label={t.renderflow.notifyStatusChange}
            description={t.renderflow.notifyStatusChangeDesc}
            checked={bools.notifyClientOnStatusChange}
            onToggle={() => toggleBool("notifyClientOnStatusChange")}
          />
          <SettingRow
            label={t.renderflow.notifyReplies}
            description={t.renderflow.notifyRepliesDesc}
            checked={bools.notifyClientOnReply}
            onToggle={() => toggleBool("notifyClientOnReply")}
          />
        </div>
      </section>
    </div>
  );
}
