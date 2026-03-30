import service from '@/api/request'
import CryptoJS from 'crypto-js';
import {JSEncrypt2} from "./rsa公钥解密";

//在这里配置信息  飞鸟快验后台 应用管理->应用编辑->安全设置->复制App设置   复制出的json, 粘贴到下边就可以了 会自动判断加密方式,
/*const web地址配置 = {
    "AppWeb": "http://127.0.0.1:18888/Api?AppId=10003",
    "CryptoKeyAes": "BDVkB7TOfCZQB9MXCloOyUGf",
    "CryptoType": 2
}*/

//在这里配置信息

const web地址配置 = {
    "AppWeb": "http://45.152.65.62:18888/Api?AppId=10013",
    "CryptoKeyPublic": "-----BEGIN PUBLIC KEY-----MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQClty1qidHsG5ZOux8R12NI05863keeFD+IFUex2goMwsOdGTxdxZ1XM8yTjhFGZ9KjhedTKJTv0CjvT0kfRsLjPjxw05yuo7/nZDKrSqiSZCsIRkeiQdOsNHhIeOM5yFXANmgI0btRxmH0F7eKP30bGVPKuKPqEmHt253WVLR1yQIDAQAB-----END PUBLIC KEY-----",
    "CryptoType": 3
}


export const 取错误信息 = () => {
    return localStorage.getItem("err")
}
export const 取错误信息整数代码 = () => {
    return localStorage.getItem("errCode")
}
//从1970年开始的毫秒数然后截取10位变成 从1970年开始的秒数
export const 时间_取现行时间戳 = () => {
    let outcome = Math.round(new Date().getTime() / 1000).toString();
    return Number(outcome)
}

/**
 * //加入公共参数,进行加密发包,收包解密 返回明文
 * @param data  接口明文数据
 * @param RSA   是否强制rsa加密
 * @returns {Promise<axios.AxiosResponse<any>>}
 * @constructor
 */
const SendPost = (data, RSA = false) => {
    //加入公共参数,status 和现行时间戳
    let Status = 10000;
    let Time = 时间_取现行时间戳(); //发包时间
    let postData = data
    postData.Time = Time
    postData.Status = Status


    if (localStorage.getItem("集_验证码值") !== "" && localStorage.getItem("集_验证码ID") !== "") {
        // 验证码id可能会缓存.所以必须是有验证码置时才携带 ,并清除缓存
        let Captcha = {}
        Captcha.Id = localStorage.getItem("集_验证码ID")
        Captcha.Type = parseInt(localStorage.getItem("集_验证码类型"))
        Captcha.Value = localStorage.getItem("集_验证码值")
        postData.Captcha = Captcha
        localStorage.setItem("集_验证码ID", "")
        localStorage.setItem("集_验证码类型", "0")
        localStorage.setItem("集_验证码值", "")
    }

    //判断加密方式 对明文处理
    if (web地址配置.CryptoType === 1) {
        //明文不处理
    }
    if (web地址配置.CryptoType === 2 || (web地址配置.CryptoType === 3 && !RSA)) { //加密类型为2 或 加密类型为3但不强制Rsa加密的
        let 密文对象 = {a: "", b: ""}
        //Aes加密并签名
        //如果加密类型为2  就是用配置的密钥,如果加密类型为3 就是用GetToken接口返回的密钥
        let aesKey = web地址配置.CryptoType === 2 ? web地址配置.CryptoKeyAes : localStorage.getItem("CryptoKeyAes")

        密文对象.a = Aes_CBC_192加密(JSON.stringify(data), aesKey)
        密文对象.b = CryptoJS.MD5(密文对象.a + aesKey).toString();  //b为签名, md5(密文对象.a + aes密钥)
        console.log(密文对象)
        data = 密文对象
    }

    if (web地址配置.CryptoType === 3 && RSA) { //加密类型为3  强制Rsa加密的
        let Rsa密文对象 = {a: "", b: ""}
        let tempAesKey = getRandomString(24) //临时AES密钥 随机24位字母数字
        Rsa密文对象.a = Aes_CBC_192加密(JSON.stringify(data), tempAesKey) //a值为 随机aes密钥加密后字节数组,再转为base64编码文本

        var verify = new JSEncrypt2();         //发包 为公钥加密(临时Aes密钥)
        verify.setPublicKey(web地址配置.CryptoKeyPublic);
        Rsa密文对象.b = verify.encrypt(tempAesKey); //b值为 RSA公钥加密(临时AES密钥)
        console.log(Rsa密文对象)
        data = Rsa密文对象
    }


    //发送post信息===========================
    let ret = service({
        url: web地址配置.AppWeb,
        method: 'post',
        data: data
    })
    //密文解密再 request中间件 拦截响应内   http response 拦截响应   可以去查看

    return ret
}

function getRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
    }
    return result;
}

