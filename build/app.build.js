({
	baseUrl: "../src",
	paths:{
		'ko':'../references/knockout-3.2.0.debug',
		'd3':'../references/d3',
	},
	include: ["../build/almond"],
	exclude: ["d3"],
	optimize: "none",
	name:"koextensions",
	out:"koextensions.js",
	wrap: {
        startFile: 'start.frag',
        endFile: 'end.frag'
    },
	fileExclusionRegExp: /\.git/
})
