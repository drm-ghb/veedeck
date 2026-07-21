"use client";

import { createContext, useContext } from "react";

const TrialContext = createContext(false);

export const TrialContextProvider = TrialContext.Provider;

export function useIsTrialExpired(): boolean {
  return useContext(TrialContext);
}