//返回的是base64编码后的密文
function Aes_CBC_192加密(明文, 密钥) {
    let key = CryptoJS.enc.Utf8.parse(密钥); // 将密钥转换为字节数组
    let iv = CryptoJS.lib.WordArray.create(16); // 创建一个长度为16的字节数组，初始值为0
    let srcs = CryptoJS.enc.Utf8.parse(明文);
    //使用 cbc192 方式 加密
    let encrypted = CryptoJS.AES.encrypt(srcs, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
        keySize: 192 / 8
    });
    return encrypted.ciphertext.toString(CryptoJS.enc.Base64);  //aes加密结果,进行base64编码, 赋给a值
}


export function Aes_CBC_192解密(密文, 密钥) {

    let key = CryptoJS.enc.Utf8.parse(密钥); // 将密钥转换为字节数组
    let iv = CryptoJS.lib.WordArray.create(16); // 创建一个长度为16的字节数组，初始值为0
    let 解密的数据 = CryptoJS.AES.decrypt(密文, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
        keySize: 192 / 8
    }).toString(CryptoJS.enc.Utf8);
    return 解密的数据
}


export function Aes解密并签名(密文对象) {
    //Aes解密并验证签名
    //如果加密类型为2  就是用配置的密钥,如果加密类型为3 就是用GetToken接口返回的密钥
    let aesKey = web地址配置.CryptoType === 2 ? web地址配置.CryptoKeyAes : localStorage.getItem("CryptoKeyAes")

    let key = CryptoJS.enc.Utf8.parse(aesKey); // 将密钥转换为字节数组
    let iv = CryptoJS.lib.WordArray.create(16); // 创建一个长度为16的字节数组，初始值为0
    // 验证签名
    let 签名 = CryptoJS.MD5(密文对象.a + aesKey).toString();
    console.log("签名")
    console.log(签名.toUpperCase())

    if (签名.toUpperCase() !== 密文对象.b) { //返回的签名是大写 所以要转大写
        console.log("md5签名验证失败");
        console.log("签名信息b:" + 密文对象.b);
        console.log("签名计算b:" + 签名.toUpperCase());
        console.log("签名计算参数:" + 密文对象.a + aesKey);
        localStorage.setItem("集_错误信息", "md5签名验证失败")
        return {};
    }

    // 解密
    let 解密的数据 = CryptoJS.AES.decrypt(密文对象.a, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
        keySize: 192 / 8
    }).toString(CryptoJS.enc.Utf8);

    // 转换为对象
    let 解密后的对象 = JSON.parse(解密的数据);

    console.log(解密后的对象);
    return 解密后的对象
}

// json字符串转hex
export const stringtoHex = function (str) {
    var val = "";
    for (var i = 0; i < str.length; i++) {
        if (val == "")
            val = str.charCodeAt(i).toString(16);
        else
            val += str.charCodeAt(i).toString(16);
    }
    val += "0a"
    return val
}


export function Rsa公钥解密(base64密文) {

    var RSA公钥解密对象 = new JSEncrypt2();         //发包 为公钥加密(临时Aes密钥)
    RSA公钥解密对象.setPublicKey(web地址配置.CryptoKeyPublic);

    let tempAesKey = RSA公钥解密对象.decrypt(base64密文);
    console.log("tempAesKey")
    console.log(base64密文)
    console.log(tempAesKey)
    //临时AES密钥 随机24位   !!注意,不一定是字符串,而是24位字节数组, 所以打印可能是乱码,解密只要检测是否有值就可以了,解密失败会返回空的
    return tempAesKey; // 将密钥转换为字节数组

}

//取Token haitao123456
//初始化后 首先调用,获取token标志,后续所有请求都需要携带
//return
// {
//         "Data": {
//             "Token": "FOZBK1MCMLMB2ZKJKCSGSS3NSQWEDYCY",
//             "CryptoKeyAes": "",
//             "IP": "127.0.0.1"
//         },
//         "Time": 1699359289,
//         "Status": 10000,,
//         "Msg": ""
//     }
export const F_取Token = () => {
    localStorage.setItem("kyToken", "") //先清除本地的Token
    let data = {
        "Api": "GetToken",
    }

    return SendPost(data, true)
}

/* 登录通用    详细信息官网查询
UserOrKa|string| 用户账号,或卡号
PassWord|string| 登陆密码  卡号模式空即可
Key|string| 绑定信息,验证绑定,如果服务器绑定为空, 绑定该值
Tab|string| 会显示在在线列表动态标记内,可以显示用户简单信息,可随时修改
AppVer|string| 当前软件版本,服务器会判断是否为可用版本,非可用版本禁止登录
return
{
  "Data": {
    "Key": "aaaaaa",
    "LoginIp": "127.0.0.1",
    "LoginTime": 1688007304,
    "OutUser": 0,
    "RegisterTime": 1683349292,
    "UserClassMark": 2,
    "UserClassName": "Vip2",
    "VipNumber": 115.78,
    "VipTime": 1715438220,
    "NewAppUser":false
  },
  "Time": 1688007304,
 "Status": 10000,,
  "Msg": ""
}
*/
export const F_登录通用 = (UserOrKa = '', PassWord = '', Key = '', Tab = '', AppVer = '') => {
    let data = {
        "Api": "UserLogin",
        "UserOrKa": UserOrKa,
        "PassWord": PassWord,
        "Key": Key,
        "Tab": Tab,
        "AppVer": AppVer,
    }
    return SendPost(data, true)
}

