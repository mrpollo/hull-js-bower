this.Hull=this.Hull||{},this.Hull.templates=this.Hull.templates||{},this.Hull.templates._default=this.Hull.templates._default||{},Hull.templates._default["developer/playground_result/result"]=function(t,l,e,s,i){this.compilerInfo=[4,">= 1.0.0"],e=this.merge(e,t.helpers),i=i||{};var u,o,d="",n="function";return d+='<div class="hull-playground-result">\n  ',(o=e.code)?u=o.call(l,{hash:{},data:i}):(o=l&&l.code,u=typeof o===n?o.call(l,{hash:{},data:i}):o),(u||0===u)&&(d+=u),d+="\n</div>\n"},Hull.component("developer/playground_result@hull",{type:"Hull",templates:["result"],initialize:function(){this.code=this.options.code||"",this.sandbox.on("hull.playground.run",this.sandbox.util._.bind(this.updateCode,this)),this.sandbox.on("hull.playground.load",this.sandbox.util._.bind(this.updateCode,this))},beforeRender:function(t){t.code=this.code},updateCode:function(t){this.code=t,this.render()}});