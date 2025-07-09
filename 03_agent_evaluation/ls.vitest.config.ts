import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["**/*.eval.?(c|m)[jt]s"],
		reporters: ["langsmith/vitest/reporter"],
		setupFiles: ["dotenv/config"],
		printConsoleTrace: true						// Added to assist test debugging
	},
});
