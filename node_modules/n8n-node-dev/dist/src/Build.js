"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCustomTsconfig = createCustomTsconfig;
exports.buildFiles = buildFiles;
const di_1 = require("@n8n/di");
const child_process_1 = require("child_process");
const fast_glob_1 = __importDefault(require("fast-glob"));
const promises_1 = require("fs/promises");
const n8n_core_1 = require("n8n-core");
const n8n_workflow_1 = require("n8n-workflow");
const path_1 = require("path");
const tmp_promise_1 = require("tmp-promise");
async function createCustomTsconfig() {
    const tsconfigPath = (0, path_1.join)((0, path_1.dirname)(require.resolve('n8n-node-dev/src')), 'tsconfig-build.json');
    const tsConfigString = await (0, promises_1.readFile)(tsconfigPath, { encoding: 'utf8' });
    const tsConfig = (0, n8n_workflow_1.jsonParse)(tsConfigString);
    const newIncludeFiles = [];
    for (const includeFile of tsConfig.include) {
        newIncludeFiles.push((0, path_1.join)(process.cwd(), includeFile));
    }
    tsConfig.include = newIncludeFiles;
    const { path, cleanup } = await (0, tmp_promise_1.file)();
    await (0, promises_1.writeFile)(path, JSON.stringify(tsConfig, null, 2));
    return {
        path,
        cleanup,
    };
}
async function buildFiles({ destinationFolder = di_1.Container.get(n8n_core_1.InstanceSettings).customExtensionDir, watch, }) {
    const tscPath = (0, path_1.join)((0, path_1.dirname)(require.resolve('typescript')), 'tsc');
    const tsconfigData = await createCustomTsconfig();
    await Promise.all(['*.svg', '*.png', '*.node.json'].map(async (filenamePattern) => {
        const files = await (0, fast_glob_1.default)(`**/${filenamePattern}`);
        for (const file of files) {
            const src = (0, path_1.resolve)(process.cwd(), file);
            const dest = (0, path_1.resolve)(destinationFolder, file);
            await (0, promises_1.mkdir)((0, path_1.dirname)(dest), { recursive: true });
            await (0, promises_1.copyFile)(src, dest);
        }
    }));
    const nodeModulesPath = (0, path_1.join)(__dirname, '../../node_modules/');
    let buildCommand = `${tscPath} --p ${tsconfigData.path} --outDir ${destinationFolder} --rootDir ${process.cwd()} --baseUrl ${nodeModulesPath}`;
    if (watch) {
        buildCommand += ' --watch';
    }
    try {
        const buildProcess = (0, child_process_1.spawn)('node', buildCommand.split(' '), {
            windowsVerbatimArguments: true,
            cwd: process.cwd(),
        });
        buildProcess.stdout.pipe(process.stdout);
        buildProcess.stderr.pipe(process.stderr);
        process.on('exit', () => buildProcess.kill());
        await new Promise((resolve) => {
            buildProcess.on('exit', resolve);
        });
    }
    catch (error) {
        let errorMessage = error.message;
        if (error.stdout !== undefined) {
            errorMessage = `${errorMessage}\nGot following output:\n${error.stdout}`;
        }
        throw new Error(errorMessage);
    }
    finally {
        await tsconfigData.cleanup();
    }
    return destinationFolder;
}
//# sourceMappingURL=Build.js.map