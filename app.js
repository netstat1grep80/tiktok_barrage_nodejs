import { WebSocketServer } from "ws";
const wss = new WebSocketServer({
    port: 9527,
});

import chalk, { Chalk } from "chalk";

wss.on("connection", function connection(ws) {
    console.log("客户端连接成功");
    ws.on("message", function message(data) {
        let message = JSON.parse(data.toString())
        switch (message.action) {
            case 'message':
                const giftPattern = /送给主播/g
                const text = message.message.user_nickName + ':' + message.message.msg_content
                if(giftPattern.test(text))
                    console.log(getTime(), chalk.yellow(text))
                else
                    console.log(getTime(), text)
                break
            case 'join':
                console.log(getTime(),chalk.gray(message.message.user_nickName + ':' + message.message.msg_content))
                break
            case 'online':
                console.log(getTime(), chalk.redBright("在线人数 " + message.message.msg_content))
                break
        }
        wss.clients.forEach(cen => {
            cen.send(JSON.stringify(message))
        })
    });
});

function getTime() {
    return `[${new Date().toLocaleTimeString()}]`
}

console.log('打开-> http://127.0.0.1:9527')