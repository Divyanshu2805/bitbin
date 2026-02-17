"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  generateDescription,
  type GenerateDescriptionInput,
} from "@/actions/ai";

interface GenerateDescriptionButtonProps {
  title: string;
  content?: string | null;
  url?: string | null;
  language?: string | null;
  typeName: string;
  onGenerated: (description: string) => void;
  disabled?: boolean;
}

export default function GenerateDescriptionButton({
  title,
  content,
  url,
  language,
  typeName,
  onGenerated,
  disabled,
}: GenerateDescriptionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!title.trim()) {
      toast.error("Enter a title first to generate a description");
      return;
    }

    setIsLoading(true);

    try {
      const input: GenerateDescriptionInput = {
        title,
        content: content || null,
        url: url || null,
        language: language || null,
        typeName,
      };

      const result = await generateDescription(input);

      if (result.success && result.data) {
        onGenerated(result.data);
        toast.success("Description generated");
      } else {
        toast.error(result.error || "Failed to generate description");
      }
    } catch {
      toast.error("Failed to generate description");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleGenerate}
      disabled={disabled || isLoading}
      className="h-7 px-2 text-xs text-muted-foreground"
      title="Generate description with AI"
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5 mr-1" />
      )}
      {isLoading ? "Describing..." : "Describe"}
    </Button>
  );
}
