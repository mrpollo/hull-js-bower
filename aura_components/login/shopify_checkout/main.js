this.Hull=this.Hull||{},this.Hull.templates=this.Hull.templates||{},this.Hull.templates._default=this.Hull.templates._default||{},Hull.templates._default["login/shopify_checkout/main"]=function(t,e,o,i,n){function l(t){var e,o="";return o+='\n  <div class="hull-checkout hull-checkout-dropdown">\n    <div class="hull-checkout-section hull-checkout-section-quick">\n      <h3 class="hull-checkout-title" style="color: '+r((e=t&&t.options,e=null==e||e===!1?e:e.mainColor,typeof e===a?e.apply(t):e))+';">Quick Checkout</h3>\n      <p class="hull-checkout-subtitle">Fill-in my details with</p>\n      <div data-hull-component="login/shopify@hull"\n           data-hull-sign-in-message="{{provider}}"\n           data-hull-redirect-on-login="false"\n           data-hull-show-link-identity="false"\n           data-hull-show-sign-out="false"\n           data-hull-show-loader="false"\n           data-hull-inject-link-tag="false"></div>\n    </div>\n    <div class="hull-checkout-section hull-checkout-section-regular">\n      <a class="hull-checkout-regular" href="#" data-hull-action="checkout">Regular checkout</a>\n    </div>\n  </div>\n'}this.compilerInfo=[4,">= 1.0.0"],o=this.merge(o,t.helpers),n=n||{};var s,h="",a="function",r=this.escapeExpression,c=this;return s=o.unless.call(e,e&&e.loggedIn,{hash:{},inverse:c.noop,fn:c.program(1,l,n),data:n}),(s||0===s)&&(h+=s),h+="\n"},Hull.component("login/shopify_checkout@hull",{templates:["main"],refreshEvents:["model.hull.me.change"],linkTagInjected:!1,initialize:function(){if(null!=this.options.target)this.$target=$(this.options.target),1!==this.$target.length&&this.error('"'+this.options.target+'" selector must match only one element. (matched: '+this.$target.length+")");else{var t=$('input[name="checkout"]');this.$target=t.length?t:$("#checkout"),1!==this.$target.length&&this.error("Default selectors does not match any element")}this.sandbox.on("hull.auth.login",this.targetClick,this),this.sandbox.on("hull.auth.fail",this.targetClick,this),this.injectLinkTag()},error:function(t){window.console&&console.error&&console.error(t)},beforeRender:function(){this.$el.hide(),this.$el.detach()},afterRender:function(){this.$dropdown=this.$(".hull-checkout-dropdown");var t=this;this.$dropdown.on("mouseenter",function(){t.enter()}),this.$dropdown.on("mouseleave",function(){t.leave()}),this.$target.on("mouseenter",function(){t.enter()}),this.$target.on("mouseleave",function(){t.leave()})},targetClick:function(){this.hide(),this.$target.click()},enter:function(){clearTimeout(this.timer),this.timer=null,this.loggedIn()||(this.computePosition(),this.show())},leave:function(){var t=this;this.timer=setTimeout(function(){t.hide()},200)},show:function(){this.$el.fadeIn(200)},hide:function(){this.$el.fadeOut(200)},computePosition:function(){this.$el.offset({top:-1e5,left:-1e5}),this.$el.appendTo("body");var t=this.$target.offset(),e={position:"absolute",left:t.left-this.$dropdown.width()/2+this.$target.outerWidth()/2};t.top-$(window).scrollTop()>=this.$dropdown.outerHeight()?(this.$dropdown.addClass("hull-dropdown-above"),this.$dropdown.removeClass("hull-dropdown-behind"),e.top=t.top-this.$dropdown.outerHeight(!0)-10-parseInt($("html").css("marginTop"),10)):(this.$dropdown.addClass("hull-dropdown-behind"),this.$dropdown.removeClass("hull-dropdown-above"),e.top=t.top+this.$target.outerHeight()+10-parseInt($("html").css("marginTop"),10)),this.$el.css(e)},actions:{checkout:function(){this.$target.click()}},injectLinkTag:function(){if(!this.linkTagInjected&&this.options.injectLinkTag!==!1){var t=document.createElement("link");t.href=this.options.baseUrl+"/style.css",t.rel="stylesheet",document.getElementsByTagName("head")[0].appendChild(t),this.linkTagInjected=!0}}});