'use strict';

var autoprefixer = require('gulp-autoprefixer');
var concat = require('gulp-concat');
var del = require('del');
var gulp = require('gulp');
var imagemin = require('gulp-imagemin');
var inject = require('gulp-inject');
var minifycss = require('gulp-minify-css');
var notify = require('gulp-notify');
var rename = require('gulp-rename');
var runSequence = require('run-sequence');
var streamSeries = require('stream-series');
var plumber = require('gulp-plumber');
var uglify = require('gulp-uglify');

var declare = require('gulp-declare');
var pug = require('gulp-pug');
var pugJob = require('gulp-pug-job')
var jade = require('gulp-jade')
var stylus = require('gulp-stylus')

var changed = require('gulp-changed');

var buffer = require('vinyl-buffer');
var merge = require('merge-stream');
var spritesmith = require('gulp.spritesmith');

var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync')

var revHash = require('gulp-rev-hash3');

var argv = require('yargs').argv;
var _ = require('lodash')

var packageJson = require('./package.json')
var projects = packageJson.projects

/* ============================================================================================================
 ============================================ For Development ==================================================
 =============================================================================================================*/

var path = require('path')

var pConfigs = []
var tasks = []
var publishTasks = []
var keys = []
var publishKeys = []

function run() {
    var fs = require('fs')
    var dir = fs.readdirSync('./projects')

    if (!projects.length) {
        return errorAlert({plugin: "config", message: `没有可用项目`})
    }

    for (var i in projects) {
        var r = projects[i]
        var dir = path.resolve('./projects/' + r)
        var isDir = fs.statSync(dir).isDirectory()
        if (!isDir) return
        try {
            var packageJson = require(path.resolve(dir, 'package.json'))
            var pConfig = packageJson.config
            // if (!pConfig.active) return
            var b = browserSync.create()
            setTasks(dir, pConfig, packageJson.name, b)
        } catch (e) {
        }
    }

    if (!tasks.length) {
        return errorAlert({plugin: "config", message: `没有可用项目`})
    }

    _.each(tasks, function (r) {
        keys.push(r.name)
        gulp.task(r.name, r.method)
    })

    _.each(publishTasks, function (r) {
        publishKeys.push(r.name)
        gulp.task(r.name, r.method)
    })

    console.log(tasks)
    // runSequence(keys)
}

run()

gulp.task('dev', keys, function () {
    console.log('done')
})

gulp.task('delete', function () {
    var ts = []
    // _.each(pConfigs, function (r) {
    //     let name = `${r.name}-delete`
    //     ts.push(`${r.publishDist}/*.html`);
    // })
    // del.sync(ts, {force: true});
})

gulp.task('rev', publishKeys, function () {
    var ts = []
    _.each(pConfigs, function (r) {
        let name = `${r.name}-rev`
        ts.push(name)
        gulp.task(name, function () {
            return gulp.src(`${r.publishDist}/*.html`)
                .pipe(revHash({
                    assetsDir: r.publishDist,
                }))
                .pipe(gulp.dest(r.publishDist));
        })
    })
    runSequence(ts)
})

gulp.task('publish', ['delete', 'rev'], function () {
    console.log('publish done')
})

var count = 1

