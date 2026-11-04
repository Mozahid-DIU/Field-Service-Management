import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const jakarta = Plus_Jakarta_Sans({
	subsets: ["latin"],
	variable: "--font-jakarta",
	display: "swap",
});

export const metadata: Metadata = {
	title: { default: "FixFlow - Home repair services", template: "%s | FixFlow" },
	description:
		"Book trusted technicians for AC, plumbing, electrical and appliance repairs. Track your technician and pay with bKash.",
};

export const viewport: Viewport = {
	themeColor: "#006a4e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className={jakarta.variable}>
			<body>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
