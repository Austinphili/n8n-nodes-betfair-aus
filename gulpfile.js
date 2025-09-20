const gulp = require('gulp');
const path = require('path');

// Gulp task to copy SVG icons
// This will look for betfair.svg in your project root (C:\n8n_dev)
// and copy it to the 'dist' folder.
gulp.task('build:icons', () => {
	return gulp.src(['betfair.svg']) 
		.pipe(gulp.dest(path.join('dist')));
});