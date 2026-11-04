"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useEffect, useState } from "react";
import { Toaster } from "sonner";
import { refreshSession, statusOf } from "@/lib/api";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

function SessionBootstrap() {
	useEffect(() => {
		void refreshSession();
	}, []);
	return null;
}

export function Providers({ children }: { children: ReactNode }) {
	const [client] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 20_000,
						refetchOnWindowFocus: true,
						retry: (count, error) => {
							const status = statusOf(error);
							if (status && status >= 400 && status < 500) return false;
							return count < 2;
						},
					},
				},
			}),
	);

	const tree = (
		<QueryClientProvider client={client}>
			<SessionBootstrap />
			{children}
			<Toaster
				position="bottom-right"
				mobileOffset={{ bottom: 96 }}
				toastOptions={{
					className: "!rounded-xl !border-line !bg-card !text-ink !font-sans !shadow-lift",
				}}
			/>
		</QueryClientProvider>
	);

	return GOOGLE_CLIENT_ID ? <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{tree}</GoogleOAuthProvider> : tree;
}
