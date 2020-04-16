const gulp = require('gulp')
const imagemin = require('gulp-imagemin') // imagemin
const svgo = require('imagemin-svgo') // svg压缩
const gifsicle = require('imagemin-gifsicle') // gif压缩
const jpegtran = require('imagemin-jpegtran') // jpg压缩
const pngquant = require('imagemin-pngquant') // png压缩
const optipng = require('imagemin-optipng') // png压缩
const sourcemaps = require('gulp-sourcemaps') // source map
// const concat = require('gulp-concat') // 合并文件
const cssnano = require('gulp-cssnano') // css压缩
const postcss = require('gulp-postcss') // css单解析工具
const autoprefixer = require('autoprefixer') // 添加css厂家前缀
const rename = require('gulp-rename') // 重命名
const px2rem = require('postcss-px2rem') // px转rem
const makeUrlVer = require('gulp-make-css-url-version') // css添加时间戳
const sass = require('gulp-sass') // 编译Sass
const spritesmith = require('gulp.spritesmith') // 生成雪碧图&样式表
const fontmin = require('gulp-fontmin') // 字体子集化
const terser = require('gulp-terser') // js压缩
const babel = require('gulp-babel') // 转换编译
const eslint = require('gulp-eslint') // babel环境预设
const htmlmin = require('gulp-htmlmin') // html压缩
const browserSync = require('browser-sync').create('forGulp') // 浏览器同步测试工具
const del = require('del') // 删除文件（夹）

/* 图片压缩 */
gulp.task('runImage', () => {
  return gulp.src(['./images/dev/**'])
    .pipe(
      imagemin([
        gifsicle({ optimizationLevel: 3 }),
        jpegtran({ progressive: true }),
        optipng({ optimizationLevel: 7 }),
        pngquant({ speed: 1, strip: true }),
        svgo()
      ]))
    .pipe(gulp.dest('./images/release/'))
})

/* css：[合并]、压缩、添加厂商前缀、重命名、添加timestamp、source map */
gulp.task('runCss', () => {
  return gulp.src(['./css/dev/**/*.css'])
    .pipe(sourcemaps.init())
    // .pipe(concat('all.css'))
    .pipe(cssnano({
      discardUnused: false, // 去除未使用的CSS内容
      zindex: false, // 重新排序z-index
      reduceIdents: false, // 重命名@keyframes
      mergeIdents: false // 合并相同规则但不同命名的@keyframes
    }))
    .pipe(postcss([autoprefixer()]))
    .pipe(rename({
      // dirname: 'css/rename',  // 路径
      // basename: 'file',  // 原本名字
      // prefix: 'pre-', // basename的前缀
      suffix: '.min' // basename的后缀
      // extname: '.scss'  // 扩展名
    }))
    .pipe(makeUrlVer({ useDate: true })) // 不被gulp-sourcemaps支持
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./css/release/'))
})

/* Sass：转译压缩css、添加厂商前缀、添加timestamp、source map */
gulp.task('runScss', () => {
  return gulp.src(['./scss/dev/**/*.scss'])
    .pipe(sourcemaps.init())
    .pipe(
      sass({
        outputStyle: 'compressed' // 输出方式：compressed、expanded
      }).on('error', sass.logError)
    )
    .pipe(postcss([autoprefixer()]))
    .pipe(makeUrlVer({ useDate: true })) // 不被gulp-sourcemaps支持
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./scss/release/'))
})

/**
 * px -> rem
 * 对所有没有注释的px转换为rem
 * 对结尾带有「px」的注释，转化为[data-dpr="1~3"] 对象{px值}
 * 对结尾带有「no」的注释，不进行转换
 */
gulp.task('runPx2rem', () => {
  return gulp.src(['./px2rem/dev/**/*.css'])
    .pipe(postcss([
      px2rem({
        remUnit: 20, // px -> rem除以的数
        baseDpr: 1, // /*px*/转换前值的DPR
        remPrecision: 6 // 小数精确位数
      })
    ]))
    .pipe(gulp.dest('./px2rem/release/'))
})

/* 多图 -> 雪碧图 + 样式表 */
gulp.task('runSprites', gulp.parallel(
  function runSpritesPC () {  /* PC端 */
    return gulp.src('./sprites/dev/*')
      .pipe(spritesmith({
        padding: 2, // 合并图间距
        algorithm: 'top-down', // 排列方式 ['binary-tree' | 'top-down' | 'left-right' | 'diagonal' | 'alt-diagonal']
        imgName: 'sprites.png', // 输出合并后图片
        cssTemplate: 'pc.handlebars', // 渲染输出css的模板文件
        cssName: 'sprites_pc.css' // 输出合并后样式（后缀为[.css | .sass | .scss | .less | .styl/.stylus | .json]）
      }))
      .pipe(gulp.dest('./sprites/release/'))
  },
  function runSpritesWAP () {  /* WAP端（rem+%） */
    return gulp.src('./sprites/dev/*')
      .pipe(spritesmith({
        padding: 2,
        algorithm: 'top-down',
        imgName: 'sprites.png',
        cssTemplate: 'wap.handlebars',
        cssName: 'sprites_wap.scss'
      }))
      .pipe(gulp.dest('./sprites/release/'))
  }
))

