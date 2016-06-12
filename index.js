//引入express必要模块
var express = require("express"), path = require("path"), favicon = require('serve-favicon');
var app = express(), server = require("http").createServer(app);//构建http服务器
//引入与微信服务器交互的必要模块，引入文件系统
var qs = require("qs"), request = require("request"), fs = require("fs"), http = require("http");
//引入events模块，构建事件监听者
var eventEmitter = require("events").EventEmitter, P2P = new eventEmitter();
//引入获取微信Token和用户信息的模块
var getUserInfo = require("./getUserInfo"), token = your_token;

//设置ejs引擎
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
//设置favicon
app.use(favicon(__dirname + '/public/favicon.ico'));
//设置client为静态目录
app.use(express.static(path.join(__dirname, "client")));

//让请求转到weixin.ejs
app.get("/", function(req, res){
	res.render("weixin");
});

app.get("/weixin", function(req, res){
	res.render("weixin");
});

//监听80端口
server.listen(80, function(req, res){
	console.log("weixinqiang running at port 80.");
});

var serverWX = http.createServer(function(req, res){
	var query = require("url").parse(req.url).query;
	var params = qs.parse(query);
	
	//验证token是否与预留的相同
	if(!checkSig(params, token)){
		res.end("Signature failed.");
		return;
	}
	if(req.method == "GET"){
		res.end(params.echostr);
	}else{
		var postdata = "";
		req.addListener("data", function(postchunk){
			postdata += postchunk;
		});
		req.addListener("end", function(){
			var parseStr = require("xml2js").parseString;
			parseStr(postdata, function(err ,result){
				if(err){
					console.log(err);
					return;
				}
				
				//获取用户基本信息
				getUserInfo(result.xml.FromUserName[0]).then(function(userInfo){
					userMsg = {
						user: userInfo.nickname,
						img: userInfo.headimgurl,
						msg: showText(result),
						time: dateff(new Date())
					}
					P2P.emit("wxMsg", userMsg);//通过P2P这个事件监听器将信息传递给socket.io
					var jieguo = replyText(result);
					res.end(jieguo);//回复微信用户
				});
			});
		});
	}
});
//微信预留的端口为9999
serverWX.listen(9999, function(req, res){
	console.log("ServerWX running at port 9999.");
});

var io = require("socket.io").listen(server);//socket监听server
var messages = [];
//初始化信息
messages.push({
	user: "系统",
	img: "/weblogo.png",
	msg: "欢迎加入微信墙！",
	time: dateff(new Date())
});

io.sockets.on("connection", function(socket){
	//当客户端发送getAllMsgs时，作出相应反馈
    socket.on("getAllMsgs",function(){
        socket.emit("allMsgs", messages);
    });

	//当客户端发送信息时，想判断信息是否为空，再广播
    socket.on("sendMsg",function(message){
		if(message.length == 0){
			return;
		}
		msg = {
			user: "游客",
			img: "/youke.png",
			msg: message,
			time: dateff(new Date())
		}
        messages.push(msg);
        io.sockets.emit("newMsg", msg);
    });
	
	//这里需要注意，每当一个客户端建立连接，都会触发一次本函数。
	//所以不能直接用eventEmitter监听事件，需要判断监听者个数，如果超过一个则需要将多余的删除
	var listener = function(msg){
		messages.push(msg);
        io.sockets.emit("newMsg", msg);
	}
	var eventListeners = require("events").EventEmitter.listenerCount(P2P,"wxMsg");
	if(eventListeners > 0){
		P2P.removeAllListeners("wxMsg");
		P2P.on("wxMsg", listener);
	}else{
		P2P.on("wxMsg", listener);
	}
});

function checkSig(params, token){
	var key = [token, params.timestamp, params.nonce].sort().join("");
	var sha1 = require("crypto").createHash("sha1");
	sha1.update(key);
	return sha1.digest("hex") == params.signature;
}

//定义日期格式化函数
function dateff(date){
	var mm = date.getMonth() + 1;
	var datetime = date.getFullYear()+"-"+dble(mm)+"-"+dble(date.getDate())+"  "+dble(date.getHours())+":"+dble(date.getMinutes())+":"+dble(date.getSeconds());
	return datetime;
}

function dble(time){
	lengthOfTime = time.toString().length;
	if(lengthOfTime == 1){
		return "0"+time.toString();
	}else{
		return time.toString();
	}
}

//定义识别微信信息类型并返回有用信息的函数
function showText(msg){
	var msgtype = msg.xml.MsgType[0];
	switch(msgtype){
		case "text":
			feedback = msg.xml.Content[0];
			break;
		case "image":
			feedback = msg.xml.PicUrl[0];
			break;
		case "shortvideo":
			feedback = msg.xml.MediaId[0];
			break;
		case "video":
			feedback = msg.xml.MediaId[0];
			break;
		case "voice":
			feedback = msg.xml.MediaId[0];
			break;
		case "location":
			feedback = msg.xml.Label[0];
			break;
		case "link":
			feedback = msg.xml.Title[0];
			break;
		default:
			feedback = "未知类型消息"
	}
	return feedback;
}

//定义回复微信用户的函数
function replyText(msg){
	var msgtype = msg.xml.MsgType[0];
	switch(msgtype){
		case "text":
			feedback = "文本消息";
			break;
		case "image":
			feedback = "图片消息";
			break;
		case "shortvideo":
			feedback = "小视频";
			break;
		case "video":
			feedback = "视频消息";
			break;
		case "voice":
			feedback = "语音消息";
			break;
		case "location":
			feedback = "位置消息";
			break;
		case "link":
			feedback = "链接消息";
			break;
		default:
			feedback = "未知类型消息"
	}
	
	var tmpl = require("tmpl");
	var replyTmpl = "<xml>" +
		"<ToUserName><![CDATA[{toUser}]]></ToUserName>" +
		"<FromUserName><![CDATA[{fromUser}]]></FromUserName>" +
		"<CreateTime><![CDATA[{time}]]></CreateTime>" +
		"<MsgType><![CDATA[{type}]]></MsgType>" +
		"<Content><![CDATA[{content}]]></Content>" +
		"</xml>";

	return tmpl(replyTmpl, {
		toUser: msg.xml.FromUserName[0],
		fromUser: msg.xml.ToUserName[0],
		type: "text",
		time: Date.now(),
		content: feedback
	});
}