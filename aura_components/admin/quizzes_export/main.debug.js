this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["admin/quizzes_export/main"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<form class=\"form\">\n  <div class=\"control-group\">\n    <label class=\"control-label\" for=\"hull-email\">Email where the report will be sent:</label>\n    <div class=\"controls\">\n      <input id=\"hull-email\" type=\"email\" required>\n    </div>\n  </div>\n\n  <div class=\"form-actions\">\n    <button data-hull-action=\"extract\" class=\"btn btn-primary btn-large\">Export</button>\n  </div>\n</form>\n";
  } ; 

Hull.component('admin/quizzes_export@hull', {
    templates: ['main'],
    datasources: {
        quizzes: {
            path: 'app/achievements',
            params: { where: { _type: 'Quiz' } }
        }
    },
    beforeRender: function (data) {
        var _ = this.sandbox.util._;
        var fields = [
                'user_id',
                [
                    'name',
                    'Name'
                ],
                [
                    'email',
                    'Email'
                ]
            ];
        if (_.isArray(data.app.extra.profile_fields)) {
            _.each(data.app.extra.profile_fields, function (f) {
                if (f.name == null || f.label == null)
                    return;
                key = [
                    'apps',
                    data.app.id,
                    'profile',
                    f.name
                ].join('.');
                value = f.label + ' (registration form)';
                fields.push([
                    key,
                    value
                ]);
            });
        }
        _.each(data.quizzes, function (q) {
            _.each([
                [
                    'best_score',
                    'Score'
                ],
                [
                    'data.timing',
                    'Timing'
                ],
                [
                    'stats.attempts',
                    'Attempts'
                ]
            ], function (k) {
                key = [
                    'apps',
                    data.app.id,
                    'badges',
                    q.id,
                    k[0]
                ].join('.');
                value = k[1] + ' (quiz: ' + q.name + ')';
                fields.push([
                    key,
                    value
                ]);
            });
        });
        this.fields = fields;
    },
    actions: {
        extract: function (event, action) {
            var email = this.$('input[type="email"]').val();
            this.api('app/user_reports/extracts', 'post', {
                email: email,
                fields: this.fields
            }).always(function (r) {
                alert(r.message);
            });
        }
    }
});