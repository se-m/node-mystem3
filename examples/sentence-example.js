'use strict';

var MyStem = require('../lib/MyStem');

var myStem = new MyStem({
    dic_only: true,
    weight: true,
    show_gram: false
});

myStem.start();

var text = '(Из стихотворения \"Крестьянские дети\")\r\n Однажды, в студеную зимнюю пору\r\nЯ из лесу вышел; был сильный мороз.';

myStem.analyze(text).then(function(data) {
    data.forEach(function (record) {
        console.log(record);
    });
    myStem.stop();
});
