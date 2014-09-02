all: out.js

out.js: main.js
	closurec --js_output_file=out.js --language_in=ECMASCRIPT5 main.js
