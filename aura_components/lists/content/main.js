this.Hull=this.Hull||{},this.Hull.templates=this.Hull.templates||{},this.Hull.templates._default=this.Hull.templates._default||{},Hull.templates._default["lists/content/content"]=function(t,n,e,a,l){function s(t,n){var a,l="";return l+='\n  <ul class="nav nav-tabs nav-stacked">\n    ',a=e.each.call(t,t&&t.items,{hash:{},inverse:c.noop,fn:c.program(2,i,n),data:n}),(a||0===a)&&(l+=a),l+="\n  </ul>\n"}function i(t,n){var l,s="";return s+="\n      <li>",l=c.invokePartial(a["lists/contents/item"],"lists/contents/item",t,e,a,n),(l||0===l)&&(s+=l),s+="</li>\n    "}function r(){return'\n  <div data-hull-component="login/button@hull"></div>\n'}this.compilerInfo=[4,">= 1.0.0"],e=this.merge(e,t.helpers),a=this.merge(a,t.partials),l=l||{};var o,d="",c=this;return o=e["if"].call(n,n&&n.loggedIn,{hash:{},inverse:c.program(4,r,l),fn:c.program(1,s,l),data:l}),(o||0===o)&&(d+=o),d+="\n"},Hull.templates._default["lists/content/item"]=function(t,n,e,a,l){function s(t,n){var a,l,s="";return s+="\n    <dt>Name</dt>\n    <dd>",(l=e.name)?a=l.call(t,{hash:{},data:n}):(l=t&&t.name,a=typeof l===c?l.call(t,{hash:{},data:n}):l),s+=h(a)+"</dd>\n  "}function i(t,n){var a,l,s="";return s+="\n    <dt>Description</dt>\n    <dd>",(l=e.description)?a=l.call(t,{hash:{},data:n}):(l=t&&t.description,a=typeof l===c?l.call(t,{hash:{},data:n}):l),s+=h(a)+"</dd>\n  "}this.compilerInfo=[4,">= 1.0.0"],e=this.merge(e,t.helpers),l=l||{};var r,o,d="",c="function",h=this.escapeExpression,u=this;return d+="<a>\n  <dl>\n  ",r=e["if"].call(n,n&&n.name,{hash:{},inverse:u.noop,fn:u.program(1,s,l),data:l}),(r||0===r)&&(d+=r),d+="\n  ",r=e["if"].call(n,n&&n.description,{hash:{},inverse:u.noop,fn:u.program(3,i,l),data:l}),(r||0===r)&&(d+=r),d+="\n    <dt>ID</dt>\n    <dd>",(o=e.id)?r=o.call(n,{hash:{},data:l}):(o=n&&n.id,r=typeof o===c?o.call(n,{hash:{},data:l}):o),d+=h(r)+"</dd>\n  </dl>\n</a>\n"},Hull.component("lists/content@hull",{type:"Hull",templates:["content","item"],datasources:{content:"me/lists/:list"},requiredOptions:["list"],refreshEvents:["model.hull.me.change"],beforeRender:function(t){"use strict";var n=t.content||{};t.items=n.items}});