function setTasks(sourceDir, config, name, b) {
    let dist = path.resolve(sourceDir, 'dist')
    let publishDist = config.dist
    if (!publishDist) {
        return errorAlert({plugin: "config", message: "需要配置项目 config dist"})
    }
    if (publishDist.lastIndexOf('/') == publishDist.length - 1) {
        publishDist = publishDist.substring(0, publishDist.length - 1)
    }

    // if (fs.existsSync(dist)) {
    // return errorAlert({ plugin: "config", message: `${dist} 不存在，请确认路径是否正确` })
    // }

    pConfigs.push({
        name: name,
        dist: dist,
        publishDist: publishDist
    })

    // 处理 lib
    tasks.push({
        name: `${name}-lib`,
        method: function () {
            return gulp.src('lib/**')
                .pipe(plumber({
                    errorHandler: errorAlert
                }))
                .pipe(gulp.dest(`${dist}/lib`));
        }
    })

    publishTasks.push({
        name: `p-${name}-lib`,
        method: function () {
            return gulp.src('lib/**')
                .pipe(plumber({
                    errorHandler: errorAlert
                }))
                .pipe(gulp.dest(`${publishDist}/lib`));
        }
    })

    // 处理 jade js template
    tasks.push({
        name: `${name}-template`,
        method: function () {
            return gulp.src(`${sourceDir}/src/template/*.jade`)
                .pipe(plumber({
                    errorHandler: errorAlert
                }))
                .pipe(jade({client: true}))
                .pipe(declare({namespace: 'T', noRedeclare: true}))
                .pipe(concat('template.js'))
                .pipe(gulp.dest(`${dist}/js`));
        }
    })

    publishTasks.push({
        name: `p-${name}-template`,
        method: function () {
            return gulp.src(`${sourceDir}/src/template/*.jade`)
                .pipe(plumber({
                    errorHandler: errorAlert
                }))
                .pipe(jade({client: true}))
                .pipe(declare({namespace: 'T', noRedeclare: true}))
                .pipe(concat('template.js'))
                .pipe(gulp.dest(`${publishDist}/js`));
        }
    })

    // 处理js
    tasks.push({
        name: `${name}-js`,
        method: function () {
            return gulp.src(`${sourceDir}/src/js/**`)
                .pipe(plumber({
                    errorHandler: errorAlert
                }))
                .pipe(sourcemaps.init({loadMaps: true}))
                .pipe(sourcemaps.write())
                .pipe(gulp.dest(`${dist}/js`));
        }
    })

    publishTasks.push({
        name: `p-${name}-js`,
        method: function () {
            return gulp.src(`${sourceDir}/src/js/**`)
                .pipe(plumber({
                    errorHandler: errorAlert
                }))
                .pipe(uglify())
                .pipe(gulp.dest(`${publishDist}/js`));
        }
    })

    // 处理 pug
    tasks.push({
        name: `${name}-jade`,
        method: function () {
            return gulp.src(`${sourceDir}/src/jade/*.pug`)
                .pipe(plumber({
                    errorHandler: errorAlert
                }))
                .pipe(pug({
                    pretty: true
                }))
                .pipe(gulp.dest(`${dist}`));
        }
    })

    if (!config.nojade) {
        publishTasks.push({
            name: `p-${name}-jade`,
            method: function () {
                return gulp.src(`${sourceDir}/src/jade/*.pug`)
                    .pipe(plumber({
                        errorHandler: errorAlert
                    }))
                    .pipe(pug())
                    .pipe(gulp.dest(`${publishDist}`));
            }
        })
    }

    // 处理 css
    tasks.push({
        name: `${name}-css`,
        method: function () {
            return gulp.src(`${sourceDir}/src/style/*.styl`)
                .pipe(plumber({
                    errorHandler: errorAlert
                }))
                .pipe(stylus())
                .pipe(autoprefixer())
                .pipe(gulp.dest(`${dist}/css`))
                .pipe(b.stream())
        }
    })

    publishTasks.push({
        name: `p-${name}-css`,
        method: function () {
            return gulp.src(`${sourceDir}/src/style/*.styl`)
                .pipe(plumber({
                    errorHandler: errorAlert
                }))
                .pipe(stylus())
                .pipe(autoprefixer())
                .pipe(minifycss())
                .pipe(gulp.dest(`${publishDist}/css`))
        }
    })

    // 处理 image
    var sourcePaths = [`${sourceDir}/src/image/!(sprite)**`, `${sourceDir}/src/image/!(sprite)**/**`]
    tasks.push({
        name: `${name}-image`,
        method: function () {
            return gulp.src(sourcePaths)
                .pipe(plumber({
                    errorHandler: errorAlert
                }))
                .pipe(changed(`${dist}/image`))
                .pipe(gulp.dest(`${dist}/image`));
        }
    })

    publishTasks.push({
        name: `p-${name}-image`,
        method: function () {
            return gulp.src(sourcePaths)
                .pipe(plumber({
                    errorHandler: errorAlert
                }))
                // .pipe(imagemin())
                .pipe(gulp.dest(`${publishDist}/image`));
        }
    })

    // 处理 sprite
    var spriteNames = config.spriteNames
    if (spriteNames.length) {
        _.each(spriteNames, function (r) {
            tasks.push({
                name: `${name}-${r}`,
                method: function () {
                    setSprite(sourceDir, dist, r)
                }
            })
        })

        _.each(spriteNames, function (r) {
            publishTasks.push({
                name: `p-${name}-${r}`,
                method: function () {
                    setSprite(sourceDir, publishDist, r)
                }
            })
        })
    }

    // 处理 source
    tasks.push({
        name: `${name}-source`,
        method: function () {
            return gulp.src(`${sourceDir}/src/source/**`)
                .pipe(plumber({
                    errorHandler: errorAlert
                }))
                .pipe(gulp.dest(`${dist}/source`));
        }
    })

    publishTasks.push({
        name: `p-${name}-source`,
        method: function () {
            return gulp.src(`${sourceDir}/src/source/**`)
                .pipe(plumber({
                    errorHandler: errorAlert
                }))
                .pipe(gulp.dest(`${publishDist}/source`));
        }
    })

    // 处理 font
    tasks.push({
        name: `${name}-font`,
        method: function () {
            return gulp.src(`${sourceDir}/src/font/**`)
                .pipe(plumber({
                    errorHandler: errorAlert
                }))
                .pipe(gulp.dest(`${dist}/font`));
        }
    })

    publishTasks.push({
        name: `p-${name}-font`,
        method: function () {
            return gulp.src(`${sourceDir}/src/font/**`)
                .pipe(plumber({
                    errorHandler: errorAlert
                }))
                .pipe(gulp.dest(`${publishDist}/font`));
        }
    })

    publishTasks.push({
        name: `p-${name}-rev`,
        method: function () {
            return gulp.src(`${publishDist}/*.html`)
                .pipe(revHash({
                    assetsDir: publishDist,
                }))
                .pipe(gulp.dest(publishDist));
        }
    })

    // watch files and run corresponding task(s) once files are added, removed or edited.
    tasks.push({
        name: `${name}-watch`,
        method: function () {
            b.init({
                port: config.port || 8080 + count,
                open: "external",
                // host跑不起来的！
                // host: "http://localhost" || "",
                host: packageJson.host || "",
                ui: false,
                server: {
                    baseDir: dist,
                    index: "index.html"
                }
            });

            count++

            gulp.watch('lib/**', [`${name}-lib`]).on('change', b.reload);

            gulp.watch('src/template/*.jade', {cwd: sourceDir}, [`${name}-template`]).on('change', b.reload);
            if (!config.nojade) {
                gulp.watch('src/jade/**', {cwd: sourceDir}, [`${name}-jade`]).on('change', b.reload);
            }
            gulp.watch('src/js/**', {cwd: sourceDir}, [`${name}-js`]).on('change', b.reload);
            gulp.watch('src/style/**', {cwd: sourceDir}, [`${name}-css`])

            var imgTasks = []
            if (spriteNames.length) {
                _.each(spriteNames, function (r) {
                    var sname = `${name}-${r}`
                    imgTasks.push(sname)
                })
            }
            console.log(imgTasks)
            gulp.watch('src/image/**/**', {cwd: sourceDir}, imgTasks).on('change', b.reload);
            gulp.watch('src/image/**', {cwd: sourceDir}, [`${name}-image`]).on('change', function (event) {
                if (event.type === 'deleted') {
                    var base = path.parse(event.path).base
                    if (base) {
                        var destFilePath = path.resolve(dist, 'image', base);
                        console.log(destFilePath)
                        del.sync(destFilePath, {force: true});
                    }
                }
                b.reload()
            });

            gulp.watch('src/font/**', {cwd: sourceDir}, [`${name}-font`]).on('change', b.reload);
            gulp.watch('src/source/**', {cwd: sourceDir}, [`${name}-source`]).on('change', b.reload);
        }
    })
}

