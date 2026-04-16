import TeamSettings from "@/components/settings/TeamSettings";

export default function UzytkownicyPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Użytkownicy</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Zarządzaj członkami swojego zespołu. Zaproszeni użytkownicy będą mieć dostęp do Twoich projektów i list.
        </p>
      </div>
      <TeamSettings />
    </div>
  );
}
