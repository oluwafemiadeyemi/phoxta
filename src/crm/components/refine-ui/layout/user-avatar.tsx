import { useGetIdentity } from "@refinedev/core";
import { Avatar, AvatarFallback, AvatarImage } from "@crm/components/ui/avatar";
import { Skeleton } from "@crm/components/ui/skeleton";
import { cn } from "@crm/lib/utils";

type User = {
  id: string;
  name?: string;
  email?: string;
  avatar?: string;
};

export function UserAvatar() {
  const { data: user, isLoading: userIsLoading } = useGetIdentity<User>();

  if (userIsLoading || !user) {
    return <Skeleton className={cn("h-10", "w-10", "rounded-full")} />;
  }

  const { name, email, avatar } = user;
  const displayName = name || email || "User";
  const seed = user.id || email || displayName;
  const avatarSrc = avatar || buildGeneratedAvatarDataUrl(seed);

  return (
    <Avatar className={cn("h-10", "w-10", "cursor-pointer")}>
      <AvatarImage src={avatarSrc} alt={displayName} />
      <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
    </Avatar>
  );
}

function buildGeneratedAvatarDataUrl(seed: string) {
  const palette = [
    ["#60A5FA", "#2563EB"], // blue
    ["#A78BFA", "#7C3AED"], // violet
    ["#34D399", "#059669"], // emerald
    ["#FBBF24", "#D97706"], // amber
    ["#FB7185", "#E11D48"], // rose
    ["#22D3EE", "#0891B2"], // cyan
  ];
  const i = Math.abs(hashString(seed)) % palette.length;
  const [c1, c2] = palette[i];

  // Simple “person” icon (head + shoulders). No initials text.
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="32" fill="url(#g)"/>
  <circle cx="32" cy="26" r="10" fill="rgba(255,255,255,0.92)"/>
  <path d="M16 56c3.5-10 12.2-16 16-16s12.5 6 16 16" fill="rgba(255,255,255,0.92)"/>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

function hashString(input: string) {
  // djb2
  let h = 5381;
  for (let idx = 0; idx < input.length; idx++) {
    h = (h * 33) ^ input.charCodeAt(idx);
  }
  return h | 0;
}

const getInitials = (name = "") => {
  const names = name.split(" ");
  let initials = names[0].substring(0, 1).toUpperCase();

  if (names.length > 1) {
    initials += names[names.length - 1].substring(0, 1).toUpperCase();
  }
  return initials;
};

UserAvatar.displayName = "UserAvatar";
