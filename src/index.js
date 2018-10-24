let wxUtils = {
    groupId: null,
    secretId: null,
    porxyUrl: null,
    getAccessToken() {
        // 判断是否缓存有
        return new Promise((resolve, reject) => {
            var access_token = localStorage.getItem("accessToken");
            var expires = localStorage.getItem("expires_accessToken");
            if (expires > new Date().getTime() - 2000) {
                resolve(access_token);
                return;
            }
            let accessTokenUrl = 'https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=' + this.groupId + "&corpsecret=" + this.secretId;
            fetch(this.porxyUrl, {
                method: "POST",
                body: JSON.stringify({
                    method: "GET",
                    url: accessTokenUrl
                })
            }).then(resp => {
                return resp.json()
            }).then(data => {
                if (data.errcode == 0) {
                    //保存本次获取的accessToken
                    localStorage.setItem("accessToken", data.access_token);
                    localStorage.setItem("expires_accessToken", new Date().getTime() + data.expires_in * 1000);
                    resolve(data.access_token);
                }
            }).catch(data => {
                reject();
            })
        });
    },
    getTicket() {
        return new Promise((resolve, reject) => {
            var ticket = localStorage.getItem("ticket");
            var expires = localStorage.getItem("expires_ticket");
            if (expires > new Date().getTime() - 2000) {
                resolve(ticket);
                return;
            }
            let ticketUrl = "https://qyapi.weixin.qq.com/cgi-bin/get_jsapi_ticket?access_token=" + localStorage.getItem("accessToken");
            fetch(this.porxyUrl, {
                method: "POST",
                body: JSON.stringify({
                    method: "GET",
                    url: ticketUrl
                })
            }).then(resp => {
                return resp.json()
            }).then(data => {
                if (data.errcode == 0) {
                    //保存本次获取的accessToken
                    localStorage.setItem("ticket", data.ticket);
                    localStorage.setItem("expires_ticket", new Date().getTime() + data.expires_in * 1000);
                    resolve(data.ticket);
                }
            }).catch(data => {
                reject();
            })
        });
    },
    getSignature(timestamp, ticket) {
        let url = window.location.href.split("#")[0]
        let jsapi_ticket = "jsapi_ticket=" + ticket + "&noncestr=" + timestamp + "&timestamp=" + (timestamp + "").substr(0, 10) + "&url=" + url;
        this.printStatuInfo("签名原始信息:" + jsapi_ticket);
        let sha1Str = new jsSHA(decodeURIComponent(jsapi_ticket),"TEXT");
        return sha1Str.getHash("SHA-1", "HEX");
    },
    printStatuInfo(str) {
        let txtInfo = document.querySelector("#txtInfo");
        txtInfo.value = txtInfo.value + str + "\r\n";
    },
};
window.onload = () => {
    let timestamp = null;
    let txtInfo = document.querySelector("#txtInfo");
    let btnScanCode = document.querySelector("#btnScan");
    let btnInitJSDK = document.querySelector("#btnInitJSDK");
    btnInitJSDK.onclick = () => {
        wxUtils.groupId = document.querySelector("#groupId").value;
        wxUtils.secretId = document.querySelector("#secretId").value;
        wxUtils.porxyUrl = document.querySelector("#porxyUrl").value;

        wxUtils.printStatuInfo("1.正在获取accessToken");
        wxUtils.getAccessToken().then((access_token) => {
            wxUtils.printStatuInfo("-------获取到accessToke:" + access_token);
            wxUtils.printStatuInfo("2.正在获取ticket");
            return wxUtils.getTicket();
        }).then((ticket) => {
            timestamp = new Date().getTime();
            wxUtils.printStatuInfo("-------获取到ticket:" + ticket);
            wxUtils.printStatuInfo("3.正在生Signature")
            let sig = wxUtils.getSignature(timestamp, ticket);
            wxUtils.printStatuInfo("-------获取到Signature:" + sig);
            wxUtils.printStatuInfo("4.正在初始js-sdk配置")
            wx.config({
                beta: true,// 必须这么写，否则wx.invoke调用形式的jsapi会有问题
                debug: true, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
                appId: 'wx185ddae040ea5690', // 必填，企业微信的corpID
                timestamp: timestamp, // 必填，生成签名的时间戳
                nonceStr: timestamp + '', // 必填，生成签名的随机串
                signature: sig,// 必填，签名，见附录1
                jsApiList: ["scanQRCode"] // 必填，需要使用的JS接口列表，所有JS接口列表见附录2
            });
        });
    };
    btnScanCode.onclick = () => {
        wxUtils.printStatuInfo("调用二维码扫描")
        wx.scanQRCode({
            desc: 'scanQRCode desc',
            needResult: 0, // 默认为0，扫描结果由企业微信处理，1则直接返回扫描结果，
            scanType: ["qrCode", "barCode"], // 可以指定扫二维码还是一维码，默认二者都有
            success: function (res) {
                // 回调
                wxUtils.printStatuInfo("扫描信息：" + JSON.stringify(res))
            },
            error: function (res) {
                if (res.errMsg.indexOf('function_not_exist') > 0) {
                    alert('版本过低请升级')
                }
            }
        });
    };

    wx.ready(function () {
        // config信息验证后会执行ready方法，所有接口调用都必须在config接口获得结果之后，config是一个客户端的异步操作，所以如果需要在页面加载时就调用相关接口，则须把相关接口放在ready函数中调用来确保正确执行。对于用户触发时才调用的接口，则可以直接调用，不需要放在ready函数中。
        wxUtils.printStatuInfo("-------js-sdk初始完成")
    });
    wx.error(function (res) {
        // config信息验证失败会执行error函数，如签名过期导致验证失败，具体错误信息可以打开config的debug模式查看，也可以在返回的res参数中查看，对于SPA可以在这里更新签名。
    });
}