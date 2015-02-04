this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["share/button/button"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n  <a class='btn btn-small btn-";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "' href=\"";
  if (helper = helpers.link) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.link); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" target='_blank' data-hull-action='share' title=\"Share on ";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\n  <i class='icon icon-";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "'></i>\n  "
    + escapeExpression((helper = helpers.capitalize || (depth0 && depth0.capitalize),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0.name), options) : helperMissing.call(depth0, "capitalize", (depth0 && depth0.name), options)))
    + "\n  </a>\n";
  return buffer;
  }

  stack1 = helpers.each.call(depth0, (depth0 && depth0.buttons), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  } ; 

Hull.component('share/button@hull', {
    type: 'Hull',
    templates: ['button'],
    options: {
        text: 'Hull.io Rocks',
        url: 'http://hull.io',
        providers: 'facebook,twitter,linkedin,google'
    },
    requiredOptions: [
        'text',
        'url'
    ],
    sharers: {
        facebook: {
            sharer: 'http://facebook.com/sharer/sharer.php?',
            url: 'u',
            text: ''
        },
        twitter: {
            sharer: 'http://twitter.com/intent/tweet?',
            url: 'url',
            text: 'text'
        },
        linkedin: {
            sharer: 'http://www.linkedin.com/shareArticle?mini=true&',
            url: 'url',
            text: 'title'
        },
        google: {
            sharer: 'https://plus.google.com/share?',
            url: 'url',
            text: ''
        }
    },
    beforeRender: function (data) {
        var self = this;
        var _ = this.sandbox.util._;
        data.text = encodeURIComponent(this.options.text);
        data.url = encodeURIComponent(this.options.url);
        var providers = this.options.providers.replace(' ', '').split(',');
        if (!providers.length) {
            providers = _.keys(this.sharers);
        }
        var buttons = _.map(providers, function (p) {
                var s = self.sharers[p];
                var link = s.sharer;
                if (s.url) {
                    link += s.url + '=' + data.url;
                }
                if (s.text) {
                    link += '&' + s.text + '=' + data.text;
                }
                return {
                    name: p,
                    link: link
                };
            });
        data.buttons = buttons;
        return data;
    },
    actions: {
        share: function (e, data) {
            var url = e.target.href;
            var provider = e.target.rel;
            var width = 500;
            var height = 350;
            window.open(url, provider, 'status=no,height=' + height + ',width=' + width + ',resizable=yes,toolbar=no,menubar=no,scrollbars=no,location=no,directories=no');
            this.track('hull.share.open', {
                url: url,
                provider: provider
            });
        }
    }
});