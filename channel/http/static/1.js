
function ConvState(wrapper, form, params) {
    this.id='xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    this.form = form;
    this.wrapper = wrapper;
    this.parameters = params;
    this.scrollDown = function () {
        $(this.wrapper).find('#messages').stop().animate({ scrollTop: $(this.wrapper).find('#messages')[0].scrollHeight }, 600);
    }.bind(this);

    this.loadAndStoreConversations = function() {
        if (localStorage.getItem('conversations') === null) {
            localStorage.setItem('conversations', JSON.stringify([]));
        }
        const storedConversations = JSON.parse(localStorage.getItem('conversations'));
        storedConversations.forEach(conversation => {
            const message = $('<div class="message ' + conversation.type + '">' + conversation.msg + '<br><span class="timestamp">' + conversation.time + '</span></div>');
            $(this.wrapper).find("#messages").append(message);
        });
    }.bind(this);
};
ConvState.prototype.printAnswer = function (answer = '我是ChatGPT, 一个由OpenAI训练的大型语言模型, 我旨在回答并解决人们的任何问题，并且可以使用多种语言与人交流。') {
    setTimeout(function () {
        var messageObj = $(this.wrapper).find('.message.typing');
        answer = marked.parse(answer);

        if (!answer.includes('<span class="timestamp">')) {
            var timestamp = new Date().toLocaleTimeString();
            answer = answer + '<br><span class="timestamp">' + timestamp + '</span>';
            localStorage.setItem('conversations', JSON.stringify([...JSON.parse(localStorage.getItem('conversations')), { type: 'to', msg: answer, time: timestamp }]));
        }
        
        messageObj.html(answer);
        messageObj.removeClass('typing').addClass('ready');
        this.scrollDown();
        $(this.wrapper).find(this.parameters.inputIdHashTagName).focus();
        localStorage.setItem('conversations', JSON.stringify([...JSON.parse(localStorage.getItem('conversations')), { type: 'to', msg: answer, time: timestamp }]));
    }.bind(this), 500);
};
ConvState.prototype.sendMessage = function (msg) {
    var timestamp = new Date().toLocaleTimeString();
    var message = $('<div class="message from">' + msg + '<br><span class="timestamp">' + timestamp + '</span></div>');
    localStorage.setItem('conversations', JSON.stringify([...JSON.parse(localStorage.getItem('conversations')), { type: 'from', msg, time: timestamp }]));

    $('button.submit').removeClass('glow');
    $(this.wrapper).find(this.parameters.inputIdHashTagName).focus();
    setTimeout(function () {
        $(this.wrapper).find("#messages").append(message);
        this.scrollDown();
    }.bind(this), 100);

    var messageObj = $('<div class="message to typing"><div class="typing_loader"></div></div>');
    setTimeout(function () {
        $(this.wrapper).find('#messages').append(messageObj);
        this.scrollDown();
    }.bind(this), 150);
    var _this = this
    $.ajax({
        url: "./chat",
        type: "POST",
        timeout:180000,
        data: JSON.stringify({
            "id": _this.id,
            "msg": msg
        }),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (data) {
            _this.printAnswer(data.result)
        },
        error:function () {
            _this.printAnswer("网络故障，对话未送达")
        },
    })
};
(function ($) {
    $.fn.convform = function () {
        var wrapper = this;
        $(this).addClass('conv-form-wrapper');

        var parameters = $.extend(true, {}, {
            placeHolder: 'Type Here',
            typeInputUi: 'textarea',
            formIdName: 'convForm',
            inputIdName: 'userInput',
            buttonText: '▶'
        });

        //hides original form so users cant interact with it
        var form = $(wrapper).find('form').hide();

        var inputForm;
        parameters.inputIdHashTagName = '#' + parameters.inputIdName;
        inputForm = $('<div id="' + parameters.formIdName + '" class="convFormDynamic"><div class="options dragscroll"></div><textarea id="' + parameters.inputIdName + '" rows="1" placeholder="' + parameters.placeHolder + '" class="userInputDynamic"></textarea><button type="submit" class="submit">' + parameters.buttonText + '</button><span class="clear"></span></form>');

        //appends messages wrapper and newly created form with the spinner load
        $(wrapper).append('<div class="wrapper-messages"><div class="spinLoader"></div><div id="messages"></div></div>');
        $(wrapper).append(inputForm);

        var state = new ConvState(wrapper, form, parameters);
        state.loadAndStoreConversations();

        //prints first contact
        $.when($('div.spinLoader').addClass('hidden')).done(function () {
            var messageObj = $('<div class="message to typing"><div class="typing_loader"></div></div>');
            $(state.wrapper).find('#messages').append(messageObj);
            state.scrollDown();
            if (localStorage.getItem('conversations') === null) {
                localStorage.setItem('conversations', JSON.stringify([]));
            }
            const storedConversations = JSON.parse(localStorage.getItem('conversations'));
            if (storedConversations.length == 0) {
                state.printAnswer();
            }
            else{
                state.printAnswer("欢迎回来,有什么我可以帮您的吗？");
            }
        });

        //binds enter to send message
        $(inputForm).find(parameters.inputIdHashTagName).keypress(function (e) {
            if (e.which == 13) {
                var input = $(this).val();
                e.preventDefault();
                if (input.trim() != '' && !state.wrapper.find(parameters.inputIdHashTagName).hasClass("error")) {
                    $(parameters.inputIdHashTagName).val("");
                    state.sendMessage(input);
                } else {
                    $(state.wrapper).find(parameters.inputIdHashTagName).focus();
                }
            }
            autosize.update($(state.wrapper).find(parameters.inputIdHashTagName));
        })
        $(inputForm).find(parameters.inputIdHashTagName).on('input', function (e) {
            if ($(this).val().length > 0) {
                $('button.submit').addClass('glow');
            } else {
                $('button.submit').removeClass('glow');
            }
        });

        $(inputForm).find('button.submit').click(function (e) {
            var input = $(state.wrapper).find(parameters.inputIdHashTagName).val();
            e.preventDefault();
            if (input.trim() != '' && !state.wrapper.find(parameters.inputIdHashTagName).hasClass("error")) {
                $(parameters.inputIdHashTagName).val("");
                state.sendMessage(input);
            } else {
                $(state.wrapper).find(parameters.inputIdHashTagName).focus();
            }
            autosize.update($(state.wrapper).find(parameters.inputIdHashTagName));
        });

        if (typeof autosize == 'function') {
            $textarea = $(state.wrapper).find(parameters.inputIdHashTagName);
            autosize($textarea);
        }

        return state;
    }
})(jQuery);