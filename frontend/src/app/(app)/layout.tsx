import { AppShell } from "@/components/layout/app-shell";
import { RoleGuard } from "@/components/layout/role-guard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
	return (
		<RoleGuard allow={["CUSTOMER", "TECHNICIAN", "ADMIN"]}>
			<AppShell>{children}</AppShell>
		</RoleGuard>
	);
}