/* 取用户IP   详细信息官网查询
return
{
  "Data": {
    "IP": "127.0.0.1"
  },
  "Time": 1688118575,
  "Status": 10000,,
  "Msg": ""
}
*/
export const F_取用户IP = () => {
    let data = {
        "Api": "GetUserIP",
    }
    return SendPost(data)
}

/* 用户减少余额   详细信息官网查询
Money|float64| 减少值,负数无效
AgentMoney|float64| 分成金额,不能超过,减少数值,
return
{
  "Data": {
    "Money": 0.92
  },
  "Time": 1688118839,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_用户减少余额 = (Money = 0, AgentMoney = 0) => {
    let data = {
        "Api": "UserReduceMoney",
        "Money": Money,
        "AgentMoney": AgentMoney,
    }
    return SendPost(data, true)
}

/* 用户减少积分   详细信息官网查询
VipNumber|float64| 减少值,负数无效
return
{
  "Data": {
    "VipNumber": 0.92
  },
  "Time": 1688118839,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_用户减少积分 = (VipNumber = 0) => {
    let data = {
        "Api": "UserReduceVipNumber",
        "VipNumber": VipNumber,
    }
    return SendPost(data, true)
}
/* 用户减少点数   详细信息官网查询
VipTime|int| 减少值,负数无效
return
{
  "Data": {
    "VipTime": 889
  },
  "Time": 1688118839,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_用户减少点数 = (VipTime = 0) => {
    let data = {
        "Api": "UserReduceVipTime",
        "VipTime": VipTime,
    }
    return SendPost(data, true)
}

/* 取服务器连接状态   详细信息官网查询
return
{
  "Time": 1688118839,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_取服务器连接状态 = () => {
    let data = {
        "Api": "IsServerLink",
    }
    return SendPost(data)
}
/* 取登录状态   详细信息官网查询
return
{
  "Time": 1688118839,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_取登录状态 = () => {
    let data = {
        "Api": "IsLogin",
    }
    return SendPost(data)
}

/* 取应用Vip数据   详细信息官网查询
return
{
  "Data": {
    "VipData": "这里的数据,只有登录成功并且账号会员不过期才会传输出去的数据",
    "VipData2": "这里的数据,只有登录成功并且账号会员不过期才会传输出去的数据"
  },
  "Time": 1683463084,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_取应用Vip数据 = () => {
    let data = {
        "Api": "GetVipData",
    }
    return SendPost(data, true)
}
/* 取应用公告   详细信息官网查询
return
{
  "Data": {
    "AppGongGao": "我是一条公告"
  },
  "Time": 1688118839,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_取应用公告 = () => {
    let data = {
        "Api": "GetAppGongGao",
    }
    return SendPost(data)
}


/* 取专属变量   详细信息官网查询
Name|string|变量名称
return
{
  "Data": {
    "紧急公告": "我是一条紧急公告"
  },
  "Time": 1688118839,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_取专属变量 = (Name = '') => {
    let data = {
        "Api": "GetAppPublicData",
        "Name": Name,
    }
    return SendPost(data)
}

/* 取公共变量   详细信息官网查询
Name|string|变量名称
return
{
  "Data": {
    "系统地址": "我是一条系统地址"
  },
  "Time": 1688118839,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_取公共变量 = (Name = '') => {
    let data = {
        "Api": "GetPublicData",
        "Name": Name,
    }
    return SendPost(data)
}

/* 取最新版本检测   详细信息官网查询
Version|string|大版本号.小版本号.编译版本号   '有可能还没登录就检测,所以还是单独传一下版本号,不使用登录时的版本号了
IsVersionAll|string|是否检测编译版本号,建议自动检测值为假,用户主动检测值为真
return
{
  "Data": {
    "IsUpdate": true,
    "NewVersion": "1.1.5",
    "Version": 1.1
  },
  "Time": 1688128499,
  "Status": 72373,
  "Msg": ""
}
*/
export const F_取最新版本检测 = (Version = '', IsVersionAll = '') => {
    let data = {
        "Api": "GetAppVersion",
        "Version": Version,
        "IsVersionAll": IsVersionAll,
    }
    return SendPost(data)
}

/* 取新版本下载地址   详细信息官网查询
return
{
  "Data": {
    "AppUpDataJson": "{\n    \"htmlurl\": \"www.baidu.com(自动下载失败打开指定网址,手动更新地址\",\n    \"data\": [{\n        \"WenJianMin\": \"文件名.exe\",\n        \"md5\": \"e10adc3949ba59abbe56e057f20f883e(小写文件md5可选,有就校验,空就只校验文件名)\",\n        \"Lujing\": \"/(下载本地相对路径)\",\n        \"size\": \"12345\",\n        \"url\": \"https://www.baidu.com/文件名.exe(下载路径)\",\n        \"YunXing\": \"1(值为更新完成后会运行这个文件,只能有一个文件值为1)\"\n\n    }, {\n        \"WenJianMin\": \"文件名.dll\",\n        \"md5\": \"e10adc3949ba59abbe56e057f20f883e(小写文件md5可选,有就校验,没有就文件名校验)\",\n        \"Lujing\": \"/(下载本地相对路径)\",\n        \"size\": \"12345\",\n        \"url\": \"https://www.baidu.com/文件名.dll(下载路径)\",\n        \"YunXing\": \"0\"\n    }]\n}"
  },
  "Time": 1688129941,
  "Status": 48837,
  "Msg": ""
}
*/
export const F_取新版本下载地址 = () => {
    let data = {
        "Api": "GetAppUpDataJson",
    }
    return SendPost(data)
}

