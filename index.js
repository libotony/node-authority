'use strict';
var mysql = require('mysql');
var async = require('async');
var debug = require('debug')('authority');
var ownOptions = {};
var authMap = {};
var connection = null;

/**
 * @see       权限模块配置
 * @author    Tony
 * @version   1.0.0
 * @param     options 配置Object,目前仅需要mysql配置
 */
function configure (options){
  options = options || {};
  if(!options.hasOwnProperty('mysql'))
    throw new Error('You must specify mysql options');
  if(!options.mysql.hasOwnProperty('database'))
    throw new Error('You must specify mysql database');

  ownOptions.mysql = {
    host      : options.mysql.host || 'localhost',
    port      : options.mysql.port || 3306,
    user      : options.mysql.user || 'root',
    password  : options.mysql.password || '',
    database  : options.mysql.database
  };

  connection = mysql.createConnection(ownOptions.mysql);
};

/**
 * @see       权限检查功能，要挂在req和res.locals下，bind(req)
 * @author    Tony
 * @version   1.0.0
 * @param     permission 需检验的权限名称
 * @returns   Boolean 是否拥有指定的权限
 */
function check(permission){
  // admin_level=0为超级管理员
  if(this.session.hasOwnProperty('admin_level')&&(this.session.admin_level == 0)){
    return true;
  }
  // 不存在权限时直接返回false
  if(!authMap.hasOwnProperty(permission))
    return false;
  if(this.session.user_auth.indexOf(authMap[permission].code) > -1)
    return true;
  else
    return false;
}

/**
 * @see       权限模块中间件，作用是加载所有权限，以及加载用户的所有权限
 * @author    Tony
 * @version   1.0.0
 */
function authMiddleWare(req, res, next){
  if(!req.hasOwnProperty('session'))
    throw new Error('You must use the middleware after hang session parser');

  if(!connection)
    connection = mysql.createConnection(ownOptions.mysql);
  async.auto({
    auth_map : function(cb){

      //查询出所有权限名称并freeze authMap
      if(Object.isFrozen(authMap))
        return cb()
      authMap = {};
      connection.query('select * from tb_authority',function(err, result){
        if(err){
          return cb(err);
        }
        for(var i in result){
          authMap[result[i]['name']] = {
            code : result[i]['code'],
            id : result[i]['auth_id']
          }
        }
        Object.freeze(authMap);
        return cb();
      });

    },
    s_auth : function(cb){

      // 查询用户权限
      if(!req.session.uid){
        req.session.user_auth = [];
        return cb();
      }
      if(req.session.user_auth)
        return cb();
      connection.query('select a.authority as userAuth,c.authority as roleAuth from tb_admin a left join tb_map b on a.admin_id = b.adminid left join tb_role c on b.roleid = c.role_id where a.admin_id = ?;',[req.session.uid],function(err, results){
        if(err)
          return cb(err);
        req.session.user_auth = [];
        if(results.length){
          //用户自身权限
          if(results[0].userAuth){
            try{
              req.session.user_auth = req.session.user_auth.concat(JSON.parse(results[0].userAuth));
            }catch(e){
              debug('auth middleware parse array error',results[0].userAuth,e);
            }
          }
          for(var i in results){
            //用户角色权限
            if(results[i].roleAuth){
              try{
                req.session.user_auth = req.session.user_auth.concat(JSON.parse(results[i].roleAuth));
              }catch(e){
                debug('auth middleware parse array error',results[i].roleAuth,e);
              }
            }
          }
        }
        return cb();
      });

    }
  },function(err, results){

    if(err){
      return next(err);
    }else {
      req.check = check.bind(req);
      res.locals.check = check.bind(req);
      return next();
    }

  });
};

module.exports = {
  configure : configure,
  authMiddleWare : authMiddleWare
};
