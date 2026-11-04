"use client";

import { GoogleLogin } from "@react-oauth/google";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import type { ApiSuccess, AuthPayload } from "@/lib/types";

const ENABLED = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export function GoogleButton({ onSuccess }: { onSuccess: (payload: AuthPayload) => void }) {
	if (!ENABLED) return null;
	return (
		<>
			<div className="flex justify-center [&_iframe]:!mx-auto">
				<GoogleLogin
					width="384"
					shape="pill"
					text="continue_with"
					locale="en"
					onSuccess={async ({ credential }) => {
						if (!credential) return;
						try {
							const res = await api.post<ApiSuccess<AuthPayload>>("/auth/google", { idToken: credential });
							onSuccess(res.data.data);
						} catch (error) {
							toast.error(errorMessage(error, "Google sign-in failed"));
						}
					}}
					onError={() => toast.error("Google sign-in was cancelled")}
				/>
			</div>
			<div className="my-6 flex items-center gap-3 text-xs font-medium text-ink-faint">
				<span className="h-px flex-1 bg-line" />
				or with email
				<span className="h-px flex-1 bg-line" />
			</div>
		</>
	);
}
