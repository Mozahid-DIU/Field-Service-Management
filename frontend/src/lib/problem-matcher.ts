import type { Category } from "./types";

/**
 * Maps everyday problem descriptions (English, Banglish and Bangla) to a
 * service. Each rule says which category it belongs to (by name pattern)
 * and which words point to it; a match on a longer phrase scores higher.
 */
interface ServiceKeywords {
	category: RegExp;
	words: string[];
}

const KEYWORDS: ServiceKeywords[] = [
	{
		category: /\b(ac|air[- ]?condition\w*)\b/i,
		words: ["ac", "a/c", "air con", "aircon", "air conditioner", "not cooling", "cooling", "gas refill", "ac gas", "remote", "split", "এসি", "ঠান্ডা হচ্ছে না", "ঠান্ডা", "গ্যাস"],
	},
	{
		category: /\b(fridge|refrigerator)\b/i,
		words: ["fridge", "refrigerator", "freezer", "ice", "not cold", "deep freeze", "compressor", "ফ্রিজ", "ফ্রিজার", "বরফ"],
	},
	{
		category: /\b(plumbing|plumber|pipe|water)\b/i,
		words: ["leak", "leaking", "water", "pipe", "tap", "drain", "blocked", "toilet", "commode", "sink", "basin", "shower", "geyser", "pani", "পানি", "লিক", "পাইপ", "ট্যাপ", "বাথরুম", "কমোড"],
	},
	{
		category: /\b(electrical|electric|wiring)\b/i,
		words: ["light", "switch", "socket", "power", "no power", "wiring", "fan", "breaker", "short circuit", "spark", "sparking", "bulb", "current", "bidyut", "বিদ্যুৎ", "লাইট", "সুইচ", "ফ্যান", "কারেন্ট", "শর্ট সার্কিট"],
	},
	{
		category: /\b(appliance|washing|microwave|oven)\b/i,
		words: ["washing machine", "washing", "microwave", "oven", "blender", "iron", "machine not spinning", "ওয়াশিং মেশিন", "মাইক্রোওয়েভ", "ওভেন"],
	},
	{
		category: /\b(cctv|camera)\b/i,
		words: ["cctv", "camera", "security camera", "dvr", "nvr", "surveillance", "ক্যামেরা", "সিসি ক্যামেরা"],
	},
];

export const POPULAR_PROBLEMS = [
	"AC not cooling",
	"Water leaking",
	"No power in a room",
	"Fridge not cold",
	"Washing machine not spinning",
	"Install CCTV camera",
];

export interface ServiceMatch {
	category: Category;
	score: number;
}

/** Best matching services for a free-text problem, highest score first. */
export function matchServices(problem: string, categories: Category[]): ServiceMatch[] {
	const text = ` ${problem.toLowerCase().trim()} `;
	if (text.trim().length < 2) return [];

	const scored = categories.map((category) => {
		const rule = KEYWORDS.find((k) => k.category.test(category.name));
		const words = [...(rule?.words ?? []), ...category.name.toLowerCase().split(/\W+/).filter((w) => w.length > 3)];
		const score = words.reduce((sum, word) => {
			const w = word.toLowerCase();
			// whole-word match for short Latin words ("ac", "fan"); substring for phrases and Bangla
			const hit = /^[a-z/]{1,3}$/.test(w) ? new RegExp(`[^a-z]${w.replace("/", "\\/")}[^a-z]`).test(text) : text.includes(w);
			return hit ? sum + w.length : sum;
		}, 0);
		return { category, score };
	});

	return scored.filter((m) => m.score > 0).sort((a, b) => b.score - a.score);
}
