import { RoleGuard } from "@/components/layout/role-guard";

export default function Layout({ children }: { children: React.ReactNode }) {
	return <RoleGuard allow={["ADMIN"]}>{children}</RoleGuard>;
}
