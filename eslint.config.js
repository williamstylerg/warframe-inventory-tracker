module.exports = [
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "script",
            globals: {
                // Node/Electron main process globals
                require: "readonly",
                module: "readonly",
                process: "readonly",
                __dirname: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                setInterval: "readonly",
                clearTimeout: "readonly",
                // Browser/renderer globals
                window: "readonly",
                document: "readonly",
                fetch: "readonly",
                Chart: "readonly",
                localStorage: "readonly"
            }
        },
        rules: {
            "no-unused-vars": ["warn", { "varsIgnorePattern": "^" }],
            "no-undef": "error"
        }
    }
];