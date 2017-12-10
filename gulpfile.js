const gulp = require('gulp');
const ts = require('gulp-typescript');
const tsProject = ts.createProject('tsconfig.json');
const fs = require("fs");
const { fork } = require('child_process');
const path = require("path");
const yaml = require("js-yaml");

const config = yaml.load(fs.readFileSync("config.yaml"));
const distDir = "./dist";
const espReadyBundleFileName = "bundle.js";
const espReadyBundlePath = path.join(distDir, espReadyBundleFileName);
const appFileName = "app.js";
const espConsoleBeingWatchedFileName = "esp-console-input.js";
const espConsoleBeingWatchedFilePath = path.join(distDir, espConsoleBeingWatchedFileName);

gulp.task("build", ["prepare-for-espruino"]);

gulp.task("prepare-for-espruino", ['compile-ts', 'content-to-dist'], (cb) => {
    const buildproc = fork(
        require.resolve("espruino/bin/espruino-cli"),
        ["--board", config.board, appFileName, "-o", espReadyBundleFileName],
        { cwd: distDir });
    buildproc.on('close', (code) => {
        cb();
    });
});

gulp.task("compile-ts", function () {
    const tsResult = tsProject.src().pipe(tsProject());
    return tsResult.js.pipe(gulp.dest(distDir));
});

gulp.task("content-to-dist", () => {
    return gulp
        .src("src/**/*.js", { base: 'src' })
        .pipe(gulp.dest(distDir));
});

gulp.task("send-to-espurino-console", (cb) => {
    const content = fs.readFileSync(espReadyBundlePath);
    fs.writeFile(
        espConsoleBeingWatchedFilePath,
        content,
        (err) => {
            if (err) { throw err; }
            cb();
        });
});

gulp.task("espruino-console", ["send-to-espurino-console"], (cb) => {
    const buildproc = fork(
        require.resolve("espruino/bin/espruino-cli"),
        ["--board", config.board, "-b", config.port_speed, "--port", config.port, "-w", espConsoleBeingWatchedFileName],
        { cwd: distDir });
    buildproc.on('close', (code) => {
        cb();
    });
});