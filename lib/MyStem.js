'use strict';

var Promise      = require('bluebird');
var childProcess = require('child_process');
var readline     = require('readline');
var path         = require('path');



/**
 * Создать инстанс
 * 
 * @param {Object=} args - Параметры запуска процесса mystem
 * @param {String} [args.path='vendor/%platform%/mystem'] - Путь к исполняемому файлу
 * @param {String} [args.format='json'] - формат вывода. text|xml|json
 * @param {boolean} [args.use_context=true] - применить контекстное снятие омонимии.
 * @param {Object=} [args.show_gram=true] - печатать грамматическую информацию
 * @param {Boolean} [args.eng_gr=true] - английские обозначения граммем
 * @param {Boolean} [args.join_info=true] - cклеивать информацию словоформ при одной лемме. Только с show_gram
 * @param {Boolean} [args.all_input=false] - копировать весь ввод на вывод. необходима для возврата к полному представлению текста
 * @param {Boolean} [args.dic_only=false] - только словарные слова.
 * @param {Boolean} [args.no_source=false] - не печатать исходные словоформы.
 * @param {Boolean} [args.mark_end=false] - маркер конца предложения. Только с all_input
 * @param {String} [args.encoding='utf-8'] - кодировка ввода/вывода. cp866|cp1251|koi8-r|utf-8 
 * @param {String} [args.fixlist] - файл с пользовательским словарём
 * @param {String} [args.filtergram] - cтроить разборы только с указанными граммемами. Список грамем черз запятую.
 * @param {Boolean} [args.gen_all=false] - генерировать все возможные гипотезы для несловарных слов.
 * @param {Boolean} [args.weight=false] - печатасть бесконтекстную вероятность леммы
 * @returns {Promise}
 */

function MyStem(args) {
    args = args || {};

    if (!args.hasOwnProperty('format')) args.format = 'json';
    if (!args.hasOwnProperty('use_context')) args.use_context = true;
    if (!args.hasOwnProperty('show_gram')) args.show_gram = true;
    if (!args.hasOwnProperty('eng_gr')) args.eng_gr = true;
    if (!args.hasOwnProperty('join_info')) args.join_info = true;

    this.path = args.path || path.join(__dirname, '..', 'vendor', process.platform, 'mystem');
    this.args = args;
    this.handlers = [];
}

function buildOptions(args){
    var options = [];
    if (args.format) {
        options.push('--format');
        options.push(args.format);
    }

    if (args.use_context) options.push('-d');
    if (args.show_gram) options.push('-i');
    if (args.eng_gr) options.push('--eng-gr');
    if (args.join_info) options.push('-g');
    if (args.all_input) options.push('-c');
    if (args.dic_only) options.push('-w');
    if (args.no_source) options.push('-l');
    if (args.mark_end) options.push('-s');
    
    if (args.encoding) {
        options.push('-e');
        options.push(args.encoding);
    }

    if (args.fixlist) {
        options.push('--fixlist');
        options.push(args.fixlist);
    }

    if (args.filtergram) {
        options.push('--filter-gram');
        options.push(args.filtergram);
    }

    if (args.gen_all) options.push('--generate-all');
    if (args.weight) options.push('--weight');
    return options;
}



MyStem.prototype = {
    start: function() {
        if (this.mystemProcess) return;

        this.mystemProcess = childProcess.spawn(this.path, buildOptions(this.args));
        var rd = readline.createInterface({ input: this.mystemProcess.stdout, terminal: false });

        rd.on('line', function(line) {
            var handler = this.handlers.shift();

            if (handler) {
                var data = JSON.parse(line)
                handler.resolve( this[handler.func](data) || handler.def );
            }
        }.bind(this));

        this.mystemProcess.on('error', function(err) {
            var handler = this.handlers.shift();

            if (handler) {
                handler.reject(err);
            }
        }.bind(this));
        
        this._process_exit_func = function () {
          if (this.mystemProcess) {
              this.mystemProcess.kill();
          }
        }.bind(this); 

        process.on('exit', this._process_exit_func);
    },

    stop: function() {
        if (this.mystemProcess) {
            process.removeListener ('exit', this._process_exit_func);
            this.mystemProcess.kill();
            this.mystemProcess = null;
        }
    },
    
    analyze: function (text) {
        text = text.replace (/(\n|\r)+/g,' ');
        return new Promise(function(resolve, reject) {
            if (!this.mystemProcess) {
                throw 'You should call MyStem.start()';
            }
            this.mystemProcess.stdin.write(text + '\n');

            this.handlers.push({
                      resolve: resolve,
                      reject: reject,
                      def: null,
                      func:'_getData'
                  });
        }.bind(this));
    },

    lemmatize: function(word) {
        word = word.replace(/(\S+)\s+.*/, '$1'); // take only first word. TODO
        return new Promise(function(resolve, reject) {
            if (!this.mystemProcess) {
                throw 'You should call MyStem.start()';
            }

            this.mystemProcess.stdin.write(word + '\n');

            this.handlers.push({
                resolve: resolve,
                reject: reject,
                def: word,
                func:'_getLemma'
            });
        }.bind(this));
    },

    _getLemma: function(data) {
        if (!data[0]) return;
        return data[0].analysis.length ? data[0].analysis[0].lex : data[0].text;
    },
    
    _getData: function (data) {
      if (!data[0]) return;
      return data;
    }
};


module.exports = MyStem;