/* 取应用主页Url   详细信息官网查询
return
{
  "Data": {
    "AppHomeUrl": "www.baidu.com"
  },
  "Time": 1688118839,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_取应用主页Url = () => {
    let data = {
        "Api": "GetAppHomeUrl",
    }
    return SendPost(data)
}

/* 置新绑定信息   详细信息官网查询
NewKey|string|新绑定信息
User|string| 可空,账号或卡号,仅用在未登录时想更换绑定
PassWord|string| 可空,密码如果是卡号就空即可,仅用在未登录时想更换绑定
return
{
  "Data": {
    "ReduceVipTime": 10
  },
  "Time": 1688118839,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_置新绑定信息 = (NewKey = '', User = '', PassWord = '') => {
    let data = {
        "Api": "SetAppUserKey",
        "NewKey": NewKey,
        "User": User,
        "PassWord": PassWord,
    }
    return SendPost(data)
}

/* 删除绑定信息   详细信息官网查询
User|string| 可空,账号或卡号,仅用在未登录时想更换绑定
PassWord|string| 可空,密码如果是卡号就空即可,仅用在未登录时想更换绑定
return
{
  "Data": {
    "ReduceVipTime": 10
  },
  "Time": 1688118839,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_删除绑定信息 = (User = '', PassWord = '') => {
    let data = {
        "Api": "DeleteAppUserKey",
        "User": User,
        "PassWord": PassWord,
    }
    return SendPost(data)
}
/* 置新用户消息   详细信息官网查询
MsgType|string|1 其他, 2 bug提交 , 3 投诉建议
Msg|string| 消息内容
return
{
  "Time": 1688118839,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_置新用户消息 = (MsgType = '', Msg = '') => {
    let data = {
        "Api": "SetNewUserMsg",
        "MsgType": MsgType,
        "Msg": Msg,
    }
    return SendPost(data)
}

/* 取验证码   详细信息官网查询
CaptchaType|int|验证码类型,默认 1 英数验证码
return
{
  "Data": {
    "CaptChaImg": "data:image/png;base64,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",
    "CaptchaId": "YJZAGQXsG3uHQ4ujuNac",
    "CaptchaType": 1
  },
  "Time": 1688135604,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_取验证码 = (CaptchaType = 0) => {
    let data = {
        "Api": "GetCaptcha",
        "CaptchaType": CaptchaType,
    }
    return SendPost(data)
}

/* 取短信验证码   详细信息官网查询
Phone|string|要发送短信的手机号
User|string|如果手机号为空 可以填写用户名,会向用户名的手机号发送, 找回密码时可以使用
return
{
  "Data": {
    "CaptchaId": "4T7fSxvHV75tfgg",
    "CaptchaType": 3
  },
  "Time": 1688135604,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_取短信验证码 = (Phone = '', User = '') => {
    let data = {
        "Api": "GetSMSCaptcha",
        "Phone": Phone,
        "User": User,
    }
    return SendPost(data)
}

/* 提交验证码   详细信息官网查询
写入缓存 下次请求自动携带
id|id string|验证码id 获取验证码时返回  行为直接就是行为平台id
Type|int|验证码类型  验证码类型 1英数验证码,2行为验证码,3短信验证码
Value|string|验证码值
return {}
*/
export const F_提交验证码 = (id = '', Type = 0, Value = '') => {
    if (id !== "") {
        localStorage.setItem("集_验证码ID", id)
    }
    if (Type > 0) {
        localStorage.setItem("集_验证码类型", Type)
    }
    if (Value !== "") {
        localStorage.setItem("集_验证码值", Value)
    }

    return {}
}

