/* Minimal structured logger — swap for pino in larger deployments. */
type Level = "info" | "warn" | "error";

function write(level: Level, message: string, detail?: unknown): void {
	const entry = {
		level,
		time: new Date().toISOString(),
		message,
		...(detail instanceof Error
			? { error: detail.message, stack: detail.stack }
			: detail !== undefined
				? { detail }
				: {}),
	};
	const line = JSON.stringify(entry);
	if (level === "error") {
		process.stderr.write(`${line}\n`);
	} else {
		process.stdout.write(`${line}\n`);
	}
}

export const logger = {
	info: (message: string, detail?: unknown) => write("info", message, detail),
	warn: (message: string, detail?: unknown) => write("warn", message, detail),
	error: (message: string, detail?: unknown) => write("error", message, detail),
};
