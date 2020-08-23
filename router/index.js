const koaBody = require('koa-body');
const Router = require('koa-router');
const mysql = require('mysql');
const config = require('../config');
const formidable = require('formidable');
const fs = require('fs');

const router = new Router();
const AVATAR_UPLOAD_FOLDER = '/avatar/';

var pool = mysql.createPool({
	host: config.database.host,
	user: config.database.user,
	password: config.database.password,
	database: config.database.database,
	port: config.database.port
});

//数据库数据 api
router.get('/admin/api', async (ctx) => {
	let param = ctx.query || ctx.params;
	if (param.page == '' || param.page == null || param.page == undefined || param.limit == '' || param.limit == null || param.limit == undefined) {
		res.end(JSON.stringify({ msg: '请传入参数page', status: '102' }));
		return;
	}

	let data = await new Promise((resolve, reject) => {
		let start = (param.page - 1) * param.limit;
		pool.query('SELECT * FROM article limit ' + start + ',' + param.limit, function (err, results) {
			if (err) {
				throw err;
			}
			resolve(results);
		});
	});

	let total = await new Promise((resolve, reject) => {
		//SELECT SUM(TABLE_ROWS) AS count FROM information_schema.PARTITIONS WHERE TABLE_SCHEMA = SCHEMA () AND TABLE_NAME = "article"
		pool.query('SELECT COUNT(*) FROM article', function (err, results) {
			if (err) {
				throw err;
			}
			resolve(results[0]['COUNT(*)']);
		});
	});

	ctx.body = {
		code: 0,
		count: total,
		data: data,
		msg: 'ok'
	};
});

//提交 api
router.post('/submit', koaBody(), async (ctx) => {
	var form = new formidable.IncomingForm();
	//设置编辑
	form.encoding = 'utf-8';
	//设置上传目录
	form.uploadDir = './static/upload/';
	//保留后缀
	form.keepExtensions = true;
	//文件大小 2M
	form.maxFieldsSize = 2 * 1024 * 1024;
	// 上传文件的入口文件
	form.parse(ctx.req, async function (err, fields, files) {
		if (err) {
			return;
		}
		var extName = ''; //后缀名
		switch (files.file.type) {
			case 'image/jpg':
				extName = 'jpg';
				break;
			case 'image/jpeg':
				extName = 'jpg';
				break;
			case 'image/png':
				extName = 'png';
				break;
			case 'image/x-png':
				extName = 'png';
				break;
			case 'image/gif':
				extName = 'gif';
				break;
		}
		//移动上传的图片
		if (extName !== '') {
			function createRandomId() {
				return (Math.random() * 10000000).toString(16).substr(0, 4) + '-' + new Date().getTime() + '-' + Math.random().toString().substr(2, 5);
			}
			var avatarName = createRandomId() + '.' + extName;
			var newPath = form.uploadDir + avatarName;
			fs.renameSync(files.file.path, newPath); //重命名
		}

		const name = fields.nickname;
		const contact = fields.contact;
		const way = fields.way || '';
		const content = fields.content || '';
		const img = newPath || '';
		const time = new Date().getTime();
		const bbqContent = [name, contact, way, content, img, time];

		pool.query('INSERT INTO article(Id,Author,Contact,Way,Content,Img,Time) VALUES(0,?,?,?,?,?,?)', bbqContent, function (err, result) {
			if (err) {
				console.log('[INSERT ERROR] - ', err.message);
				return;
			}
		});
	});
});

//编辑 api
router.post('/edit', koaBody(), async (ctx) => {
	const id = fields.editId;
	const name = fields.newAuthor;
	const contact = fields.newContact;
	const way = fields.newWay;
	const content = fields.newContent;
	const sql = `UPDATE article SET Author='${name}', Contact='${contact}', Way='${way}', Content='${content}' WHERE Id=${id}`;
	pool.query(sql, function (err, result) {
		if (err) {
			console.log('[UPDATE ERROR] - ', err.message);
			return;
		}
		console.log('Update Successfully');
	});
	ctx.body = JSON.stringify({ code: 0 });
});

router.get('/', async (ctx) => {
	ctx.set({
		'Access-control-Allow-Origin': '*'
	});
	return ctx.redirect('index.html');
});

router.get('/admin', async (ctx) => {
	ctx.set({
		'Access-control-Allow-Origin': '*'
	});
	return ctx.redirect('admin/admin.html');
});

//删除 api
router.get('/del/:id', async (ctx) => {
	let ctxId = ctx.params.id;
	pool.query('DELETE FROM article WHERE Id=' + ctxId, function (err, result) {
		if (err) {
			console.log('[DELETE ERROR] - ', err.message);
			return;
		}
		console.log('Delete Successfully');
	});
	pool.query('ALTER TABLE article AUTO_INCREMENT = 1');
	ctx.body = {
		code: 200
	};
});

module.exports = router;
