'use strict';

var Promise      = require('bluebird');
var childProcess = require('child_process');
var readline     = require('readline');
var path         = require('path');

function MyStem(args) {
    args = args || {};


    this.path = args.path || path.join(__dirname, '..', 'vendor', process.platform, 'mystem');
    this.handlers = [];
}

MyStem.prototype = {
    start: function() {
        if (this.mystemProcess) return;

        this.mystemProcess = childProcess.spawn(this.path, ['--format', 'json', '--eng-gr', '-dig']);
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

        process.on('exit', function() {
            if (this.mystemProcess) {
                this.mystemProcess.kill();
            }
        }.bind(this));
    },

    stop: function() {
        if (this.mystemProcess) {
            this.mystemProcess.kill();
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
