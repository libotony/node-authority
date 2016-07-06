## 权限控制模块
### 要求
+ 用户id需要存储在req.session.uid中。
+ 数据库使用mysql
+ 数据库中需要有四个表tb_authority、tb_role、tb_map、tb_admin

### 数据库表说明
表字段可以自由扩展，如下列出的字段不可更改

``` SQL
CREATE TABLE tb_authority(
  auth_id     bigint unsigned PRIMARY KEY AUTO_INCREMENT 	  #id，主键，自增
, name        varchar(40) not null unique                     #权限名
, code        varchar(40) not null unique                     #权限代码
, description varchar(80) not null default ''                 #描述
)ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

CREATE TABLE tb_role(
  role_id     bigint unsigned PRIMARY KEY AUTO_INCREMENT 	  #id，主键，自增
, name        varchar(40) not null unique                     #角色名
, description varchar(80) not null default ''                 #描述
, authority   varchar(1000) not null default '[]'             #类别权限 数组的json字符串
)ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

CREATE TABLE tb_map(                                          #管理员-权限组关系表
  roleid      bigint unsigned NOT NULL                        #tb_role name
, adminid     bigint unsigned NOT NULL                        #tb_admin id
)ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

CREATE TABLE tb_admin(                                        #管理表
  admin_id    bigint unsigned PRIMARY KEY AUTO_INCREMENT  	  #id,主键,自增
, username    varchar(50)     NOT NULL DEFAULT '' UNIQUE      #adminname
, realname    varchar(50)     NOT NULL                        #姓名，必填
, password    varchar(80)     NOT NULL                        #登录密码，必填
, disabled    tinyint         NOT NULL DEFAULT 0              #是否停封，默认否
, adminlevel  TINYINT unsigned NOT NULL DEFAULT 1             #账户等级0,1,2,3,...
, authority   varchar(1000)   NOT NULL default '[]'           #类别权限 数组的json字符串
, description varchar(200)    NOT NULL DEFAULT ''             #描述
)AUTO_INCREMENT=30001 ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
```
### 安装
``` bash
npm install node-authroity --save
```
或者在package.json中加入如下字段

``` json
"node-authority": "^0.1.0"
```
### 初始化

``` javascript
var express = require('express');
var cookieParser = require('cookie-parser');
var redisSession = require('node-redis-session');

var app = express();

//cookie and session parser
app.use(cookieParser());
app.use(redisSession());

// hang middleware after session middleware
var authority = require('node-authority');
// configure authority
var dbinfo = {
	'host' : 'localhost',
	'port' : 3306,
	'user' : 'user',
	'password' : 'password',
	'database' : 'database'
};
authority.configure({mysql:dbinfo});
app.use(authority.authMiddleWare);

app.listen(3000);
```
### 权限举例说明
`tb_authority.name`为人类易读的权限名称，一般会作为检查权限时传入的参数，`tb_authority.code`为程序储存时的权限名称。`tb_admin.authority`和`tb_role.authority`为权限存储字段，存储方式为`JSON.stringify()`过后的数组。
### API列表
* [`check`](#checkpermission)

#### check(permission)

``` javascript
/**
 * 检查当前用户是否拥有当前指定权限（传入参数）
 * 挂载到res.loacls下方便在页面渲染时使用
 */
req.check('Home.View');
res.locals.check('Home.View');
```
