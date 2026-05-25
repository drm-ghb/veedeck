import SettingsSidebar from "@/components/settings/SettingsSidebar";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-start">
      <SettingsSidebar />
      <main className="flex-1 min-w-0 w-full">{children}</main>
    </div>
  );
}
