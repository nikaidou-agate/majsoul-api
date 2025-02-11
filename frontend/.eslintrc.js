module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	plugins: [
		'@typescript-eslint',
	],
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		"plugin:react/recommended",
		"plugin:react-hooks/recommended"
	],
	"rules": {
		"react/prop-types": false
	}
};