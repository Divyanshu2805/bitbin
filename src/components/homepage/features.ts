import { Bot, Keyboard, LayoutGrid, Puzzle, Sparkles, type LucideIcon } from "lucide-react";

// The five parts of the Features group (sections 01.1–01.5), as the navbar lists
// them. `short` is the label in the navbar capsule, where the five sit side by side.
export const FEATURES: { id: string; index: string; name: string; short: string; text: string; icon: LucideIcon; color: string; pro?: boolean }[] = [
  { id: "types", index: "01.1", name: "Item types", short: "Types", text: "Snippets, prompts, commands, notes, links, files and images.", icon: LayoutGrid, color: "var(--brand-lime)" },
  { id: "agents", index: "01.2", name: "Agents", short: "Agents", text: "Your coding agent files what it figures out, straight into your bin.", icon: Bot, color: "var(--brand-coral)", pro: true },
  { id: "ai", index: "01.3", name: "AI helpers", short: "AI", text: "Tags, descriptions and explanations, one press away.", icon: Sparkles, color: "var(--brand-violet)", pro: true },
  { id: "extension", index: "01.4", name: "Browser extension", short: "Extension", text: "Save a selection from any page with one shortcut.", icon: Puzzle, color: "var(--brand-cyan)", pro: true },
  { id: "keys", index: "01.5", name: "Shortcuts", short: "Shortcuts", text: "⌘K search and vim-style chords. The mouse is optional.", icon: Keyboard, color: "var(--brand-lime)" },
];
