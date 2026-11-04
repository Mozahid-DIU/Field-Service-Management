import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const display = Bricolage_Grotesque({
	subsets: ["latin"],
	variable: "--font-bricolage",
	display: "swap",
});
const sans = Instrument_Sans({
	subsets: ["latin"],
	variable: "--font-instrument",
	display: "swap",
});
const mono = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-jetbrains",
	display: "swap",
	weight: ["400", "600"],
});

export const metadata: Metadata = {
	title: { default: "FixFlow — Field service, handled", template: "%s · FixFlow" },
	description:
		"Book verified technicians for AC, plumbing, electrical and appliance repairs. Track every visit live and pay securely with bKash.",
};

export const viewport: Viewport = {
	themeColor: "#f3f0e8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
			<body>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