/* 取绑定信息   详细信息官网查询
return
{
  "Data": {
    "Key": "aaaaaa"
  },
  "Time": 1688135604,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_取绑定信息 = () => {
    let data = {
        "Api": "GetAppUserKey",
    }
    return SendPost(data)
}

/* 取用户是否存在   详细信息官网查询
User|string|判断是否存在的用户名或卡号
return
{
  "Data": {
    "IsUser": true
  },
  "Time": 1688135604,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_取用户是否存在 = (User = '') => {
    let data = {
        "Api": "GetIsUser",
        "User": User,
    }
    return SendPost(data)
}

/* 取软件用户信息   详细信息官网查询
return
{
  "Data": {
    "Id": 1,
    "Uid": 21,
    "Key": "aaaaaa",
    "MaxOnline": 1,
    "LoginIp": "127.0.0.1",
    "LoginTime": 1683349292,
    "RegisterTime": 1683349292,
    "Status": 1,
    "User": "aaaaaa",
    "UserClassId": 22,
    "UserClassMark": 2,
    "UserClassName": "Vip2",
    "UserClassWeight": 2,
    "VipNumber": 115.78,
    "VipTime": 1715438220
  },
  "Time": 1688135604,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_取软件用户信息 = () => {
    let data = {
        "Api": "GetAppUserInfo",
    }
    return SendPost(data)
}

/* 取用户基础信息   详细信息官网查询
return
{
  "Data": {
    "Id": 21,
    "Email": "1056795985@qq.com",
    "LoginAppid": 10001,
    "LoginIp": "127.0.0.1",
    "LoginTime": 1688435963,
    "Phone": "1388888888",
    "Qq": "1059795985",
    "RMB": 0.9,
    "RealNameAttestation": false,
    "RegisterIp": "113.235.144.55",
    "RegisterTime": 1519454315,
    "User": "aaaaaa"
  },
  "Time": 1688135604,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_取用户基础信息 = () => {
    let data = {
        "Api": "GetUserInfo",
    }
    return SendPost(data)
}
/* 置用户基础信息   详细信息官网查询
Email|string|邮箱
Phone|string|手机号
Qq|string|联系QQ
return
{
  "Data": {},
  "Time": 1688135604,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_置用户基础信息 = (Email = '', Phone = '', Qq = '') => {
    let data = {
        "Api": "SetUserQqEmailPhone",
        "Email": Email,
        "Phone": Phone,
        "Qq": Qq,
    }
    return SendPost(data)
}

/* 取应用基础信息   详细信息官网查询
return
{
  "Data": {
    "AppId": 10001,
    "AppType": 1,
    "AppName": "演示对接账号限时RSA混合通讯",
    "AppWeb": "www.baidu.com"
  },
  "Time": 1688118575,
  "Status": 72085,
  "Msg": ""
}
*/
export const F_取应用基础信息 = () => {
    let data = {
        "Api": "GetAppInfo"
    }
    return SendPost(data)
}
/* 用户注册   详细信息官网查询
User|string|要注册的用户名
PassWord|string|密码
Key|string|绑定信息
SuperPassWord|string|超级密码,或者可以扩展成密保问题之类的
Qq|string|联系QQ
Email|string|邮箱
Phone|string|手机号
return
{
  "Time": 1688135604,
  "Status": 10000,
  "Msg": "注册成功"
}
*/
export const F_用户注册 = (User = '', PassWord = '', Key = '', SuperPassWord = '', Qq = '', Email = '', Phone = '') => {
    let data = {
        "Api": "NewUserInfo",
        "User": User,
        "PassWord": PassWord,
        "Key": Key,
        "SuperPassWord": SuperPassWord,
        "Qq": Qq,
        "Email": Email,
        "Phone": Phone,
    }
    return SendPost(data)
}

