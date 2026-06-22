"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, Loader2, PushPin, LocalMall, Engineering, CheckSquare, Package, CalendarDays, NotebookText, ChatBubble, ClipboardList, VeezardIcon, Users, Shield } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";

interface Permissions {
  hiddenModules: string[];
  pfCanUpload: boolean;
  pfCanDelete: boolean;
  pfCanManageFolders: boolean;
  listCanCreate: boolean;
  listCanDelete: boolean;
  contrCanCreate: boolean;
  contrCanEdit: boolean;
  contrCanDelete: boolean;
  projCanCreate: boolean;
  projCanDelete: boolean;
  allowAllClients: boolean;
  allowedClientIds: string[];
  taskCanCreate: boolean;
  taskCanDelete: boolean;
  surveyCanCreate: boolean;
  surveyCanDelete: boolean;
}

interface Client {
  id: string;
  name: string;
}

interface Props {
  memberId: string;
  memberName: string;
  onClose: () => void;
}

const DEFAULT_PERMS: Permissions = {
  hiddenModules: [],
  pfCanUpload: true,
  pfCanDelete: false,
  pfCanManageFolders: false,
  listCanCreate: true,
  listCanDelete: false,
  contrCanCreate: false,
  contrCanEdit: false,
  contrCanDelete: false,
  projCanCreate: false,
  projCanDelete: false,
  allowAllClients: true,
  allowedClientIds: [],
  taskCanCreate: true,
  taskCanDelete: false,
  surveyCanCreate: false,
  surveyCanDelete: false,
};

function SectionTitle({ label }: { label: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-5 mb-2 first:mt-0">
      {label}
    </p>
  );
}

function PermRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 py-2 cursor-pointer group select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
      />
      <span className="text-sm text-foreground group-hover:text-primary transition-colors">{label}</span>
    </label>
  );
}

function ModuleRow({
  slug,
  label,
  icon,
  hidden,
  onToggle,
}: {
  slug: string;
  label: string;
  icon: React.ReactNode;
  hidden: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex items-center gap-3 py-2 cursor-pointer group select-none">
      <input
        type="checkbox"
        checked={!hidden}
        onChange={onToggle}
        className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
      />
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-sm text-foreground group-hover:text-primary transition-colors">{label}</span>
    </label>
  );
}

