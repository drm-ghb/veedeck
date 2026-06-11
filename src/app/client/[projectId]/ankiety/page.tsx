"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface Survey {
  id: string;
  name: string;
  shareToken: string;
  createdAt: string;
  completed: boolean;
}

export default function ClientSurveysPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/client/${projectId}?view=ankiety`);
  }, [projectId, router]);

  return null;
}
