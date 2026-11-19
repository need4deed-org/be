// eslint.config.cjs
const js = require("@eslint/js");
const ts = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const prettier = require("eslint-config-prettier");
const importPlugin = require("eslint-plugin-import");
const unusedImports = require("eslint-plugin-unused-imports");
const globals = require("globals");

// unbound-method misses pino: its log methods are typed as properties
const unboundLoggerRules = [
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
];

const requestUserMessage =
  "Use request.authUser (loaded from the DB, set for JWT and API-key auth); request.user is the raw JWT payload and is unset for API-key callers.";

const requestUserRules = [
  {
    selector:
      "MemberExpression[object.name=/^req(uest)?$/][property.name='user'], MemberExpression[object.name=/^req(uest)?$/][computed=true][property.value='user']",
    message: requestUserMessage,
  },
  {
    selector:
      "VariableDeclarator[init.name=/^req(uest)?$/] > ObjectPattern > Property[key.name='user']",
    message: requestUserMessage,
  },
];

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
      "no-restricted-syntax": [
        "error",
        ...unboundLoggerRules,
        ...requestUserRules,
      ],
    },
  },
  {
    files: ["src/server/plugins/jwt.ts"],
    rules: {
      "no-restricted-syntax": ["error", ...unboundLoggerRules],
    },
  },
];
