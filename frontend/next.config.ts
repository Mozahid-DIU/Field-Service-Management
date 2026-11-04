import type { NextConfig } from "next";

const API_ORIGIN = process.env.API_URL ?? "http://localhost:5000";

const nextConfig: NextConfig = {
	// The API is proxied through Next so the refresh-token cookie is first-party
	// (no third-party cookie problems between Vercel and Render).
	async rewrites() {
		return [
			{ source: "/api/v1/:path*", destination: `${API_ORIGIN}/api/v1/:path*` },
		];
	},
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "res.cloudinary.com" },
			{ protocol: "https", hostname: "lh3.googleusercontent.com" },
		],
	},
};

export default nextConfig;
