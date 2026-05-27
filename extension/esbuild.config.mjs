import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");
const common = {
  bundle: true,
  format: "iife",
  target: "chrome120",
  logLevel: "info",
};

const entries = [
  { in: "src/background/service-worker.ts", out: "dist/background.js" },
  { in: "src/content/content-script.ts", out: "dist/content.js" },
  { in: "src/popup/popup.ts", out: "dist/popup.js" },
  { in: "src/options/options.ts", out: "dist/options.js" },
];

const builds = entries.map(({ in: entryPoints, out: outfile }) =>
  esbuild.build({
    ...common,
    entryPoints: [entryPoints],
    outfile,
  })
);

if (watch) {
  const contexts = await Promise.all(
    entries.map(({ in: entryPoints, out: outfile }) =>
      esbuild.context({ ...common, entryPoints: [entryPoints], outfile })
    )
  );
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  console.log("Watching extension sources…");
} else {
  await Promise.all(builds);
  console.log("Extension build complete.");
}
