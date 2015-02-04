this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["developer/playground_editor/editor"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div data-hull-playground class=\"hull-playground-editor\"></div>\n<button class=\"btn btn-primary btn-large btn-block\" data-hull-action=\"run\">Run</button>\n";
  } ; 

Hull.component('developer/playground_editor@hull', {
    type: 'Hull',
    templates: ['editor'],
    require: ['codemirror-compressed'],
    initialize: function () {
        if (typeof CodeMirror === 'undefined') {
            throw 'Load CodeMirror before using this component.';
        }
        this.sandbox.on('hull.playground.load', this.sandbox.util._.bind(function (code) {
            this.editor.setValue(code);
        }, this));
    },
    afterRender: function () {
        var code = this.options.code || '';
        var theme = this.options.theme || 'default';
        this.editor = new CodeMirror(this.$('[data-hull-playground]')[0], {
            mode: 'htmlmixed',
            value: code,
            tabMode: 'indent',
            theme: theme,
            lineNumbers: false
        });
        this.run(code);
    },
    actions: {
        run: function () {
            this.run(this.editor.getValue());
        }
    },
    run: function (code) {
        this.sandbox.emit('hull.playground.run', code);
    }
});