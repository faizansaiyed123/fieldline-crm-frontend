import type { MembershipRole } from "@/lib/types";

export function hasAdminAccess(role: MembershipRole | null | undefined) {
  return role === "owner" || role === "admin";
}
