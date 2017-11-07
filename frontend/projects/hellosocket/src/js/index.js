$(function() {
    var defaultMessageNumber = maxMessageNumber = 16
    var extraMessageNumber = 4

    // 建立socket连接
    var socket = io();

    // 初始化弹幕
    var damoo = new Damoo('dm-screen', 'dm-canvas', 20, 'Helvetica');
    damoo.play();

    // TODO：颜色根据特定规则制定
    // Demo中随机处理
    var colors = ['#6f9', '#000', '#fff', 'f00', '#b8860b', '#f49', '#b8870b']

    socket.on('chat message', function(r) {
        buildDamoo(r)
        buildMessage(r)
    })

    function buildDamoo(message) {
        // TODO: 返回多条消息
        // Demo返回的是单条信息.
        damoo.emit({ text: message, color: colors[Math.floor(Math.random() * colors.length)] })
    }

    var $messageContainer = $('.message-box')
    var $messageContent = $('.message-content')
    var $showLatestMessage = $('.btn-show-latest-message')

    // TODO：检测用户是否手动滚动消息框到底部。
    $messageContainer.on('scroll', function() {

    })

    // 按钮：显示最新消息
    $showLatestMessage.on('click', function() {
        toLatestMessagePosition()
    })

    var viewingOldMessages = false

    // 根据后台传入的消息渲染列表
    function buildMessage(message) {
        var messages = [message]

        // Note: 默认保持滚动条在最底部|始终显示最新消息
        viewingOldMessages = amIViewingOldMessages()

        $messageContent.append(T.message({ list: messages }))
        handleMessageNumber()
        if (!viewingOldMessages) {
            // 添加完数据，浏览器不会自动将滚动条锁定在最底部，手动锁定.
            toLatestMessagePosition()
        } else {
            // 查看历史消息的时候，提示未读消息.
            var count = parseInt($showLatestMessage.attr('data-count')) + messages.length
            $showLatestMessage.attr('data-count', count).html('有' + count + '条最新消息')
            if (!$showLatestMessage.hasClass('active')) {
                $showLatestMessage.addClass('active')
            }
        }
    }

    function amIViewingOldMessages() {
        var boxHeight = $messageContainer[0].scrollHeight
        var boxScrollHeight = $messageContainer[0].scrollTop + $messageContainer[0].offsetHeight
        var offsetMax = 10
        var offset = boxHeight - boxScrollHeight
        console.log('offset:' + offset)
        return offset > offsetMax ? true : false
    }

    var hasNumberAdded = false

    function handleMessageNumber() {
        // Note: 用户回看历史消息

        // 1. 缓存没有超过最大限制：直接添加
        // 2. 缓存超过最大限制：删除超出的dom
        // 3. 缓存超过最大限制 并且 用户正在查看历史消息：增加最大限制（如增加30条, 给用户查看的时间）。
        // 4. 缓存超过增加后的最大限制: 最大限制变回初始值，并且消息回到最新消息位置，提示最新消息按钮复原。

        if (viewingOldMessages && !hasNumberAdded) {
            // 查看历史消息的时候，增加一次消息最大限制
            maxMessageNumber = defaultMessageNumber + extraMessageNumber
            hasNumberAdded = true
        }

        var messageNumber = $messageContent.find('.message').length
        var messageBoxFull = messageNumber > maxMessageNumber ? true : false
        if (messageBoxFull) {
            // 1.移除超出限制的消息
            var deleteNumber = messageNumber - (hasNumberAdded ? defaultMessageNumber : maxMessageNumber)
            var deleteSelector = []
            while (deleteNumber > 0) {
                deleteNumber--
                deleteSelector.push('.message-box .message:eq(' + deleteNumber + ')')
            }
            console.log(deleteSelector)
            $(deleteSelector.join(',')).remove()

            console.log('当前界面消息条数:' + $messageContent.find('.message').length)

            // 2. 回到底部
            if (viewingOldMessages) {
                maxMessageNumber = defaultMessageNumber
                hasNumberAdded = false
                viewingOldMessages = false
                toLatestMessagePosition()
            }
        }
    }

    function toLatestMessagePosition() {
        // TODO: 计算滚动高度
        $messageContainer.scrollTop(10000)
        $showLatestMessage.removeClass('active').attr('data-count', 0)
    }

    // 用户发弹幕
    var $form = $('.form-user-message')
    var $btnSubmit = $form.find('.btn-submit')
    var $text = $form.find('input')

    $text.on('keyup', function(e) {
        if (e.keyCode && e.keyCode == 13) {
            var message = $text.val()
            if (!message) {
                return
            }
            sendMessage(message)
        }
    })

    $btnSubmit.on('click', function() {
        var message = $text.val()
        if (!message) {
            return
        }
        sendMessage(message)
    })

    function sendMessage(message) {
        socket.emit('chat message', message)
        $text.val('')
    }
})