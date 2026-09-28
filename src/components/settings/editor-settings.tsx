"use client";

import { Code2 } from "lucide-react";
import Panel from "@/components/shared/panel";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useEditorPreferences } from "./editor-preferences-provider";
import { EDITOR_THEMES, FONT_SIZES, TAB_SIZES } from "@/lib/constants/editor";

export default function EditorSettings() {
  const { preferences, updatePreference, isSaving } = useEditorPreferences();

  return (
    <Panel
      id="editor"
      icon={<Code2 />}
      title="Editor"
      description="How code looks and behaves in the editor."
    >
      <div className="-my-3">
        {/* Font Size */}
        <div className="flex items-center justify-between gap-4 border-b border-border/60 py-3.5">
          <div>
            <Label htmlFor="font-size">Font Size</Label>
            <p className="text-desc text-sm">
              Size of text in the code editor
            </p>
          </div>
          <Select
            value={String(preferences.fontSize)}
            onValueChange={(value) =>
              updatePreference("fontSize", Number(value))
            }
            disabled={isSaving}
          >
            <SelectTrigger id="font-size" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}px
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tab Size */}
        <div className="flex items-center justify-between gap-4 border-b border-border/60 py-3.5">
          <div>
            <Label htmlFor="tab-size">Tab Size</Label>
            <p className="text-desc text-sm">
              Number of spaces for each tab
            </p>
          </div>
          <Select
            value={String(preferences.tabSize)}
            onValueChange={(value) =>
              updatePreference("tabSize", Number(value))
            }
            disabled={isSaving}
          >
            <SelectTrigger id="tab-size" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAB_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} spaces
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Theme */}
        <div className="flex items-center justify-between gap-4 border-b border-border/60 py-3.5">
          <div>
            <Label htmlFor="theme">Theme</Label>
            <p className="text-desc text-sm">
              Color theme for the code editor
            </p>
          </div>
          <Select
            value={preferences.theme}
            onValueChange={(value) =>
              updatePreference("theme", value as typeof preferences.theme)
            }
            disabled={isSaving}
          >
            <SelectTrigger id="theme" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EDITOR_THEMES.map((theme) => (
                <SelectItem key={theme.value} value={theme.value}>
                  {theme.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Word Wrap */}
        <div className="flex items-center justify-between gap-4 border-b border-border/60 py-3.5">
          <div>
            <Label htmlFor="word-wrap">Word Wrap</Label>
            <p className="text-desc text-sm">
              Wrap long lines to fit the editor width
            </p>
          </div>
          <Switch
            id="word-wrap"
            checked={preferences.wordWrap}
            onCheckedChange={(checked) => updatePreference("wordWrap", checked)}
            disabled={isSaving}
          />
        </div>

        {/* Minimap */}
        <div className="flex items-center justify-between gap-4 py-3.5">
          <div>
            <Label htmlFor="minimap">Minimap</Label>
            <p className="text-desc text-sm">
              Show code overview on the right side
            </p>
          </div>
          <Switch
            id="minimap"
            checked={preferences.minimap}
            onCheckedChange={(checked) => updatePreference("minimap", checked)}
            disabled={isSaving}
          />
        </div>
      </div>
    </Panel>
  );
}