/* ttf -> 多个兼容字体 + 样式表 */
gulp.task('runFont', cb => {
  const buffers = []

  return gulp.src(['./font/dev/*.html']) /* 传入需要提取字体的页面，没有页面则所有字 */
    .on('data', file => {
      buffers.push(file.contents)
    })
    .on('end', () => {
      const text = Buffer.concat(buffers).toString('utf-8')
      gulp.src(['./font/dev/*.ttf']) // 只能传入ttf类型
        .pipe(fontmin({ text: text }))
        .pipe(gulp.dest('./font/release/'))
        .on('end', cb)
    })
})

/* js：[合并]、压缩、重命名、source map */
gulp.task('runJs', () => {
  return gulp.src(['./js/dev/**/*.js'])
    .pipe(sourcemaps.init())
    // .pipe(concat('all.js'))
    .pipe(terser())
    .pipe(rename({
      // dirname: 'js/rename',  // 路径
      // basename: 'file',  // 原本名字
      // prefix: 'pre-', // basename的前缀
      suffix: '.min' // basename的后缀
      // extname: '.ts'  // 扩展名
    }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./js/release/'))
})

/* ES6 -> ES5 */
gulp.task('runBabel', () => {
  return gulp.src(['./babel/dev/**/*.js'])
    .pipe(sourcemaps.init())
    .pipe(babel())
    // .pipe(concat('all.js'))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./babel/release/'))
})

/* ESLint */
gulp.task('runEslint', () => {
  return gulp.src(['./eslint/dev/**/*.js', './eslint/dev/**/*.html', './eslint/dev/**/*.vue'])
    .pipe(eslint({
      configFile: './.eslintrc.js',
      fix: true
    }))
    .pipe(eslint.result(result => {
      console.log(`${result.filePath} -> ${result.warningCount} Warnings, ${result.errorCount} Errors.`)
    }))
    .pipe(eslint.format())
    .pipe(gulp.dest('./eslint/release/'))
})

/* html：压缩 */
gulp.task('runHtml', () => {
  return gulp.src(['./html/dev/**/*.html'])
    .pipe(htmlmin({
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true, // uses UglifyJS（仅支持ES5，若JS有ES6内容则不压缩）
      removeComments: true
    }))
    .pipe(gulp.dest('./html/release/'))
})

/* default */
gulp.task('default', gulp.parallel(
  'runImage',
  'runCss',
  'runScss',
  'runPx2rem',
  'runSprites',
  'runFont',
  'runJs',
  'runBabel',
  'runEslint',
  'runHtml'
))

/* 监视文件，自动执行（只能针对已经存在的文件修改，在文件夹增加的内容不会触发） */
gulp.task('watch', () => {
  gulp.watch(['./images/dev/**'], gulp.parallel('runImage'))
  gulp.watch(['./css/dev/**/*.css'], gulp.parallel('runCss'))
  gulp.watch(['./scss/dev/**/*.scss'], gulp.parallel('runScss'))
  gulp.watch(['./px2rem/dev/**/*.css'], gulp.parallel('runPx2rem'))
  gulp.watch(['./sprites/dev/**'], gulp.parallel('runSprites'))
  gulp.watch(['./font/dev/**'], gulp.parallel('runFont'))
  gulp.watch(['./js/dev/**/*.js'], gulp.parallel('runJs'))
  gulp.watch(['./babel/dev/**/*.js'], gulp.parallel('runBabel'))
  gulp.watch(['./eslint/dev/**/*.js', './eslint/dev/**/*.html', './eslint/dev/**/*.vue'], gulp.parallel('runEslint'))
  gulp.watch(['./html/dev/**/*.html'], gulp.parallel('runHtml'))
})

/* 监听代理服务器 */
gulp.task('browserSync', () => {
  browserSync.init({
    ui: {
      port: 3001 // UI端口号
    },
    port: 3000, // 端口号

    // proxy: { // 服务器
    //   target: 'localhost'
    // },
    server: {   // 相对地址
      baseDir: './browserSync', // '../www/'
      directory: true
    }
  })

  gulp.watch([
    'browserSync/**/*.html',
    'browserSync/**/*.js',
    'browserSync/**/*.css',
    'browserSync/**/images/**',
    '!browserSync/**/node_modules/**'
    // '../../www/demo/**/*.html',
    // '../../www/demo/**/js/**/*.js',
    // '../../www/demo/**/css/**/*.css',
    // '../../www/demo/**/images/**',
    // '!../../www/demo/**/node_modules/**'
  ]).on('change', browserSync.reload) // 刷新浏览器
})

/* 删除文件（夹） */
gulp.task('delRelease', () => {
  return del([
    './images/release/**/*',
    './css/release/**/*',
    './scss/release/**/*',
    './px2rem/release/**/*',
    './sprites/release/**/*',
    './font/release/**/*',
    './js/release/**/*',
    './babel/release/**/*',
    './eslint/release/**/*',
    './html/release/**/*'
  ], { force: true }).then(paths => {
    if (paths.length > 0) {
      console.log('已经删除的文件或文件夹:\r\n', paths.join('\r\n'))
    } else {
      console.log('没有删除任何内容')
    }
  })
})
