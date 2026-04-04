import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    base: "./",
    build: {
        outDir: "dist",
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            "@staroverlay/sdk/tmi": resolve(__dirname, "../sdk/dist/tmi.mjs"),
            "@staroverlay/sdk": resolve(__dirname, "../sdk/dist/staroverlay.mjs")
        }
    }
});