/* 取系统时间戳   详细信息官网查询
return
{
  "Data": {
    "Time": 1684036534
  },
  "Time": 1688118575,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_取系统时间戳 = () => {
    let data = {
        "Api": "GetSystemTime",
    }
    return SendPost(data)
}

/* 取软件用户备注   详细信息官网查询
return
{
  "Data": {
    "Note": "#调试权限#"
  },
  "Time": 1688118575,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_取软件用户备注 = () => {
    let data = {
        "Api": "GetAppUserNote",
    }
    return SendPost(data)
}

/* 取会员到期时间戳或点数   详细信息官网查询
return
{
  "Data": {
    "VipTime": 1714919820
  },
  "Time": 1688118575,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_取会员到期时间戳或点数 = () => {
    let data = {
        "Api": "GetAppUserVipTime",
    }
    return SendPost(data)
}

/* 用户登录注销   详细信息官网查询
return
{
  "Time": 1688118575,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_用户登录注销 = () => {
    let data = {
        "Api": "LogOut",
    }
    return SendPost(data)
}

/* 用户登录注销_远程   详细信息官网查询
User|int| 用户名或卡号
PassWord|int| 密码,如果是卡号空即可
return
{
  "Time": 1688118575,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_用户登录注销_远程 = (User = 0, PassWord = 0) => {
    let data = {
        "Api": "RemoteLogOut",
        "User": User,
        "PassWord": PassWord,
    }
    return SendPost(data)
}
/* 心跳   详细信息官网查询
return
{
  "Data": {
    "Status": 1
  },
  "Time": 1688118575,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_心跳 = () => {
    let data = {
        "Api": "HeartBeat",
    }
    return SendPost(data)
}

/* 密码找回或修改_超级密码   详细信息官网查询
Type|int| 找回密码方式,1使用超级密码找回
User|string| 用户名
NewPassWord|string| 新密码
SuperPassWord|string| 超级密码
return
{
  "Time": 1688118575,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_密码找回或修改_超级密码 = (User = '', NewPassWord = '', SuperPassWord = '') => {
    let data = {
        "Api": "SetPassWord",
        "Type": 1,
        "User": User,
        "NewPassWord": NewPassWord,
        "SuperPassWord": SuperPassWord,
    }
    return SendPost(data)
}

/* 密码找回或修改_绑定手机   详细信息官网查询
Type|int| 找回密码方式,1使用超级密码找回
User|string| 用户名
NewPassWord|string| 新密码
PhoneCaptchaId|string| 短信验证码Id,调用`取短信验证码`可以获取
PhoneCaptchaValue|string| 收到的短信验证码
return
{
  "Time": 1688118575,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_密码找回或修改_绑定手机 = (User = '', NewPassWord = '', PhoneCaptchaId = '', PhoneCaptchaValue = '') => {
    let data = {
        "Api": "SetPassWord",
        "Type": 2,
        "User": User,
        "NewPassWord": NewPassWord,
        "PhoneCaptchaId": PhoneCaptchaId,
        "PhoneCaptchaValue": PhoneCaptchaValue,
    }
    return SendPost(data)
}

/* 取用户余额   详细信息官网查询
return
{
  "Data": {
    "Rmb": 1.11
  },
  "Time": 1688118575,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_取用户余额 = () => {
    let data = {
        "Api": "GetUserRmb",
    }
    return SendPost(data)
}

/* 取用户积分   详细信息官网查询
return
{
  "Data": {
    "VipNumber":108.78
  },
  "Time": 1688118575,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_取用户积分 = () => {
    let data = {
        "Api": "GetAppUserVipNumber",
    }
    return SendPost(data)
}

/* 取开启验证码接口列表   详细信息官网查询
return
{
  "Data": "{\"UserLogin\":1,\"NewUserInfo\":3,\"GetSMSCaptcha\":2}",
  "Time": 1688118575,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_取开启验证码接口列表 = () => {
    let data = {
        "Api": "GetCaptchaApiList",
    }
    return SendPost(data)
}

/* 卡号充值   详细信息官网查询
User|string|充值账号
Ka|string|充值卡号
InviteUser|string|推荐人
return
{
  "Time": 1688118575,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_卡号充值 = (User = '', Ka = '', InviteUser = '') => {
    let data = {
        "Api": "UseKa",
        "User": User,
        "Ka": Ka,
        "InviteUser": InviteUser,
    }
    return SendPost(data)
}

/* 取动态标记   详细信息官网查询
return
{
  "Data": {
    "Tab": "test测试中英文"
  },
  "Time": 1688118575,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_取动态标记 = () => {
    let data = {
        "Api": "GetTab",
    }
    return SendPost(data)
}

/* 置动态标记   详细信息官网查询
Tab|string|新在线列表动态标记内容
return
{
  "Time": 1688118575,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_置动态标记 = (Tab = '') => {
    let data = {
        "Api": "SetTab",
        "Tab": Tab,
    }
    return SendPost(data)
}

/* 余额充值_取支付通道状态   详细信息官网查询
return
{
  "Data": {
    "AliPayPc": true,
    "WxPayPc": false
  },
  "Time": 1688118575,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_余额充值_取支付通道状态 = () => {
    let data = {
        "Api": "GetPayStatus",
    }
    return SendPost(data)
}

/* 余额购买积分   详细信息官网查询
Money|float64|要花费的金额
return
{
  "Data": {
    "AddVipNumber": 1.35
  },
  "Time": 1688118575,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_余额购买积分 = (Money = 0) => {
    let data = {
        "Api": "PayMoneyToVipNumber",
        "Money": Money,
    }
    return SendPost(data)
}

/* 取可购买卡类列表   详细信息官网查询
return
{
  "Data": [{
    "Id": 18,
    "Money": 3,
    "Name": "天卡"
  }, {
    "Id": 19,
    "Money": 100,
    "Name": "月卡"
  }],
  "Time": 1688118575,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_取可购买卡类列表 = () => {
    let data = {
        "Api": "GetPayKaList",
    }
    return SendPost(data)
}
/* 余额购买充值卡   详细信息官网查询
KaClassId|int|要购买的卡类id 可通过取可购买卡类列表 获取
return
{
  "Data": {
    "AppId": 10001,
    "KaClassId": 18,
    "KaClassName": "天卡",
    "KaName": "1VBC4t1cQOf606QuTqQtGBrLV"
  },
  "Time": 1688536722,
  "Status": 63141,
  "Msg": ""
}
*/
export const F_余额购买充值卡 = (KaClassId = 0) => {
    let data = {
        "Api": "PayMoneyToKa",
        "KaClassId": KaClassId,
    }
    return SendPost(data)
}

