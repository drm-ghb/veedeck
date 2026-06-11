"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft } from "@/components/ui/icons";
import SurveyForm from "./SurveyForm";
import type { SurveyQuestion, SurveySection } from "../SurveyEditor";

interface Answer {
  id: string;
  questionId: string;
  value: unknown;
}

interface SurveyData {
  id: string;
  name: string;
  sections: SurveySection[];
  questions: SurveyQuestion[];
}

interface Props {
  token: string;
  surveyName: string;
  clientEmail: string;
  clientName: string;
  onBack: () => void;
  onCompleted?: () => void;
  readOnly?: boolean;
}

export default function ClientSurveyView({ token, surveyName, clientEmail, clientName, onBack, onCompleted, readOnly = false }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [existingAnswers, setExistingAnswers] = useState<Answer[]>([]);
  const [completed, setCompleted] = useState(false);
  const saveFnRef = useRef<(() => Promise<void>) | null>(null);

  const registerSave = useCallback((fn: () => Promise<void>) => {
    saveFnRef.current = fn;
  }, []);

  async function handleBack() {
    if (!readOnly && saveFnRef.current) {
      await saveFnRef.current();
    }
    onBack();
  }

  useEffect(() => {
    async function init() {
      try {
        const [dataRes, startRes] = await Promise.all([
          fetch(`/api/share/survey/${token}`),
          fetch(`/api/share/survey/${token}/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: clientEmail, name: clientName || undefined }),
          }),
        ]);

        if (!dataRes.ok || !startRes.ok) {
          setError("Nie udało się załadować ankiety.");
          return;
        }

        const [data, start] = await Promise.all([dataRes.json(), startRes.json()]);
        setSurveyData(data);
        setResponseId(start.responseId);
        setExistingAnswers(start.existingAnswers ?? []);
        setCompleted(start.completed ?? false);
      } catch {
        setError("Błąd połączenia. Spróbuj ponownie.");
      } finally {
        setLoading(false);
      }
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="w-full">
      <button
        onClick={handleBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        Powrót do ankiet
      </button>

      <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">{surveyName}</h2>

      {loading && (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground animate-pulse">
          Ładowanie...
        </div>
      )}

      {!loading && error && (
        <div className="bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">
          {error}
        </div>
      )}

      {!loading && !error && completed && !readOnly && (
        <div className="bg-card border border-border rounded-2xl p-10 text-center space-y-3">
          <div className="text-4xl">✓</div>
          <h2 className="text-xl font-bold">Ankieta już wypełniona</h2>
          <p className="text-sm text-muted-foreground">
            Twoje odpowiedzi zostały wcześniej zapisane. Dziękujemy za udział!
          </p>
        </div>
      )}

      {!loading && !error && (!completed || readOnly) && surveyData && responseId && (
        <SurveyForm
          token={token}
          survey={surveyData}
          responseId={responseId}
          existingAnswers={existingAnswers}
          readOnly={readOnly}
          onRegisterSave={registerSave}
          onSubmitted={onCompleted}
        />
      )}
      </div>
    </div>
  );
}
