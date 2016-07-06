var express = require('express');
var mysql = require('mysql');
var session = require('express-session')
var async = require('async');
var request = require('supertest');
var bodyParser = require('body-parser');
var expect = require('chai').expect
var authority = require('..');
var dbinfo = {
  'host' : 'localhost',
  'port' : 3306,
  'user' : 'root',
  'password' : '',
  'database' : 'authority_test'
};
var pool = mysql.createPool({
  connectionLimit : 10,
  host     : dbinfo.host,
  port     : dbinfo.port,
  user     : dbinfo.user,
  password : dbinfo.password,
  database : dbinfo.database,
  charset  : 'UTF8_GENERAL_CI',
  debug    : false,
  supportBigNumbers :true
});

before(function(done){
  clearDatabase(done);
});

describe('集成到express',function(){
  it('不传入mysql配置会报错', function() {
    expect(function(){authority.configure({})}).to.throw(Error,'You must specify mysql options');
  });
  it('不传入mysql.databases配置会报错', function() {
    expect(function(){authority.configure({mysql:{}})}).to.throw(Error,'You must specify mysql database');
  });
  it('req不包含session配置会报错', function() {
    expect(function(){authority.authMiddleWare({})}).to.throw(Error,'You must use the middleware after hang session parser');
  });
});

describe('功能测试',function(){
  var app;
  var cookie;
  before(function(){
    app = initServer();
  });
  it('登录普通用户', function(done) {
    request(app)
      .post('/signin')
      .send({uid:30001})
      .expect(function(res){
        cookie = res.headers['set-cookie'];
      })
      .expect(200,done);
  });
  it('检查test_auth_1', function(done) {
    request(app)
      .post('/check')
      .send({permission:'test_auth_1'})
      .set('cookie',cookie)
      .expect(function(res){
        expect(res.body).to.have.property('result',true);;
      })
      .expect(200,done);
  });
  it('检查test_auth_2', function(done) {
    request(app)
      .post('/check')
      .send({permission:'test_auth_2'})
      .set('cookie',cookie)
      .expect(function(res){
        expect(res.body).to.have.property('result',true);;
      })
      .expect(200,done);
  });
  it('登录超级管理员', function(done) {
    request(app)
      .post('/signin')
      .send({uid:30002})
      .expect(function(res){
        cookie = res.headers['set-cookie'];
      })
      .expect(200,done);
  });
  it('检查test_auth_1', function(done) {
    request(app)
      .post('/check')
      .send({permission:'test_auth_1'})
      .set('cookie',cookie)
      .expect(function(res){
        expect(res.body).to.have.property('result',true);;
      })
      .expect(200,done);
  });
  it('检查test_auth_2', function(done) {
    request(app)
      .post('/check')
      .send({permission:'test_auth_2'})
      .set('cookie',cookie)
      .expect(function(res){
        expect(res.body).to.have.property('result',true);;
      })
      .expect(200,done);
  });
});

function clearDatabase (cb){
  async.auto({
    drop_auth:function(cb){
      pool.query('DROP TABLE IF EXISTS `tb_authority`;',function(err, result){
        cb(err, result);
      });
    },
    drop_role:function(cb){
      pool.query('DROP TABLE IF EXISTS `tb_role`;',function(err, result){
        cb(err, result);
      });
    },
    drop_map:function(cb){
      pool.query('DROP TABLE IF EXISTS `tb_map`;',function(err, result){
        cb(err, result);
      });
    },
    drop_admin:function(cb){
      pool.query('DROP TABLE IF EXISTS `tb_admin`;',function(err, result){
        cb(err, result);
      });
    },
    create_auth:['drop_auth', function(cb, result){
      var query = 'CREATE TABLE tb_authority(\
          auth_id     bigint unsigned PRIMARY KEY AUTO_INCREMENT\
        , name        varchar(40) not null unique\
        , code        varchar(40) not null unique\
        , description varchar(80) not null default \'\'\
        )ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;';
      pool.query(query,function(err, result){
        cb(err, result);
      });
    }],
    create_role:['drop_role', function(cb, result){
      var query = 'CREATE TABLE tb_role(\
          role_id     bigint unsigned PRIMARY KEY AUTO_INCREMENT\
        , name        varchar(40) not null unique\
        , description varchar(80) not null default \'\'\
        , authority   varchar(1000) not null default \'[]\'\
        )ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;';
      pool.query(query,function(err, result){
        cb(err, result);
      });
    }],
    create_map:['drop_map', function(cb, result){
      var query = 'CREATE TABLE tb_map(\
            roleid      bigint unsigned NOT NULL\
          , adminid     bigint unsigned NOT NULL\
        )ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;';
      pool.query(query,function(err, result){
        cb(err, result);
      });
    }],
    create_admin:['drop_admin', function(cb, result){
      var query = 'CREATE TABLE tb_admin(\
          admin_id    bigint unsigned PRIMARY KEY AUTO_INCREMENT\
        , username    varchar(50)     NOT NULL DEFAULT \'\' UNIQUE\
        , realname    varchar(50)     NOT NULL\
        , password    varchar(80)     NOT NULL\
        , disabled    tinyint         NOT NULL DEFAULT 0\
        , adminlevel  TINYINT unsigned NOT NULL DEFAULT 1\
        , authority   varchar(1000)   NOT NULL default \'[]\'\
        , description varchar(200)    NOT NULL DEFAULT \'\'\
        )AUTO_INCREMENT=30001 ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;';
      pool.query(query,function(err, result){
        cb(err, result);
      });
    }],
    i_auth:['create_auth',function(cb, result){
      pool.query('INSERT INTO tb_authority(auth_id,name,code,description) values(1,"test_auth_1","P_1","test"),(2,"test_auth_2","P_2","test")',function(err, result){
        cb(err, result);
      });
    }],
    i_role:['create_role',function(cb, result){
      pool.query('INSERT INTO tb_role(role_id,name,description,authority) values(1,"test_role_1","test_role_1",?)',[JSON.stringify(['P_1'])],function(err, result){
        cb(err, result);
      });
    }],
    i_admin:['create_admin',function(cb, result){
      pool.query('INSERT INTO `tb_admin` (`admin_id`, `username`, `realname`, `password`, `disabled`, `adminlevel`, `authority`, `description`)VALUES(30001, "test_admin_1", "test_admin_1", "password", 0, 1, ?, ""),(30002, "test_admin_2", "test_admin_2", "password", 0, 0, ?, "");',[JSON.stringify(['P_2']),JSON.stringify([])],function(err, result){
        cb(err, result);
      });
    }],
    i_map:['create_map',function(cb, result){
      pool.query('INSERT INTO `tb_map` (`roleid`, `adminid`)VALUES(1,30001);',function(err, result){
        cb(err, result);
      });
    }]
  },cb);
}

function initServer(app){
  var app = express();
  app.use(session({ secret: 'secret', cookie: { maxAge: 60000 }}))
  authority.configure({mysql:dbinfo});
  app.use(authority.authMiddleWare);
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }))
  app.post('/signin',function(req, res){
    req.session.uid = req.body.uid;
    req.session.user_auth = null;
    if(req.session.uid == 30002)
      req.session.admin_level = 0;
    return res.json({success:1});
  });
  app.post('/signout',function(req, res){
    req.session.uid = null;
    return res.json({success:1});
  });
  app.post('/check',function(req, res){
    return res.json({result:req.check(req.body.permission)});
  });
  app.use(function(err, req, res){
    return res.status(500).end(err);
  });
  return app;
}