/* 取已购买卡号列表   详细信息官网查询
Number|int|获取最近购买的几个,推荐5
return
{
  "Data": [{
    "AppId": 10001,
    "Id": 358,
    "KaClassId": 18,
    "KaClassName": "天卡",
    "Money": 3,
    "Name": "1VBC4t1cQOf606QuTqQtGBrLV",
    "Num": 0,
    "NumMax": 1,
    "RegisterTime": 1688536722,
    "Status": 1
  }, {
    "AppId": 10001,
    "Id": 332,
    "KaClassId": 18,
    "KaClassName": "天卡",
    "Money": 3,
    "Name": "1KBzZF7YXtzHf6pDE9Qv6ecCZ",
    "Num": 1,
    "NumMax": 1,
    "RegisterTime": 1684564559,
    "Status": 1
  }, {
    "AppId": 10001,
    "Id": 331,
    "KaClassId": 18,
    "KaClassName": "天卡",
    "Money": 3,
    "Name": "1GRAGpGtuotDYhwZCecqR8FHH",
    "Num": 1,
    "NumMax": 1,
    "RegisterTime": 1684564211,
    "Status": 1
  }],
  "Time": 1688537141,
  "Status": 70701,
  "Msg": ""
}
*/
export const F_取已购买卡号列表 = (Number = 0) => {
    let data = {
        "Api": "GetPurchasedKaList",
        "Number": Number,
    }
    return SendPost(data)
}

