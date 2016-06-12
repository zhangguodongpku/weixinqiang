//引入相应模块
var request = require("request"), fs = require("fs"), later = require('later');
//定义相应信息，appid与APPsecret从微信开放平台申请
var appID = your_appid, appSecret = your_appsecret;
var turl = "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=" + appID + "&secret=" + appSecret;

//引入later这个定时模块，每隔一小时运行一次
var schedule = later.parse.recur().every(1).hour();

getToken();//期初先运行一次

later.setInterval(getToken, schedule);

//定义获取token的函数，并保存至tmpToken.dat文件
function getToken(){
	request(turl, function(err, res, data){
		var result = JSON.parse(data);
		fs.writeFileSync('tmpToken.dat', JSON.stringify(result));
	});
}

//定义获取用户信息的函数
function getUserInfo(openID){
		var tmpToken = JSON.parse(fs.readFileSync('tmpToken.dat'));
		var uurl = "https://api.weixin.qq.com/cgi-bin/user/info?access_token=" + tmpToken.access_token + "&openid=" + openID + "&lang=zh_CN";
		return new Promise(function(resolve, reject){
			request(uurl, function(err, res, data){
				resolve(JSON.parse(data));
			});
		});
}
//输出此函数以供主程序使用
module.exports = getUserInfo;