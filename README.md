# weixinqiang
微信墙
这是一个简易的微信墙，其使用nodejs搭建。
在部署这个应用的时候需要注意以下几点：
1、注意在getUserInfo文件中修改appID和appSecret;
2、注意修改index中的token，这里应该是你在微信中预留的token；
3、注意，对于非文本信息，微信墙显示的是图片的链接、mediaID等；
4、为了分步骤显示功能（老师的要求），分为两个服务器——一个80端口的应用服务器、一个9999端口的微信交互服务器，这两者可以用一个，即与微信交互也使用80端口的服务器，这就需要在微信开发者平台将预留URL修改为80端口；
5、如果用同一个服务器与用户和微信交互则不存在盗链问题，图片等引用微信的信息可以正常显示；
6、为了显示emoji表情等需要自己完善。
