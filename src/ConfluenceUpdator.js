var http = require("http");
var querystring = require("querystring");
var fs = require("fs");

var args = process.argv.splice(2);
var url = args[0];
var pageId = args[1];
var title = args[2];

var reqRead = http.get("http://rui.liu:q1w2e3r4t5@wiki.17zuoye.net/rest/tinymce/1/content/" + pageId + ".json?_="
    + new Date().getTime(),
    function (res) {
        res.setEncoding("utf-8");
        var cookies = res.headers["set-cookie"];
        var content = "";
        res.on("data", function(chunk)
        {
            content += chunk;
        });
        res.on("end", function ()
        {
            var data = JSON.parse(content);
            var atlToken = data.atlToken;
            var pageVersion = data.pageVersion;
            console.log(pageVersion, atlToken);
            // 读取url下的文本
            var configStr = fs.readFileSync(url, "utf-8");
            // 发送post请求
            var postData = querystring.stringify({
                atl_token: atlToken,
                originalVersion: pageVersion,
                title: title,
                wysiwygContent: configStr,
                watchPageAfterComment: true,
                moveHierarchy: true,
                notifyWatchers: true,
                confirm: "Save",
                draftId: 0,
                entityId: pageId
            });
            var opt = {
                method: "POST",
                host: "wiki.17zuoye.net",
                path: "/pages/doeditpage.action?pageId=" + pageId,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Content-Length": postData.length,
                    "Cookie": cookies.join("; ")
                }
            };
            var reqUpdate = http.request(opt, function (res)
            {
                var content = "";
                res.on("data", function(chunk)
                {
                    content += chunk;
                });
                res.on("end", function(){
                    console.log(content.substr(0, 1000));
                });
            });
            reqUpdate.write(postData);
            reqUpdate.end();
        });
    }
);
reqRead.on("error", function (e) {
    console.log("ERROR: " + e.message);
});
reqRead.end();
