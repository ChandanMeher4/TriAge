"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps {
  href: string;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, href, ...props }, ref) => {
    return <Link ref={ref} href={href} className={cn(className)} {...props} />;
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
