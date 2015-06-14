var log = function (msg) { console.log(msg); };

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var client_id = process.env.CLIENT_ID; // Your client id
var client_secret = process.env.CLIENT_SECRET; // Your client secret

log(client_id);
log(client_secret);

var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

var stateKey = 'github_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
    .use(cookieParser());

app.get('/login', function(req, res) {
    log('at /login');

    var state = generateRandomString(16);
    res.cookie(stateKey, state);

    // your application requests authorization
    var scope = 'repo';
    var url = 'https://github.com/login/oauth/authorize?' +
        querystring.stringify({
            client_id: client_id,
            scope: scope,
            state: state // an 'unguessable random string'
        });
    log('redirect_uri: ' + url);
    res.redirect(url);
});

app.get('/callback', function(req, res) {
    log('at /callback');

    // your application requests refresh and access tokens
    // after checking the state parameter

    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie(stateKey);
        var authOptions = {
            url: 'https://github.com/login/oauth/access_token',
            form: {
                client_id: client_id,
                client_secret: client_secret,
                code: code,
            },
        };

        request.post(authOptions, function(error, response, body) {
            if (!error && response.statusCode === 200) {
                body = querystring.parse(body);
                log(body);
                var access_token = body.access_token;

                res.redirect('http://helpticket.herokuapp.com/?' +
                 querystring.stringify({
                 access_token: access_token
                 }));
            } else {
                log('errored');
                res.redirect('/#' +
                    querystring.stringify({
                        error: 'invalid_token'
                    }));
            }
        });
    }
});

app.listen(process.env.PORT || 8080);
