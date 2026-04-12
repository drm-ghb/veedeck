"use client";

import { useState, useEffect } from "react";

interface ClientGreetingProps {
  projectShareToken: string;
  fallbackGreeting: string;
  className?: string;
}

export default function ClientGreeting({ projectShareToken, fallbackGreeting, className }: ClientGreetingProps) {
  const [greeting, setGreeting] = useState(fallbackGreeting);

  useEffect(() => {
    const name = localStorage.getItem(`veedeck-author-${projectShareToken}`)?.trim();
    if (name) setGreeting(`Witamy, ${name}!`);
  }, [projectShareToken]);

  return <h1 className={className}>{greeting}</h1>;
}