function setSprite(sourceDir, dist, name) {
    console.log('sprite name:' + name)
    var distDir = dist + '/image'
    console.log(`${sourceDir}/src/image/${name}/*.png`)
    var spriteData = gulp.src(`${sourceDir}/src/image/${name}/*.png`).pipe(spritesmith({
        imgName: `../image/${name}.png`,
        cssName: name + '.styl',
        cssTemplate: `${sourceDir}/src/style/common/stylus.template.handlebars`,
        padding: 2,
        // retinaSrcFilter: [`${sourceDir}/src/image/${name}/*@2x.png`],
        // retinaImgName: 'sprite@2x.png',
        // cssRetinaSpritesheetName: '2x',
        cssHandlebarsHelpers: {
            px2Rem: function (px) {
                var val = px.toString().replace('px', '').replace('rem', '')
                return val == '0' ? 0 : val / 40 + 'rem'
            },
            noHover: function (name) {
                return name.replace('_hover', '').replace('-hover', '')
            },
            hasHover: function (name, options) {
                if (name.indexOf('_hover') > 0) {
                    return options.fn(this)
                } else {
                    return options.inverse(this)
                }
            }
        }
    }));

    var imgStream = spriteData.img
    // DEV: We must buffer our stream into a Buffer for `imagemin`
        .pipe(buffer())
        // .pipe(imagemin())
        .pipe(gulp.dest(distDir));

    var cssStream = spriteData.css
        .pipe(gulp.dest(`${sourceDir}/src/style/common/`));

    return merge(imgStream, cssStream);
}

gulp.task('sprite', function () {
    var tasks = ['sprite', 'sprite2']
    for (var i in tasks) {
        let task = tasks[i]
        setSprite(task)
    }
})

// delete cache
// gulp.task('clean-cache', function (cb) {
//     return cache.clearAll(cb)
// });

// default task
gulp.task('default', ['dev']);

/* ===============================================
 ================== Functions ====================
 ================================================*/

// handle errors
function errorAlert(error) {
    notify.onError({
        title: "Error in plugin '" + error.plugin + "'",
        message: error.message || 'Check your terminal',
        sound: 'Sosumi'
    })(error);
    console.log(error.toString());
    // this.emit('end');
}