import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/home");

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div className="max-w-2xl">
        <h1 className="text-[3.75rem] font-bold tracking-tight mb-4" style={{ fontFamily: "var(--font-story-script)" }}>
          veedeck
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Centralizuj feedback do wizualizacji wnętrz. Komentarze przypięte
          bezpośrednio do renderów – bez maili i rozproszonych wiadomości.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/register">Zacznij za darmo</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Zaloguj się</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
