this.Hull=this.Hull||{},this.Hull.templates=this.Hull.templates||{},this.Hull.templates._default=this.Hull.templates._default||{},Hull.templates._default["utils/property/property"]=function(t,e,l,s,r){this.compilerInfo=[4,">= 1.0.0"],l=this.merge(l,t.helpers),r=r||{};var o,p,i="",u="function",a=this.escapeExpression;return(p=l.property)?o=p.call(e,{hash:{},data:r}):(p=e&&e.property,o=typeof p===u?p.call(e,{hash:{},data:r}):p),i+=a(o)+"\n"},Hull.component("utils/property@hull",{type:"Hull",templates:["property"],datasources:{object:":id"},refreshEvents:["model.hull.me.change"],beforeRender:function(t){"use strict";var e=this.options.defaultText||"No value",l=this.findProp(t.object,this.options.property);return{property:void 0!==l?l:e}},findProp:function(t,e){"use strict";var l=e.split(".");return this.sandbox.util._.each(l,function(e){t=t?t[e]:void 0}),t}});