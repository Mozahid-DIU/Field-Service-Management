"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban, CheckCircle2, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { RoleTag } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { cn, shortDate } from "@/lib/format";
import { useUsers } from "@/lib/queries";
import type { Role, User } from "@/lib/types";
import { useDebounced } from "@/lib/use-url-state";

type Pending = { kind: "role"; user: User; role: Role } | { kind: "status"; user: User } | null;

export default function UsersPage() {
	const { user: me } = useAuth();
	const qc = useQueryClient();
	const [q, setQ] = useState("");
	const [role, setRole] = useState("");
	const [status, setStatus] = useState("");
	const [page, setPage] = useState(1);
	const [pending, setPending] = useState<Pending>(null);
	const search = useDebounced(q);
	const users = useUsers({ q: search, role, status, page, limit: 12 });

	const mutate = useMutation({
		mutationFn: (p: NonNullable<Pending>): Promise<unknown> =>
			p.kind === "role"
				? api.patch(`/admin/users/${p.user.id}/role`, { role: p.role })
				: api.patch(`/admin/users/${p.user.id}/status`, { status: p.user.status === "ACTIVE" ? "BLOCKED" : "ACTIVE" }),
		onSuccess: (_d, p) => {
			toast.success(p.kind === "role" ? `${p.user.name} is now ${p.role}` : p.user.status === "ACTIVE" ? `${p.user.name} blocked` : `${p.user.name} unblocked`);
			void qc.invalidateQueries({ queryKey: ["users"] });
			setPending(null);
		},
		onError: (e) => toast.error(errorMessage(e)),
	});

	return (
		<>
			<PageHeader eyebrow="Access control" title="Users" description="Manage roles and account access." />

			<div className="mb-5 flex flex-col gap-2 sm:flex-row">
				<div className="relative flex-1">
					<Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
					<Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name, email or phone" className="pl-10" aria-label="Search users" />
				</div>
				<Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="sm:w-44" aria-label="Role">
					<option value="">All roles</option>
					<option value="CUSTOMER">Customers</option>
					<option value="TECHNICIAN">Technicians</option>
					<option value="ADMIN">Admins</option>
				</Select>
				<Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="sm:w-40" aria-label="Status">
					<option value="">Any status</option>
					<option value="ACTIVE">Active</option>
					<option value="BLOCKED">Blocked</option>
				</Select>
			</div>

			{users.isLoading ? (
				<Skeleton className="h-96" />
			) : users.error ? (
				<ErrorState message={errorMessage(users.error)} onRetry={() => users.refetch()} />
			) : users.data?.data.length === 0 ? (
				<EmptyState title="No users found" />
			) : (
				<div className={cn("ticket overflow-x-auto transition-opacity", users.isPlaceholderData && "opacity-60")}>
					<table className="w-full min-w-[720px] text-sm">
						<thead>
							<tr className="border-b border-line text-left text-xs text-ink-faint">
								<th className="px-5 py-3 font-medium">User</th>
								<th className="px-5 py-3 font-medium">Role</th>
								<th className="px-5 py-3 font-medium">Status</th>
								<th className="px-5 py-3 font-medium">Joined</th>
								<th className="px-5 py-3 text-right font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{users.data?.data.map((u) => {
								const self = u.id === me?.id;
								return (
									<tr key={u.id} className="border-b border-line/60 last:border-0 hover:bg-paper/50">
										<td className="px-5 py-3">
											<div className="flex items-center gap-3">
												<Avatar name={u.name} src={u.avatarUrl} size={34} />
												<div className="min-w-0">
													<p className="font-semibold">
														{u.name} {self && <span className="text-xs font-normal text-ink-faint">(you)</span>}
													</p>
													<p className="text-xs text-ink-soft">{u.email}</p>
												</div>
											</div>
										</td>
										<td className="px-5 py-3">
											{self ? (
												<RoleTag role={u.role} />
											) : (
												<Select
													value={u.role}
													onChange={(e) => setPending({ kind: "role", user: u, role: e.target.value as Role })}
													className="h-9 w-36 text-sm"
													aria-label={`Role of ${u.name}`}
												>
													<option value="CUSTOMER">Customer</option>
													<option value="TECHNICIAN">Technician</option>
													<option value="ADMIN">Admin</option>
												</Select>
											)}
										</td>
										<td className="px-5 py-3">
											<span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", u.status === "ACTIVE" ? "text-[var(--st-completed)]" : "text-[var(--st-rejected)]")}>
												<span className="size-1.5 rounded-full bg-current" /> {u.status === "ACTIVE" ? "Active" : "Blocked"}
											</span>
										</td>
										<td className="px-5 py-3 text-ink-soft">{shortDate(u.createdAt)}</td>
										<td className="px-5 py-3 text-right">
											{!self && (
												<Button
													size="sm"
													variant={u.status === "ACTIVE" ? "ghost" : "outline"}
													icon={u.status === "ACTIVE" ? <Ban className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
													onClick={() => setPending({ kind: "status", user: u })}
												>
													{u.status === "ACTIVE" ? "Block" : "Unblock"}
												</Button>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
			<div className="mt-4">
				<Pagination meta={users.data?.meta} onPage={setPage} />
			</div>

			<Dialog
				open={pending !== null}
				onClose={() => setPending(null)}
				title={pending?.kind === "role" ? "Change role?" : pending?.user.status === "ACTIVE" ? "Block this user?" : "Unblock this user?"}
				description={
					pending?.kind === "role"
						? `${pending.user.name}: ${pending.user.role} → ${pending.role}. They will be signed out of every device.`
						: pending?.user.status === "ACTIVE"
							? `${pending?.user.name} will be signed out and unable to log in.`
							: `${pending?.user.name} will be able to sign in again.`
				}
				footer={
					<>
						<Button variant="ghost" onClick={() => setPending(null)}>
							Cancel
						</Button>
						<Button variant={pending?.kind === "status" && pending.user.status === "ACTIVE" ? "danger" : "primary"} loading={mutate.isPending} onClick={() => pending && mutate.mutate(pending)}>
							Confirm
						</Button>
					</>
				}
			>
				<p className="text-sm text-ink-soft">This action is recorded in the audit log.</p>
			</Dialog>
		</>
	);
}