/* 取用户类型列表   详细信息官网查询
return
{
  "Data": [{
    "Mark": 1,
    "Name": "vip1",
    "Weight": 1
  }, {
    "Mark": 2,
    "Name": "Vip2",
    "Weight": 2
  }],
  "Time": 1684376878,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_取用户类型列表 = () => {
    let data = {
        "Api": "GetUserClassList",
    }
    return SendPost(data)
}

/* 置用户类型   详细信息官网查询
转换用户类型, 会根据权重切换更改时间或点数
Mark|int|新用户类型整数代号
return
{
  "Data": {
    "UserClassMark": 2,
    "UserClassName": "Vip2",
    "VipTime": 1699911226
  },
  "Time": 1684376878,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_置用户类型 = (Mark = 0) => {
    let data = {
        "Api": "SetUserClass",
        "Mark": Mark,
    }
    return SendPost(data)
}

/* 公共js函数运行   详细信息官网查询
JsName|string|公共js函数名
Parameter|string|公共js形参,推荐JSON格式文本参数
IsGlobal|boom|函数归属为全局值为真,应用专属函数值为假
return
{
  "Data": {
    "Return": {
      "IsOk": true,
      "Err": ""
    },
    "Time": 26
  },
  "Time": 1688551155,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_公共js函数运行 = (JsName = '', Parameter = '', IsGlobal = false) => {
    let data = {
        "Api": "RunJS",
        "JsName": JsName,
        "Parameter": Parameter,
        "IsGlobal": IsGlobal,
    }
    return SendPost(data)
}

/* 任务池_任务创建   详细信息官网查询
当公共js函数耗时过长时就不推荐使用公共函数了,推荐使用任务池,异步并发处理,性能更高.解决长耗时功能在服务器执行,还可以通过hook函数,进行任务的控制
TaskTypeId|string|任务类型ID
Parameter|string|任务类型文本参数,推荐JSON格式文本参数
return
{
  "Data": {
    "TaskUuid": "1a6547d1-269d-4ca4-b1b8-b86fb6d41287"
  },
  "Time": 1688551155,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_任务池_任务创建 = (TaskTypeId = '', Parameter = '') => {
    let data = {
        "Api": "TaskPoolNewData",
        "TaskTypeId": TaskTypeId,
        "Parameter": Parameter,
    }
    return SendPost(data)
}

/* 任务池_任务查询   详细信息官网查询
TaskUuid|string|创建任务时响应的UUID
return
{
  "Data": {
    "ReturnData": "",
    "Status": 1,
    "TimeEnd": 0,
    "TimeStart": 1684762832
  },
  "Time": 1684762832,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_任务池_任务查询 = (TaskUuid = '') => {
    let data = {
        "Api": "TaskPoolGetData",
        "TaskUuid": TaskUuid,
    }
    return SendPost(data)
}

/* 任务池_任务处理获取   详细信息官网查询
仅供参考,任务池用户提交的任务,不建议用户端处理,建议服务器另开软件通过WebApi获取单独处理,保证安全性, 轮询即可已优化高性能,线程安全,推荐3秒/次
GetTaskNumber|string|获取最大数量,线程池空闲多少输入多少
return
{
  "Data": [{
    "uuid": "63943989-893a-431a-b0fa-2cfb240cb782",
    "Tid": 1,
    "TimeStart": 1684766914,
    "SubmitData": "{\"a\":1}"
  }, {
    "uuid": "8087b68b-3657-4397-9dea-599a10584b28",
    "Tid": 1,
    "TimeStart": 1684764215,
    "SubmitData": "{\"a\":1}"
  }, {
    "uuid": "8c6d6954-00b5-40df-bf8c-ec65b995e9ea",
    "Tid": 1,
    "TimeStart": 1684767755,
    "SubmitData": "{\"a\":1}"
  }],
  "Time": 1684762832,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_任务池_任务处理获取 = (GetTaskNumber = '') => {
    let data = {
        "Api": "TaskPoolGetTask",
        "GetTaskNumber": GetTaskNumber,
    }
    return SendPost(data)
}
/* 任务池_任务处理返回   详细信息官网查询
TaskUuid|string|获取任务时响应的UUID
TaskStatus|int| 3成功,4任务失败 其他自定义
TaskReturnData|string|任务结果数据,推荐JSON格式文本参数
return
{
  "Time": 1684762832,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_任务池_任务处理返回 = (TaskUuid = '', TaskStatus = 0, TaskReturnData = '') => {
    let data = {
        "Api": "TaskPoolSetTask",
        "TaskUuid": TaskUuid,
        "TaskStatus": TaskStatus,
        "TaskReturnData": TaskReturnData,
    }
    return SendPost(data)
}

/* 订单_购卡直冲   详细信息官网查询
User|string|充值用户账号或卡号
KaClassId|int|要购买的卡类ID
PayType|string|支付通道"支付宝PC""微信支付""小叮当"  更多请查看系统管理->系统设置->在线支付设置
return
{
  "Data": {
    "OrderId": "202307051333100001",
    "PayURL": "https://openapi.alipay.com/gateway.do?app_id=202.....后面省略",
    "PayQRCode": "wx://adadhfhjansdkaj",
    "PayQRCodePNG": "base64tupkladlwnlnadwda"
  },
  "Time": 1688535190,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_订单_购卡直冲 = (User = '', KaClassId = 0, PayType = '') => {
    let data = {
        "Api": "PayKaUsa",
        "User": User,
        "KaClassId": KaClassId,
        "PayType": PayType,
    }
    return SendPost(data)
}

/* 订单_支付购卡   详细信息官网查询
User|string|充值用户账号或卡号
KaClassId|int|要购买的卡类ID
PayType|string|支付通道"支付宝PC""微信支付""小叮当"  更多请查看系统管理->系统设置->在线支付设置
return
{
  "Data": {
    "OrderId": "202307051333100001",
    "PayURL": "https://openapi.alipay.com/gateway.do?app_id=202.....后面省略",
    "PayQRCode": "wx://adadhfhjansdkaj",
    "PayQRCodePNG": "base64tupkladlwnlnadwda"
  },
  "Time": 1688535190,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_订单_支付购卡 = (KaClassId = 0, PayType = '') => {
    let data = {
        "Api": "PayGetKa",
        "KaClassId": KaClassId,
        "PayType": PayType,
    }
    return SendPost(data)
}
/* 订单_购买余额   详细信息官网查询
User|string|充值用户账号或卡号
Money|float|要充值的金额
PayType|string|支付通道"支付宝PC""微信支付""小叮当"  更多请查看系统管理->系统设置->在线支付设置
return
{
  "Data": {
    "OrderId": "202307051333100001",
    "PayURL": "https://openapi.alipay.com/gateway.do?app_id=202.....后面省略",
    "PayQRCode": "wx://adadhfhjansdkaj",
    "PayQRCodePNG": "base64tupkladlwnlnadwda"
  },
  "Time": 1688535190,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_订单_购买余额 = (User = '', Money, PayType = '') => {
    let data = {
        "Api": "PayUserMoney",
        "User": User,
        "Money": Money,
        "PayType": PayType,
    }
    return SendPost(data)
}
/* 订单_购买积分   详细信息官网查询
User|string|充值用户账号或卡号
Money|float|要充值的金额
PayType|string|支付通道"支付宝PC""微信支付""小叮当"  更多请查看系统管理->系统设置->在线支付设置
return
{
  "Data": {
    "OrderId": "202307051333100001",
    "PayURL": "https://openapi.alipay.com/gateway.do?app_id=202.....后面省略",
    "PayQRCode": "wx://adadhfhjansdkaj",
    "PayQRCodePNG": "base64tupkladlwnlnadwda"
  },
  "Time": 1688535190,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_订单_购买积分 = (User = '', Money, PayType = '') => {
    let data = {
        "Api": "PayUserVipNumber",
        "User": User,
        "Money": Money,
        "PayType": PayType,
    }
    return SendPost(data)
}


/* 订单_查询支付结果   详细信息官网查询
OrderId|string|订单号
return
{
  "Data": {
    "Status": 3
  },
  "Time": 1688535190,
  "Status": 13013,
  "Msg": ""
}
*/
export const F_订单_查询支付结果 = (OrderId = '') => {
    let data = {
        "Api": "GetPayOrderStatus",
        "OrderId": OrderId,
    }
    return SendPost(data)
}
/* 用户云配置_置值   详细信息官网查询
Name|string|云配置名称
Value|string|云配置值
return
{
  "Data": {
  },
  "Time": 1688535190,
  "Status": 10000,
  "Msg": ""
}
*/
export const F_用户云配置_置值 = (Name = '', Value = '') => {
    let data = {
        "Api": "SetUserConfig",
        "Name": Name,
        "Value": Value,
    }
    return SendPost(data)
}
/* 用户云配置_取值   详细信息官网查询
Name|string|云配置名称
return
*/
export const F_用户云配置_取值 = (Name = '') => {
    let data = {
        "Api": "GetUserConfig",
        "Name": Name,
    }
    return SendPost(data)
}
