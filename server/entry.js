const koa = require('koa');
const session = require('koa-session');
const router = require('koa-router')();
const bodyParser = require('koa-bodyparser');
const json = require('koa-json');
const fs = require("fs");
const cors = require('koa-cors');
import {sequelize} from './sql.js'
const app = new koa();
app.use(bodyParser());
const WebSocketServer = require('ws').Server;
app.use(async(ctx, next) => {
    console.log(`Process ${ctx.request.method} ${ctx.request.url}...`);
    await next();
});

app.use(cors());

app.keys = ['123456!@#$%^QWER'];
 
const CONFIG = {
  key: 'koa.sess', /** (string) cookie key (default is koa.sess) */
  /** (number || 'session') maxAge in ms (default is 1 days) */
  /** 'session' will result in a cookie that expires when session/browser is closed */
  /** Warning: If a session cookie is stolen, this cookie will never expire */
  maxAge: 86400000,
  autoCommit: true, /** (boolean) automatically commit headers (default true) */
  overwrite: true, /** (boolean) can overwrite or not (default true) */
  httpOnly: true, /** (boolean) httpOnly or not (default true) */
  signed: true, /** (boolean) signed or not (default true) */
  rolling: false, /** (boolean) Force a session identifier cookie to be set on every response. The expiration is reset to the original maxAge, resetting the expiration countdown. (default is false) */
  renew: false, /** (boolean) renew session when session is nearly expired, so we can always keep user logged in. (default is false)*/
  secure: false, /** (boolean) secure cookie*/
  sameSite: null, /** (string) session cookie sameSite options (default null, don't set it) */
};
 
app.use(session(CONFIG, app));

//scan controlloer js
var files = fs.readdirSync(__dirname + '/controllers');
var js_files = files.filter((f) => {
    return f.endsWith('.js');
});


for (var f of js_files) {
    console.log(`process controller: ${f}...`);
    let mapping = require(__dirname + '/controllers/' + f);
    for (var url in mapping) {
        if (url.startsWith('GET ')) {
            // 如果url类似"GET xxx":
            var path = url.substring(4);
            router.get(path, mapping[url]);
            console.log(`register URL mapping: GET ${path}`);
        } else if (url.startsWith('POST ')) {
            // 如果url类似"POST xxx":
            var path = url.substring(5);
            router.post(path, mapping[url]);
            console.log(`register URL mapping: POST ${path}`);
        } else if (url.startsWith('PUT ')) {
            // 如果url类似"PUT xxx":
            var path = url.substring(4);
            router.put(path, mapping[url]);
            console.log(`register URL mapping: PUT ${path}`);
        } else if (url.startsWith('DELETE ')) {
            // 如果url类似"DELETE xxx":
            var path = url.substring(7);
            router.delete(path, mapping[url]);
            console.log(`register URL mapping: DELETE ${path}`);
        } else {
            // 无效的URL:
            console.log(`invalid URL: ${url}`);
        }
    }
}

var httpPort = 7102;
app.use(json());
app.use(router.routes());
app.listen(httpPort);
console.log('apiServer started at port %s...', httpPort);


var wsPort = 8181;
//websocket TODO 目前看没什么用

let wss = new WebSocketServer({ port: wsPort });
//连接用户
let clients = {};

wss.on('connection', function (ws,req) {
    console.log('client connected');
    console.log("req url[%s]", req.url);
    let user_id=req.url.substr(10);
    console.log("管理员[%s]上线", user_id);
    clients[user_id]= {
        "user_id":user_id,
        "client":ws
    };
    console.log("clients:", clients);
    ws.on('message', function (message) {
        console.log("receive wss msg[%s]", message);
        if(clients.hasOwnProperty('admin')){
            var cli = clients.admin.client;
            var msgJson = JSON.parse(message);
            if(msgJson && msgJson.msg){
                if(msgJson.msg == "hello"){
                    msgJson.resp = "world";
                    cli.send(JSON.stringify(msgJson));
                }
            }else{
                cli.send(message);
            }
        }else{
            console.log('管理员未上线')
        }
        ws.on("error", function (code, reason) {
            console.log("管理员[%s]异常关闭, reason[%s]", user_id, reason);
            delete clients[user_id];
        });
        ws.on("close", function (code, reason) {
            console.log("管理员[%s]关闭连接", user_id);
            delete clients[user_id];
        });
        
      
    })
})
console.log('apiServer websocket started at port %s...', wsPort);

