import type { UserRole } from "@prisma/client";

export interface NavItem {
  href: string;
  label: string;
}

/**
 * Navigation for an account type. One source of truth so the desktop bar and
 * the mobile panel can never drift apart, and so every role sees the same set
 * in the same order (Design.md §6).
 *
 * These links mirror what the backend permits; they are a convenience, never a
 * security boundary.
 */
export function navItemsFor(role: UserRole): NavItem[] {
  switch (role) {
    case "ADMIN":
      return [
        { href: "/admin", label: "Overview" },
        { href: "/admin/verifications", label: "Seller verification" },
        { href: "/admin/products", label: "Listing moderation" },
        { href: "/admin/users", label: "Users" },
        { href: "/admin/reports", label: "Reports" },
        { href: "/admin/audit", label: "Audit history" },
      ];
    case "SELLER":
      return [
        { href: "/seller", label: "Overview" },
        { href: "/seller/requests", label: "Order requests" },
        { href: "/seller/products", label: "Products" },
        { href: "/seller/profile", label: "Business profile" },
        { href: "/products", label: "Explore products" },
      ];
    case "BUYER":
      return [
        { href: "/buyer", label: "Overview" },
        { href: "/buyer/requests", label: "Order requests" },
        { href: "/products", label: "Explore products" },
        { href: "/buyer/profile", label: "Business profile" },
      ];
  }
}
