"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { RoleTag } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/states";
import { api, errorMessage } from "@/lib/api";
import { authStore } from "@/lib/auth-store";
import { cn } from "@/lib/format";
import { keys, useCategories, useMe } from "@/lib/queries";
import type { ApiSuccess, User } from "@/lib/types";
import { useLogout } from "@/lib/use-logout";

function useSaveProfile() {
	const qc = useQueryClient();
	return (onSaved: (user: User) => void) => (user: User) => {
		authStore.setUser(user);
		qc.setQueryData(keys.me, user);
		onSaved(user);
	};
}

function ProfileCard({ me }: { me: User }) {
	const [name, setName] = useState(me.name);
	const [phone, setPhone] = useState(me.phone ?? "");
	const saved = useSaveProfile();
	const save = useMutation({
		mutationFn: async () => (await api.patch<ApiSuccess<User>>("/users/me", { name, phone: phone || null })).data.data,
		onSuccess: saved(() => toast.success("Profile saved")),
		onError: (e) => toast.error(errorMessage(e)),
	});
	const dirty = name !== me.name || phone !== (me.phone ?? "");

	return (
		<section className="ticket p-6">
			<div className="mb-6 flex items-center gap-4">
				<Avatar name={me.name} src={me.avatarUrl} size={56} />
				<div>
					<p className="font-display text-xl font-semibold">{me.name}</p>
					<p className="flex items-center gap-2 text-sm text-ink-soft">
						{me.email} <RoleTag role={me.role} />
					</p>
				</div>
			</div>
			<div className="grid gap-4 sm:grid-cols-2">
				<Field label="Full name" htmlFor="p-name">
					<Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
				</Field>
				<Field label="Phone" htmlFor="p-phone" hint="Bangladeshi mobile, e.g. 01712345678">
					<Input id="p-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
				</Field>
			</div>
			<Button className="mt-5" icon={<Save className="size-4" />} disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>
				Save changes
			</Button>
		</section>
	);
}

function TechnicianCard({ me }: { me: User }) {
	const categories = useCategories();
	const profile = me.technicianProfile;
	const [bio, setBio] = useState(profile?.bio ?? "");
	const [skillIds, setSkillIds] = useState<string[]>(profile?.skills.map((s) => s.id) ?? []);
	const saved = useSaveProfile();
	const save = useMutation({
		mutationFn: async (body: Record<string, unknown>) =>
			(await api.patch<ApiSuccess<User>>("/users/me/technician-profile", body)).data.data,
		onSuccess: saved((u) => toast.success(u.technicianProfile?.isAvailable ? "You're on duty" : "Profile updated")),
		onError: (e) => toast.error(errorMessage(e)),
	});
	const available = profile?.isAvailable ?? true;

	return (
		<section className="ticket p-6">
			<div className="flex items-center justify-between gap-4">
				<div>
					<p className="font-display text-lg font-semibold">Availability</p>
					<p className="text-sm text-ink-soft">Off-duty technicians can't be assigned new jobs.</p>
				</div>
				<button
					type="button"
					role="switch"
					aria-checked={available}
					aria-label="On duty"
					onClick={() => save.mutate({ isAvailable: !available })}
					className={cn("relative h-8 w-14 cursor-pointer rounded-full transition-colors", available ? "bg-[var(--st-completed)]" : "bg-line-strong")}
				>
					<span className={cn("absolute top-1 left-1 size-6 rounded-full bg-white shadow transition-transform", available && "translate-x-6")} />
				</button>
			</div>
			<div className="mt-6 border-t border-line pt-6">
				<p className="mb-2 text-sm font-semibold">Skills</p>
				<div className="flex flex-wrap gap-2">
					{categories.data?.map((c) => {
						const on = skillIds.includes(c.id);
						return (
							<button
								key={c.id}
								type="button"
								aria-pressed={on}
								onClick={() => setSkillIds((ids) => (on ? ids.filter((id) => id !== c.id) : [...ids, c.id]))}
								className={cn("cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition", on ? "bg-ink text-paper ring-ink" : "bg-card text-ink-soft ring-line hover:ring-ink-faint")}
							>
								{c.name}
							</button>
						);
					})}
				</div>
				<Field label="Bio" htmlFor="p-bio" className="mt-4">
					<Textarea id="p-bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Experience, certifications…" />
				</Field>
				<Button className="mt-4" icon={<Save className="size-4" />} disabled={skillIds.length === 0} loading={save.isPending} onClick={() => save.mutate({ bio: bio || null, skillIds })}>
					Save skills & bio
				</Button>
			</div>
		</section>
	);
}

function PasswordCard({ me }: { me: User }) {
	const logout = useLogout();
	const [current, setCurrent] = useState("");
	const [next, setNext] = useState("");
	const change = useMutation({
		mutationFn: () => api.patch("/auth/change-password", { currentPassword: current, newPassword: next }),
		onSuccess: async () => {
			toast.success("Password changed — please sign in again");
			await logout();
		},
		onError: (e) => toast.error(errorMessage(e)),
	});
	if (me.provider === "GOOGLE") {
		return (
			<section className="ticket p-6 text-sm text-ink-soft">
				<p className="font-display text-lg font-semibold text-ink">Password</p>
				You sign in with Google, so there's no FixFlow password to manage.
			</section>
		);
	}
	return (
		<section className="ticket p-6">
			<p className="font-display text-lg font-semibold">Change password</p>
			<p className="text-sm text-ink-soft">You'll be signed out on every device.</p>
			<div className="mt-4 grid gap-4 sm:grid-cols-2">
				<Field label="Current password" htmlFor="pw-current">
					<Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
				</Field>
				<Field label="New password" htmlFor="pw-new" hint="8+ characters with a letter and a number">
					<Input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
				</Field>
			</div>
			<Button variant="ink" className="mt-5" icon={<KeyRound className="size-4" />} disabled={!current || next.length < 8} loading={change.isPending} onClick={() => change.mutate()}>
				Update password
			</Button>
		</section>
	);
}

export default function ProfilePage() {
	const me = useMe();

	return (
		<>
			<PageHeader eyebrow="Account" title="Your profile" />
			{!me.data ? (
				<div className="flex flex-col gap-4">
					<Skeleton className="h-56" />
					<Skeleton className="h-40" />
				</div>
			) : (
				<div className="flex max-w-3xl flex-col gap-6 stagger">
					<ProfileCard me={me.data} />
					{me.data.role === "TECHNICIAN" && <TechnicianCard me={me.data} />}
					<PasswordCard me={me.data} />
				</div>
			)}
		</>
	);
}
