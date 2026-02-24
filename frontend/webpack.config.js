/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const devCerts = require("office-addin-dev-certs");

module.exports = async (env, options) => {
    const dev = options.mode === "development";

    // Get dev HTTPS certs for local testing with Office
    let httpsOptions;
    if (dev) {
        try {
            httpsOptions = await devCerts.getHttpsServerOptions();
        } catch {
            console.warn("Could not get HTTPS certs, using HTTP instead.");
        }
    }

    return {
        entry: {
            taskpane: "./src/taskpane/index.tsx",
            commands: "./src/commands/commands.ts",
        },
        output: {
            path: path.resolve(__dirname, "dist"),
            filename: "[name].bundle.js",
            clean: true,
        },
        resolve: {
            extensions: [".ts", ".tsx", ".js", ".jsx"],
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: "ts-loader",
                    exclude: /node_modules/,
                },
                {
                    test: /\.css$/,
                    use: ["style-loader", "css-loader", "postcss-loader"],
                },
                {
                    test: /\.js$/,
                    enforce: "pre",
                    use: "source-map-loader",
                    exclude: /node_modules/,
                },
            ],
        },
        plugins: [
            new HtmlWebpackPlugin({
                filename: "taskpane.html",
                template: "./src/taskpane/taskpane.html",
                chunks: ["taskpane"],
            }),
            new HtmlWebpackPlugin({
                filename: "commands.html",
                template: "./src/commands/commands.html",
                chunks: ["commands"],
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: "assets",
                        to: "assets",
                        noErrorOnMissing: true,
                    },
                ],
            }),
        ],
        devServer: {
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
            server: httpsOptions
                ? { type: "https", options: httpsOptions }
                : "https",
            port: 3000,
            hot: true,
        },
        devtool: dev ? "source-map" : false,
    };
};
