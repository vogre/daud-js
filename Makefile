all: out.js
	closurec --js_output_file=out.js --language_in=ECMASCRIPT5 main.js
