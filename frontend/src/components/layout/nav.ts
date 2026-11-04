import {
	BarChart3,
	ClipboardList,
	CreditCard,
	History,
	LayoutGrid,
	type LucideIcon,
	PlusCircle,
	ScrollText,
	Sun,
	UserCircle,
	Users,
	Wrench,
} from "lucide-react";
import type { Role } from "@/lib/types";

export interface NavItem {
	href: string;
	label: string;
	icon: LucideIcon;
	/** exact match only (dashboards) */
	exact?: boolean;
	/** shown in the mobile bottom bar */
	primary?: boolean;
}

export const NAV: Record<Role, NavItem[]> = {
	CUSTOMER: [
		{ href: "/customer", label: "Overview", icon: LayoutGrid, exact: true, primary: true },
		{ href: "/customer/new", label: "New request", icon: PlusCircle, primary: true },
		{ href: "/customer/requests", label: "My requests", icon: ClipboardList, primary: true },
		{ href: "/customer/payments", label: "Payments", icon: CreditCard, primary: true },
		{ href: "/profile", label: "Profile", icon: UserCircle },
	],
	TECHNICIAN: [
		{ href: "/technician", label: "Today", icon: Sun, exact: true, primary: true },
		{ href: "/technician/jobs", label: "All jobs", icon: Wrench, primary: true },
		{ href: "/profile", label: "Profile", icon: UserCircle, primary: true },
	],
	ADMIN: [
		{ href: "/admin", label: "Dashboard", icon: BarChart3, exact: true, primary: true },
		{ href: "/admin/work-orders", label: "Work orders", icon: ClipboardList, primary: true },
		{ href: "/admin/technicians", label: "Technicians", icon: Wrench, primary: true },
		{ href: "/admin/users", label: "Users", icon: Users, primary: true },
		{ href: "/admin/categories", label: "Services", icon: ScrollText },
		{ href: "/admin/audit-logs", label: "Audit log", icon: History },
		{ href: "/profile", label: "Profile", icon: UserCircle },
	],
};

export function isActive(pathname: string, item: NavItem): boolean {
	return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
