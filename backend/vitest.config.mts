import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["tests/**/*.test.ts"],
		env: {
			NODE_ENV: "test",
			DATABASE_URL: "postgresql://test:test@localhost:5432/fixflow_test",
			JWT_ACCESS_SECRET: "test-access-secret-which-is-long-enough-123456",
			JWT_REFRESH_SECRET: "test-refresh-secret-which-is-long-enough-12345",
			BCRYPT_SALT_ROUNDS: "8",
		},
		coverage: {
			provider: "v8",
			include: ["src/**/*.ts"],
		},
	},
});
