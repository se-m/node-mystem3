var assert = require('chai').assert;

var MyStem = require('../lib/MyStem');

function checkData (text, data, lemms){
  text = text.replace(/["',;.?!()\[\]|\/]+/g,"");
  aWords = text.split(/\s+/);
  aWords.forEach(function (word, index){
     assert.equal(data[index].text, word);
     if (Array.isArray(lemms)){
       assert.equal(data[index].analysis[0].lex, lemms[index]);
     }
  });
}

test('Analyze known word', function() {
    var myStem = new MyStem();
    myStem.start();

    return myStem.analyze("немцы").then(function(data) {
        assert.equal( data[0].analysis[0].lex, "немец");
    }).then(function() {
        myStem.stop();
    });
});

test('Analyze known words', function() {
    var myStem = new MyStem();
    myStem.start();
    text = "немец немца немцу немца немцем немце немцы немцев немцам немцев немцами немцах";
    lemms = "немец ".repeat(12).trim();
    return myStem.analyze(text).then(function(data) {
        checkData( text, data, lemms);
    }).then(function() {
        myStem.stop();
    });
});

test('Analyze known text', function() {
    var myStem = new MyStem();
    myStem.start();
    text = "Однажды в студеную зимнюю пору я из лесу вышел был сильный мороз";
    return myStem.analyze(text).then(function(data) {
        checkData( text, data);
    }).then(function() {
        myStem.stop();
    });
});

test('Analyze known text with punctuation', function() {
    var myStem = new MyStem();
    myStem.start();
    text = "(Из стихотворения \"Крестьянские дети\")\r\n Однажды, в студеную зимнюю пору\r\nЯ из лесу вышел; был сильный мороз.";
    lemms = "из стихотворение крестьянский ребенок однажды в студеный зимний пора я из лес выходить быть сильный мороз".split(' ');
    return myStem.analyze(text).then(function(data) {
        checkData( text, data, lemms);
    }).then(function() {
        myStem.stop();
    });
});