export default function TeamMemberPermissionsDialog({ memberId, memberName, onClose }: Props) {
  const t = useT();
  const [perms, setPerms] = useState<Permissions>(DEFAULT_PERMS);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [permsRes, clientsRes] = await Promise.all([
        fetch(`/api/team/members/${memberId}/permissions`),
        fetch("/api/clients"),
      ]);
      if (permsRes.ok) setPerms(await permsRes.json());
      if (clientsRes.ok) setClients(await clientsRes.json());
      setLoading(false);
    }
    load();
  }, [memberId]);

  function setField<K extends keyof Permissions>(key: K, value: Permissions[K]) {
    setPerms((p) => ({ ...p, [key]: value }));
  }

  function toggleModule(slug: string) {
    setPerms((p) => ({
      ...p,
      hiddenModules: p.hiddenModules.includes(slug)
        ? p.hiddenModules.filter((s) => s !== slug)
        : [...p.hiddenModules, slug],
    }));
  }

  function toggleClient(id: string) {
    setPerms((p) => ({
      ...p,
      allowedClientIds: p.allowedClientIds.includes(id)
        ? p.allowedClientIds.filter((x) => x !== id)
        : [...p.allowedClientIds, id],
    }));
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/team/members/${memberId}/permissions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(perms),
    });
    setSaving(false);
    if (!res.ok) { toast.error(t.team.permsSaveError); return; }
    toast.success(t.team.permsSaved);
    onClose();
  }

  const moduleList = [
    { slug: "renderflow", label: t.nav.renderflow, icon: <PushPin size={15} /> },
    { slug: "klienci", label: t.nav.projects, icon: <Users size={15} /> },
    { slug: "listy", label: t.nav.lists, icon: <LocalMall size={15} /> },
    { slug: "wykonawcy", label: t.nav.contractors, icon: <Engineering size={15} /> },
    { slug: "zadania", label: t.nav.tasks, icon: <CheckSquare size={15} /> },
    { slug: "produkty", label: t.nav.products, icon: <Package size={15} /> },
    { slug: "kalendarz", label: t.nav.calendar, icon: <CalendarDays size={15} /> },
    { slug: "notatnik", label: t.nav.notes, icon: <NotebookText size={15} /> },
    { slug: "dyskusje", label: t.nav.discussions, icon: <ChatBubble size={15} /> },
    { slug: "ankiety", label: t.nav.surveys, icon: <ClipboardList size={15} /> },
    { slug: "veezard", label: t.nav.veezard, icon: <VeezardIcon size={15} /> },
  ];

  const moduleVisible = (slug: string) => !perms.hiddenModules.includes(slug);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <Shield size={16} className="text-primary" />
            <div>
              <p className="text-sm font-semibold">{t.team.permsTitle}</p>
              <p className="text-xs text-muted-foreground">{memberName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 size={22} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-y-auto px-6 py-4 flex-1">

            {/* ── Ogólne — widoczność modułów ── */}
            <SectionTitle label={t.team.permsGeneral} />
            <div className="bg-muted/40 rounded-xl px-4 divide-y divide-border">
              {moduleList.map(({ slug, label, icon }) => (
                <ModuleRow
                  key={slug}
                  slug={slug}
                  label={label}
                  icon={icon}
                  hidden={perms.hiddenModules.includes(slug)}
                  onToggle={() => toggleModule(slug)}
                />
              ))}
            </div>

            {/* ── ProjectFlow ── */}
            {moduleVisible("renderflow") && (
              <>
                <SectionTitle label="ProjectFlow" />
                <div className="bg-muted/40 rounded-xl px-4 divide-y divide-border">
                  <PermRow label={t.team.pfCanUpload} checked={perms.pfCanUpload} onChange={(v) => setField("pfCanUpload", v)} />
                  <PermRow label={t.team.pfCanDelete} checked={perms.pfCanDelete} onChange={(v) => setField("pfCanDelete", v)} />
                  <PermRow label={t.team.pfCanManageFolders} checked={perms.pfCanManageFolders} onChange={(v) => setField("pfCanManageFolders", v)} />
                </div>
              </>
            )}

            {/* ── Listy zakupowe ── */}
            {moduleVisible("listy") && (
              <>
                <SectionTitle label={t.nav.lists} />
                <div className="bg-muted/40 rounded-xl px-4 divide-y divide-border">
                  <PermRow label={t.team.listCanCreate} checked={perms.listCanCreate} onChange={(v) => setField("listCanCreate", v)} />
                  <PermRow label={t.team.listCanDelete} checked={perms.listCanDelete} onChange={(v) => setField("listCanDelete", v)} />
                </div>
              </>
            )}

            {/* ── Wykonawcy ── */}
            {moduleVisible("wykonawcy") && (
              <>
                <SectionTitle label={t.nav.contractors} />
                <div className="bg-muted/40 rounded-xl px-4 divide-y divide-border">
                  <PermRow label={t.team.contrCanCreate} checked={perms.contrCanCreate} onChange={(v) => setField("contrCanCreate", v)} />
                  <PermRow label={t.team.contrCanEdit} checked={perms.contrCanEdit} onChange={(v) => setField("contrCanEdit", v)} />
                  <PermRow label={t.team.contrCanDelete} checked={perms.contrCanDelete} onChange={(v) => setField("contrCanDelete", v)} />
                </div>
              </>
            )}

            {/* ── Projekty & Klienci ── */}
            {moduleVisible("klienci") && (
              <>
                <SectionTitle label={t.nav.projects} />
                <div className="bg-muted/40 rounded-xl px-4 divide-y divide-border">
                  <PermRow label={t.team.projCanCreate} checked={perms.projCanCreate} onChange={(v) => setField("projCanCreate", v)} />
                  <PermRow label={t.team.projCanDelete} checked={perms.projCanDelete} onChange={(v) => setField("projCanDelete", v)} />
                </div>
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{t.team.projAccess}</p>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={perms.allowAllClients}
                      onChange={() => setField("allowAllClients", true)}
                      className="accent-primary"
                    />
                    <span className="text-sm">{t.team.projAccessAll}</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={!perms.allowAllClients}
                      onChange={() => setField("allowAllClients", false)}
                      className="accent-primary"
                    />
                    <span className="text-sm">{t.team.projAccessSelected}</span>
                  </label>
                  {!perms.allowAllClients && (
                    <div className="ml-6 mt-2 bg-muted/40 rounded-xl px-4 divide-y divide-border max-h-44 overflow-y-auto">
                      {clients.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-3">{t.team.projNoProjects}</p>
                      ) : (
                        clients.map((client) => (
                          <label key={client.id} className="flex items-center gap-3 py-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={perms.allowedClientIds.includes(client.id)}
                              onChange={() => toggleClient(client.id)}
                              className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                            />
                            <span className="text-sm truncate">{client.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Zadania ── */}
            {moduleVisible("zadania") && (
              <>
                <SectionTitle label={t.nav.tasks} />
                <div className="bg-muted/40 rounded-xl px-4 divide-y divide-border">
                  <PermRow label={t.team.taskCanCreate} checked={perms.taskCanCreate} onChange={(v) => setField("taskCanCreate", v)} />
                  <PermRow label={t.team.taskCanDelete} checked={perms.taskCanDelete} onChange={(v) => setField("taskCanDelete", v)} />
                </div>
              </>
            )}

            {/* ── Ankiety ── */}
            {moduleVisible("ankiety") && (
              <>
                <SectionTitle label={t.nav.surveys} />
                <div className="bg-muted/40 rounded-xl px-4 divide-y divide-border">
                  <PermRow label={t.team.surveyCanCreate} checked={perms.surveyCanCreate} onChange={(v) => setField("surveyCanCreate", v)} />
                  <PermRow label={t.team.surveyCanDelete} checked={perms.surveyCanDelete} onChange={(v) => setField("surveyCanDelete", v)} />
                </div>
              </>
            )}

          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            {t.common.save}
          </button>
        </div>
      </div>
    </div>
  );
}
