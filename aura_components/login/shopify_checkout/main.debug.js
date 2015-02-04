this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["login/shopify_checkout/main"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  <div class=\"hull-checkout hull-checkout-dropdown\">\n    <div class=\"hull-checkout-section hull-checkout-section-quick\">\n      <h3 class=\"hull-checkout-title\" style=\"color: "
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.options)),stack1 == null || stack1 === false ? stack1 : stack1.mainColor)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + ";\">Quick Checkout</h3>\n      <p class=\"hull-checkout-subtitle\">Fill-in my details with</p>\n      <div data-hull-component=\"login/shopify@hull\"\n           data-hull-sign-in-message=\"{{provider}}\"\n           data-hull-redirect-on-login=\"false\"\n           data-hull-show-link-identity=\"false\"\n           data-hull-show-sign-out=\"false\"\n           data-hull-show-loader=\"false\"\n           data-hull-inject-link-tag=\"false\"></div>\n    </div>\n    <div class=\"hull-checkout-section hull-checkout-section-regular\">\n      <a class=\"hull-checkout-regular\" href=\"#\" data-hull-action=\"checkout\">Regular checkout</a>\n    </div>\n  </div>\n";
  return buffer;
  }

  stack1 = helpers.unless.call(depth0, (depth0 && depth0.loggedIn), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  } ; 

Hull.component('login/shopify_checkout@hull', {
    templates: ['main'],
    refreshEvents: ['model.hull.me.change'],
    linkTagInjected: false,
    initialize: function () {
        if (this.options.target != null) {
            this.$target = $(this.options.target);
            if (this.$target.length !== 1) {
                this.error('"' + this.options.target + '" selector must match only one element. (matched: ' + this.$target.length + ')');
            }
        } else {
            var $input = $('input[name="checkout"]');
            this.$target = $input.length ? $input : $('#checkout');
            if (this.$target.length !== 1) {
                this.error('Default selectors does not match any element');
            }
        }
        this.sandbox.on('hull.auth.login', this.targetClick, this);
        this.sandbox.on('hull.auth.fail', this.targetClick, this);
        this.injectLinkTag();
    },
    error: function (message) {
        window.console && console.error && console.error(message);
    },
    beforeRender: function () {
        this.$el.hide();
        this.$el.detach();
    },
    afterRender: function () {
        this.$dropdown = this.$('.hull-checkout-dropdown');
        var self = this;
        this.$dropdown.on('mouseenter', function () {
            self.enter();
        });
        this.$dropdown.on('mouseleave', function () {
            self.leave();
        });
        this.$target.on('mouseenter', function () {
            self.enter();
        });
        this.$target.on('mouseleave', function () {
            self.leave();
        });
    },
    targetClick: function () {
        this.hide();
        this.$target.click();
    },
    enter: function () {
        clearTimeout(this.timer);
        this.timer = null;
        if (this.loggedIn()) {
            return;
        }
        this.computePosition();
        this.show();
    },
    leave: function () {
        var self = this;
        this.timer = setTimeout(function () {
            self.hide();
        }, 200);
    },
    show: function () {
        this.$el.fadeIn(200);
    },
    hide: function () {
        this.$el.fadeOut(200);
    },
    computePosition: function () {
        this.$el.offset({
            top: -100000,
            left: -100000
        });
        this.$el.appendTo('body');
        var offset = this.$target.offset();
        var css = {
                position: 'absolute',
                left: offset.left - this.$dropdown.width() / 2 + this.$target.outerWidth() / 2
            };
        if (offset.top - $(window).scrollTop() >= this.$dropdown.outerHeight()) {
            this.$dropdown.addClass('hull-dropdown-above');
            this.$dropdown.removeClass('hull-dropdown-behind');
            css.top = offset.top - this.$dropdown.outerHeight(true) - 10 - parseInt($('html').css('marginTop'), 10);
        } else {
            this.$dropdown.addClass('hull-dropdown-behind');
            this.$dropdown.removeClass('hull-dropdown-above');
            css.top = offset.top + this.$target.outerHeight() + 10 - parseInt($('html').css('marginTop'), 10);
        }
        this.$el.css(css);
    },
    actions: {
        checkout: function () {
            this.$target.click();
        }
    },
    injectLinkTag: function () {
        if (this.linkTagInjected || this.options.injectLinkTag === false) {
            return;
        }
        var e = document.createElement('link');
        e.href = this.options.baseUrl + '/style.css';
        e.rel = 'stylesheet';
        document.getElementsByTagName('head')[0].appendChild(e);
        this.linkTagInjected = true;
    }
});