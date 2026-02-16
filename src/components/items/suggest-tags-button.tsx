"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateAutoTags, type GenerateAutoTagsInput } from "@/actions/ai";

interface SuggestTagsButtonProps {
  title: string;
  content?: string | null;
  language?: string | null;
  typeName: string;
  existingTags: string[];
  onAcceptTag: (tag: string) => void;
  disabled?: boolean;
}

export default function SuggestTagsButton({
  title,
  content,
  language,
  typeName,
  existingTags,
  onAcceptTag,
  disabled,
}: SuggestTagsButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleSuggest = async () => {
    if (!title.trim()) {
      toast.error("Enter a title first to get tag suggestions");
      return;
    }

    setIsLoading(true);
    setSuggestions([]);

    try {
      const input: GenerateAutoTagsInput = {
        title,
        content: content || null,
        language: language || null,
        typeName,
      };

      const result = await generateAutoTags(input);

      if (result.success && result.data) {
        // Filter out tags that already exist on the item
        const existingLower = existingTags.map((t) => t.toLowerCase());
        const newSuggestions = result.data.filter(
          (tag) => !existingLower.includes(tag)
        );

        if (newSuggestions.length === 0) {
          toast.info("All suggested tags already exist on this item");
        } else {
          setSuggestions(newSuggestions);
        }
      } else {
        toast.error(result.error || "Failed to generate tags");
      }
    } catch {
      toast.error("Failed to generate tags");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = (tag: string) => {
    onAcceptTag(tag);
    setSuggestions((prev) => prev.filter((t) => t !== tag));
  };

  const handleReject = (tag: string) => {
    setSuggestions((prev) => prev.filter((t) => t !== tag));
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleSuggest}
        disabled={disabled || isLoading}
        className="h-7 px-2 text-xs text-muted-foreground"
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 mr-1" />
        )}
        {isLoading ? "Suggesting..." : "Suggest Tags"}
      </Button>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-xs gap-1 pr-1 border-blue-500/30 text-blue-400"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleAccept(tag)}
                className="rounded-sm p-0.5 hover:bg-green-500/20 text-green-400"
                title="Accept tag"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => handleReject(tag)}
                className="rounded-sm p-0.5 hover:bg-red-500/20 text-red-400"
                title="Reject tag"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
