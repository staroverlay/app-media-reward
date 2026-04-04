import { defineConfig } from "vite";
import { resolve } from "path";

function getSDKDir() {
    const path = require("path");
    const fs = require("fs");
    const maxDepth = 5;

    for (let i = 0; i < maxDepth; i++) {
        const sdkPath = path.join(__dirname, "../".repeat(i) + "sdk");
        if (fs.existsSync(sdkPath) && fs.existsSync(path.join(sdkPath, "package.json"))) {
            return sdkPath;
        }
    }

    return null;
}

function resolveSDK(path: string) {
    const sdkDir = getSDKDir();
    if (!sdkDir) {
        throw new Error("SDK not found");
    }
    return resolve(sdkDir, path);
}


export default defineConfig({
    base: "./",
    build: {
        outDir: "dist",
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            "@staroverlay/sdk/tmi": resolveSDK("dist/tmi.mjs"),
            "@staroverlay/sdk": resolveSDK("dist/staroverlay.mjs")
        }
    }
});
