window.onDouyinServer = function() {
    new Barrage()
}
// console.clear()
console.log(`[${new Date().toLocaleTimeString()}]`, '正在载入JS,请稍后..')
console.log(`[${new Date().toLocaleTimeString()}]`, '如需删除直播画面，请在控制台输入: removeVideoLayer()')
var scriptElement = document.createElement('script')
scriptElement.src = 'http://127.0.0.1/index.js?t=' + Math.random()
document.body.appendChild(scriptElement)