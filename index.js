var restify = require ('restify');
const util = require ('util');
const restifyErrors = require ('restify-errors');
const socketio = require ('socket.io');

/*
External functions and classes
*/
class MyError {
  constructor (props) {
    this.message = 'this is my error';
    this.toJSON = function (message) {
      return {
        a: '1111',
        b: 'im JSON Error',
        c: 'Yes he is 👆🏻',
      };
    };
  }
}

function sendV1 (req, res, next) {
  console.log ('v1');
  res.send ('hello: ' + req.params.name);
  return next ();
}

function sendV2 (req, res, next) {
  console.log ('v2');
  res.send ({hello: req.params.name});
  return next ();
}

function sendV3 (req, res, next) {
  console.log ('v3');
  res.send ({hello: req.params.name + 'olhlalalal'});
  return next ();
}

/*
Init
*/
var server = restify.createServer ({
  formatters: {
    'application/foo': function formatFoo (req, res, body, cb) {
      if (body instanceof Error) return body.stack;
      if (Buffer.isBuffer (body)) return cb (null, body.toString ('base64'));
      return cb (null, util.inspect (body));
    },
  },
});
var io = socketio.listen (server.server);

/*
Pre
*/
server.pre (restify.pre.userAgentConnection ());

/*
Middleware
*/
server.use (function (req, res, next) {
  console.log ('in middleware');
  next ();
});

/*
Event listeners
*/
io.sockets.on ('connection', function (socket) {
  console.log ('socket connection');
  socket.emit ('news', {hello: 'world'});
  socket.on ('my other event', function (data) {
    console.log (data);
  });
  socket.on ('disconnect', function () {
    console.log ('socket disconnect');
  });
});

server.on ('NotFound', function (req, res, err, cb) {
  // do not call res.send! you are now in an error context and are outside
  // of the normal next chain. you can log or do metrics here, and invoke
  // the callback when you're done. restify will automtically render the
  // NotFoundError as a JSON response.
  return cb ();
});

server.on ('restifyError', function (req, res, err, cb) {
  // if you don't want restify to automatically render the Error object
  // as a JSON response, you can customize the response by setting the
  // `body` property of the error
  err.body = '<html><body>some custom error content!</body></html>';
  return cb ();
});

server.on ('uncaughtException', function (req, res, err, cb) {
  // this listener will fire after both events above!
  // `err` here is the same as the error that was passed to the above
  // error handlers.
  res.send (500, err.name);
});

/*
REST API
*/

server.get ('/hello/:name', function (req, res, next) {
  res.send ('Hello ' + req.params.name);
});

// server.get('/websocket/attach', function upgradeRoute(req, res, next) {
//   if (!res.claimUpgrade) {
//     next(new Error('Connection Must Upgrade For WebSockets'));
//     return;
//   }
//   var upgrade = res.claimUpgrade();
//   var shed = ws.accept(req, upgrade.socket, upgrade.head);
//   shed.on('text', function(msg) {
//     console.log('Received message from websocket client: ' + msg);
//   });
//   shed.send('hello there!');

//   next(false);
// });

var PATH = '/helloVer/:name';
server.get ({path: PATH, version: '1.1.3'}, sendV1);
server.get ({path: PATH, version: '2.0.0'}, sendV2);
server.get ({path: PATH, version: '1.0.0'}, sendV3);

server.get (
  'twoHandlers',
  function (req, res, next) {
    console.log ('in first handler');
    return next ();
  },
  function (req, res, next) {
    console.log ('in second handler');
    res.send (200);
    return next ();
  }
);

server.get ('/base64', function (req, res, next) {
  res.setHeader ('content-type', 'application/foo');
  res.send ({hello: 'world'});
});

server.get ({name: 'city', path: '/cities/:slug'}, function (req, res, next) {
  console.log (req);
  res.send ('im here!');
});

server.get ('/countryDetails', function (req, res, next) {
  res.send ({
    country: 'Australia',
    // render a URL by specifying the route name and parameters
    capital: server.router.render ('city', {slug: 'canberra'}, {details: true}),
  });
});

server.get ('/internalError', function (req, res, next) {
  throw new restify.errors.InternalServerError ('oh noes!');
});

server.get ('/notFoundError', function (req, res, next) {
  return next (new restify.errors.NotFoundError ('oh noes!'));
});

server.get ('/badGatewayError', function (req, res, next) {
  var err = new restifyErrors.BadGatewayError ('bad gateway!');
  return next (err);
});

server.get ('/dynamicError', function (req, res, next) {
  res.send (new restifyErrors.GoneError ('gone girl'));
  return next ();
});

server.get ('/myErr', function (req, res, next) {
  res.send (new MyError ('where is my msg?'));
  return next ();
});

server.get (/^\/([a-zA-Z0-9_\.~-]+)\/(.*)/, function (req, res, next) {
  console.log (req.params[0]);
  console.log (req.params[1]);
  res.send (200);
  return next ();
});

/*
Server start
*/
server.listen (8080, function () {
  console.log ('%s listening at %s', server.name, server.url);
});
