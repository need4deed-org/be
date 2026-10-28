// eslint.config.cjs
const js = require("@eslint/js");
const ts = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const prettier = require("eslint-config-prettier");
const importPlugin = require("eslint-plugin-import");
const unusedImports = require("eslint-plugin-unused-imports");
const globals = require("globals");

module.exports = [
  { ignores: ["dist", "node_modules", "dev/**", "**/dev.*.ts"] },
  js.configs.recommended,
  prettier,
  {
    files: ["eslint.config.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          experimentalDecorators: true,
        },
      },
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      "@typescript-eslint": ts,
      import: importPlugin,
      "unused-imports": unusedImports,
    },
    rules: {
      curly: ["error", "all"],
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],

      "sort-keys": "off",
      // unbound-method misses pino: its log methods are typed as properties
      "no-restricted-syntax": [
        "error",
        {
          selector:
            ":matches(CallExpression, NewExpression) > MemberExpression.arguments[property.name=/^(trace|debug|info|warn|error|fatal)$/]:matches([object.name=/^(log|logger)$|Log(ger)?$/], [object.property.name=/^(log|logger)$|Log(ger)?$/])",
          message:
            "Pass a bound logger call, e.g. `(err) => logger.error(err)`: an unbound pino method throws when called.",
        },
        {
          selector:
            ":matches(CallExpression, NewExpression) > ChainExpression.arguments > MemberExpression.expression[property.name=/^(trace|debug|info|warn|error|fatal)$/]:matches([object.name=/^(log|logger)$|Log(ger)?$/], [object.property.name=/^(log|logger)$|Log(ger)?$/])",
          message:
            "Pass a bound logger call, e.g. `(err) => logger.error(err)`: an unbound pino method throws when called.",
        },
      ],
    },
  },
];
