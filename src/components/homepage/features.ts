import { Bot, Keyboard, LayoutGrid, Puzzle, Sparkles, type LucideIcon } from "lucide-react";

// The five parts of the Features group (sections 01.1–01.5), as the navbar lists
// them. `short` is the label in the navbar capsule, where the five sit side by side.
export const FEATURES: { id: string; index: string; name: string; short: string; text: string; icon: LucideIcon; color: string; pro?: boolean }[] = [
  { id: "types", index: "01.1", name: "Snippets, prompts & more", short: "Snippets", text: "Snippets, prompts, commands, notes, links, files and images.", icon: LayoutGrid, color: "var(--brand-lime)" },
  { id: "agents", index: "01.2", name: "AI assistants", short: "MCP", text: "Connect Claude over MCP: it searches your bin and saves to it.", icon: Bot, color: "var(--brand-coral)", pro: true },
  { id: "ai", index: "01.3", name: "AI helpers", short: "AI", text: "Tags, descriptions, explanations and sharper prompts, one press away.", icon: Sparkles, color: "var(--brand-violet)", pro: true },
  { id: "extension", index: "01.4", name: "Save from anywhere", short: "Capture", text: "A browser extension and a desktop tray app, one shortcut each.", icon: Puzzle, color: "var(--brand-cyan)", pro: true },
  { id: "keys", index: "01.5", name: "Shortcuts", short: "Shortcuts", text: "⌘K search, single keys and vim-style chords. The mouse is optional.", icon: Keyboard, color: "var(--brand-lime)" },
];
