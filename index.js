const Barrage = class {
    roomUserName = null
    roomId = location.href.match(/\/(\d+)/)?.[1] || null
    wsurl = "ws://127.0.0.1:9527"
    timer = null
    timeinterval = 10 * 1000 // 断线重连轮询间隔
    propsId = null
    chatDom = null
    roomJoinDom = null
    ws = null
    observer = null
    chatObserverrom = null
    onlineObserver = null
    onlineNumberDom = null
    option = {}
    event = {}
    eventRegirst = {}
    constructor(option = { message: true, join: true, online: false}) {
        this.option = option
        let { link, removePlay } = option
        if (link) {
            this.wsurl = link
        }
        if (removePlay) {
            document.querySelector('.basicPlayer').remove()
        }
        this.propsId = Object.keys(document.querySelector('.webcast-chatroom___list'))[1]
        this.chatDom = document.querySelector('.webcast-chatroom___items').children[0]
        this.roomJoinDom = document.querySelector('.webcast-chatroom___bottom-message')
        this.onlineNumberDom = this.getOnlineNumberDom()
        this.roomUserName = this.getCurrentUserName()
        this.ws = new WebSocket(this.wsurl)
        this.ws.onclose = this.wsClose
        this.ws.onopen = () => {
            this.openWs()
        }
    }
    getCurrentUserName(){
        var rows = document.querySelectorAll("div[data-e2e]");
        for(var i=0 ;i < rows.length ;i ++){
            var row = rows[i];
            if(row.attributes['data-e2e'].value == 'live-room-nickname'){
                return row.innerHTML
            }
        }
        return null

    }
    getOnlineNumberDom(){
        var rows = document.querySelectorAll("div[data-e2e]");
        for(var i=0 ;i < rows.length ;i ++){
            var row = rows[i];
            if(row.attributes['data-e2e'].value == 'live-room-audience'){
                return row
            }
        }
        return null
    }
    // 消息事件 , join, message
    on(e, cb) {
        this.eventRegirst[e] = true
        this.event[e] = cb
    }
    openWs = () => {
        console.log(`[${new Date().toLocaleTimeString()}]`, '服务已经连接成功!')
        clearInterval(this.timer)
        this.timer = null
        this.runServer()

    }
    wsClose = () => {
        console.log('服务器断开')
        if (this.timer != null) {
            return
        }
        if (this.ws) {
            this.ws.close();
        }
        this.observer && this.observer.disconnect();
        this.chatObserverrom && this.chatObserverrom.disconnect();
        this.onlineObserver && this.onlineObserver.disconnect();
        console.log(this)
        

        this.timer = setInterval(() => {
                console.log('正在等待服务器启动..')
                this.ws = new WebSocket(this.wsurl);
                this.ws.onclose = this.wsClose
                
                // 设置连接超时
                const connectionTimeout = setTimeout(() => {
                    console.log('kill socket')
                    // 关闭 WebSocket 连接
                    this.ws.close();
                    
                }, 5000); // 设置超时时间，这里设为 5 秒
                
                console.log('状态 ->', this.ws.readyState)
                setTimeout(() => {
                    if (this.ws.readyState === 1) {
                        clearTimeout(connectionTimeout);
                        this.openWs()
                    }
                }, 2000)
        }, this.timeinterval)
        
        
    }
    runServer() {
        let _this = this
        console.log(this.option)
        if (this.option.online) {
                        
            this.onlineObserver = new MutationObserver((mutationsList) => {
                for (let mutation of mutationsList) {
                    if (mutation.type === 'childList' || mutation.type === 'characterData') {
                        if(this.onlineNumberDom == null){
                            var msgText = "0"
                        }else{
                            var msgText = this.onlineNumberDom.innerHTML
                        }

                        let msg = {
                            ...{online: msgText ,roomId: this.roomId, roomUserName:this.roomUserName}
                        }
                        // console.log(msg.msg_content)
                        if (this.eventRegirst.online) {
                            this.event['online'](msg)
                        }

                        this.ws.send(JSON.stringify({ action: 'online', message: msg }));
                    }
                }
                
            });

            this.onlineObserver.observe(this.onlineNumberDom, {
                attributes: true,
                attributeOldValue: false,
                characterData: true,
                characterDataOldValue: false,
                childList: true,
                subtree: true
            });

        }

        if (this.option.join) {
            this.observer = new MutationObserver((mutationsList) => {
                for (let mutation of mutationsList) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length) {
                        let b = mutation.addedNodes[0]
                        // let user = dom[this.propsId].children.props.message.payload.user
                        try{
                            if (b[this.propsId].children.props.message) {
                                let message =  this.messageParse(b)
                                if(message){
                                    /*
                                    let msg = {
                                        ...this.getUser(user),
                                        ...{ nickname: `${user.nickname}` , roomId: this.roomId}
                                    }
                                    */
                                    if (this.eventRegirst.join) {
                                        this.event['join'](message)
                                    }
                                    this.ws.send(JSON.stringify({ action: 'join', message: message }));
                                }
                            }
                        }catch(error){
                            console.log(b)
                        }
                    }
                }
            });
            this.observer.observe(this.roomJoinDom, { childList: true });

        }

        this.chatObserverrom = new MutationObserver((mutationsList) => {
            
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList' && mutation.addedNodes.length) {
                    
                    let b = mutation.addedNodes[0]
                    // console.log(b[this.propsId])
                    if (b[this.propsId].children.props.message) {
                        let message = this.messageParse(b)
                        if (message != null) {
                            if (this.eventRegirst.message) {
                                this.event['message'](message)
                            }
                            this.ws.send(JSON.stringify({ action: 'message', message: message }));
                        }
                    }
                }
            }
        });
        this.chatObserverrom.observe(this.chatDom, { childList: true });
    }
    getUser(user, action) {
        if (!user) {
            return
        }
        let msg = {}
        try{
            msg = { 
                user_level: this.getLevel(user.badge_image_list, 1),
                user_fansLevel: this.getLevel(user.badge_image_list, 7),
                user_info:user,
                user_id: user.id,
                user_short_id: user.short_id,
                user_sec_id: user.sec_uid,
                user_display_id: user.display_id,
                user_nickName: user.nickname,
                user_pay_grade: user.pay_grade.level,
                user_avatar: user.avatar_thumb.url_list[0],
                user_gender: user.gender === 1 ? '男' : '女',
                user_isfollower: user.isfollower == true ? '关注主播':'未关注主播',
                user_isfollowing: user.isfollowing == true ? '被主播关注':'未被主播关注',
                user_follower_count: user.follow_info.follower_count, //粉丝
                user_following_count: user.follow_info.following_count, //关注
                user_isAdmin: typeof(user.user_attr) == 'undefined' || user.user_attr == null  ? action : user.user_attr.is_admin
            }
            // console.log(msg)
        }catch(e){
            console.log(e)
            console.log('error:' + action)
            console.log(user)
        }
        
        return msg
    }
    getLevel(arr, type) {
        if (!arr || arr.length === 0) {
            return 0
        }
        let item = arr.find(i => {
            return i.imageType === type
        })
        if (item) {
            return parseInt(item.content.level)
        } else {
            return 0
        }
    }
    messageParse(dom) {
        // console.log(dom[this.propsId])
        if (!dom[this.propsId].children.props.message) {
            return null
        }
        let msg = dom[this.propsId].children.props.message.payload
  
        let result = {
            roomUserName:this.roomUserName,
            roomId: this.roomId,
            gift_id: null,
            gift_name: null,
            gift_number: null,
            user_nickName: null,
            method: msg.common.method
        }
      
       
        result = Object.assign(result, this.getUser(msg.user, msg.common.method))
        // console.log(msg.common.method)
        switch (msg.common.method) {
            case 'WebcastExhibitionChatMessage':
                return null
                result = Object.assign(result, this.getUser(msg.common.display_text.pieces[0].user_value.user))
                // console.log(result)
                // console.log(msg)
                let temp = typeof(msg.common.display_text.pieces[1])!='undefined' ?  msg.common.display_text.pieces[1].string_value : 0
                //恭喜{0:user}升级到{1:string}
                
                result = Object.assign(result, {
                    isGift: false,
                    msg_content: msg.common.display_text.default_pattern.replace('{0:user}',result.user_nickName).replace('{1:string}', temp)
                })
                // console.log(dom[this.propsId].children.props.message)
                
                break;
            case 'WebcastRoomMessage':
                
                return null
                result = Object.assign(result, this.getUser(msg.common.display_text.pieces[0].user_value.user))
                // console.log(result)
                // console.log(msg)
                let level_num = typeof(msg.common.display_text.pieces[1])!='undefined' ?  msg.common.display_text.pieces[1].string_value : 0
                //恭喜{0:user}升级到{1:string} 或者 {0:user} 推荐直播给Ta的朋友
                result = Object.assign(result, {
                    isGift: false,
                    msg_content: msg.common.display_text.default_pattern.replace('{0:user}',result.user_nickName).replace('{1:string}', level_num)
                })
                // console.log(dom[this.propsId].children.props.message)
                break;
            case 'WebcastGiftMessage':
                if(msg.combo_count>1){
                    console.log(msg)
                }
                result = Object.assign(result, {
                    isGift: true,
                    gift_id: msg.gift_id,
                    gift_name: msg.gift.name,
                    gift_number: msg.combo_count,
                    user_nickName: msg.user.nickname
                })
                break
          
            default:
                //WebcastExhibitionChatMessage
                //"WebcastMemberMessage"
                //WebcastLikeMessage
                /*
                100 WebcastRoomStatsMessage
  71 WebcastRoomStreamAdaptationMessage
  63 WebcastRanklistHourEntranceMessage
  25 WebcastInRoomBannerMessage
  14 WebcastRoomRankMessage
   7 WebcastRoomDataSyncMessage
   6 WebcastEmojiChatMessage
   4 WebcastUpdateFanTicketMessage
   3 WebcastSocialMessage
   1 WebcastRoomMessage
   */
  
   
                let methods = ['WebcastExhibitionChatMessage','WebcastMemberMessage','WebcastLikeMessage','WebcastGiftMessage','WebcastFansclubMessage','WebcastChatMessage']
                if( methods.includes(msg.common.method) == false ){
                    console.log(msg.common.method)
                    console.log(msg)
                }
                
               
                result = Object.assign(result, {
                    isGift: false,
                    msg_content: msg.content
                })
                break
        }
        
        
        return result
    }
}

if (window.onDouyinServer) {
    window.onDouyinServer()
}

window.removeVideoLayer = function() {
    document.querySelector('.basicPlayer').remove()
    console.log('删除画面成功,不影响弹幕信息接收')
}