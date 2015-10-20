// 1. Install nodejs (it will automatically installs requirejs)

//- assuming the folder structure for your app is:
// app
// 		css
// 		img
// 		js
// 		main.js
// 		index.html
// build
// 		app.build.js
// 		r.js (downloaded from requirejs website)

// 2. the command line to run:
// $ node r.js -o app.build.js
//

({
	//- paths are relative to this app.build.js file
	baseUrl: "../Scripts",
	//- this is the directory that the new files will be. it will be created if it doesn't exist
	paths: {

	},
	include: ["../src/almond"],
	exclude: ["d3"],
	optimize: "none",
	name:"KoExtensions/koextensions",
	out:"KoExtensions.js",
	wrap: {
        startFile: 'start.frag',
        endFile: 'end.frag'
    },
	fileExclusionRegExp: /\.git/
})
