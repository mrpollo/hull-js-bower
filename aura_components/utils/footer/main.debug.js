this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["utils/footer/footer"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<footer class=\"wrapper featurette featurette-well project-footer\">\n  <div class=\"container\">\n    <div class=\"project-about\">\n      <div class=\"row\">\n        <div class=\"span6 offset1\">\n          <div class=\"media\">\n            <div class=\"pull-left\">\n              <h1 class=\"project-about-logo media-object\">hull</h1>\n            </div>\n            <div class=\"media-body\">\n              <h4 class=\"light-title light project-about-description\"> hull offers developers a complete platform to add social features to their apps quickly and easily. </h4>\n            </div>\n          </div>\n        </div>\n        <div class=\"span2 offset2 end text-right\">\n          <h6> <a href=\"http://github.com/hull/\">Fork us on GitHub</a> </h6>\n          <h6> <a href=\"http://twitter.com/hull/\">Follow us on Twitter</a> </h6>\n          <h6> <a href=\"http://hull.io\">Visit our website</a> </h6>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"row\"> <div class=\"span10 offset1\"> <hr> </div> </div>\n\n    <div class=\"row project-copyright\">\n      <div class=\"span5 offset1\">\n        <small> <a href=\"http://hull.io\"> Built with <span class=\"project-copyright-logo\">hull</span> </a> </small>\n      </div>\n      <div class=\"span5 end text-right\">\n        <small>Copyright 2013 Hull, Inc.</small>\n      </div>\n    </div>\n  </div>\n</footer>\n";
  } ; 

Hull.component('utils/footer@hull', {
    type: 'Hull',
    datasources: {},
    templates: ['footer'],
    actions: {}
});