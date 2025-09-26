module.exports = {
	"env": {
		"es2017": true,
		"node": true
	},
	"parser": "@typescript-eslint/parser",
	"extends": [
		"eslint:recommended"
	],
	"parserOptions": {
		"ecmaVersion": 2020,
		"sourceType": "module"
	},
	"rules": {
		"no-console": "off",
		"no-prototype-builtins": "off",
		"no-unused-vars": "off" // <<< --- ADD THIS LINE ---
	}
};