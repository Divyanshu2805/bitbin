"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name?: string | null;
  image?: string | null;
  className?: string;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UserAvatar({ name, image, className }: UserAvatarProps) {
  const initials = getInitials(name);

  return (
    <Avatar className={cn("h-8 w-8", className)}>
      {image && <AvatarImage src={image} alt={name || "User avatar"} />}
      <AvatarFallback className="bg-primary text-xs text-primary-foreground">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
