"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  type EditorPreferences,
  DEFAULT_EDITOR_PREFERENCES,
} from "@/lib/constants/editor";
import { updateEditorPreferences } from "@/actions/settings";

interface EditorPreferencesContextValue {
  preferences: EditorPreferences;
  updatePreference: <K extends keyof EditorPreferences>(
    key: K,
    value: EditorPreferences[K]
  ) => Promise<void>;
  isSaving: boolean;
}

const EditorPreferencesContext =
  createContext<EditorPreferencesContextValue | null>(null);

export function useEditorPreferences() {
  const context = useContext(EditorPreferencesContext);
  if (!context) {
    // Return defaults if used outside provider (e.g., in non-settings pages)
    return {
      preferences: DEFAULT_EDITOR_PREFERENCES,
      updatePreference: async () => {},
      isSaving: false,
    };
  }
  return context;
}

interface EditorPreferencesProviderProps {
  children: React.ReactNode;
  initialPreferences: EditorPreferences;
}

export default function EditorPreferencesProvider({
  children,
  initialPreferences,
}: EditorPreferencesProviderProps) {
  const [preferences, setPreferences] =
    useState<EditorPreferences>(initialPreferences);
  const [isSaving, setIsSaving] = useState(false);

  const updatePreference = useCallback(
    async <K extends keyof EditorPreferences>(
      key: K,
      value: EditorPreferences[K]
    ) => {
      const newPreferences = { ...preferences, [key]: value };
      setPreferences(newPreferences);
      setIsSaving(true);

      try {
        const result = await updateEditorPreferences(newPreferences);
        if (result.success) {
          toast.success("Preferences saved");
        } else {
          // Revert on error
          setPreferences(preferences);
          toast.error(result.error || "Failed to save preferences");
        }
      } catch {
        // Revert on error
        setPreferences(preferences);
        toast.error("Failed to save preferences");
      } finally {
        setIsSaving(false);
      }
    },
    [preferences]
  );

  return (
    <EditorPreferencesContext.Provider
      value={{ preferences, updatePreference, isSaving }}
    >
      {children}
    </EditorPreferencesContext.Provider>
  );
}
