const Logger = require("../Logger");
const EnhancedEventEmitter = require("../EnhancedEventEmitter");
const WebSocketIOTransport = require("./WebSocketIOTransport");
const socketio = require("socket.io");

const WS_SUBPROTOCOL = "protoo";

const logger = new Logger("WebSocketIOServer");

class WebSocketIOServer extends EnhancedEventEmitter {
  /**
   * @param {http.Server} httpServer - Node HTTP/HTTPS compatible server.
   * @param {Object} [options] - Options for WebSocket-Node.WebSocketIOServer.
   *
   * @emits {info: Object, accept: Function, reject: Function} connectionrequest
   */
  constructor(httpServer, options) {
    super(logger);

    logger.debug("constructor() [option:%o]", options);

    // Merge some settings into the given options.
    options = Object.assign(
      {},
      options);

    // Run a WebSocket server instance.
    // @type {WebSocket-Node.WebSocketIOServer}
    //https://socket.io/docs/v4/server-api/#new-Server-httpServer-options
    this._wsServer = socketio(httpServer, options);
    this._wsServer.on("connection", (socket) => {
      console.log("a user connected");
      this._onConnection(socket);
    });
  }

  /**
   * Stop listening for protoo WebSocket connections. This method does NOT
   * close the HTTP/HTTPS server.
   */
  stop() {
    logger.debug("stop()");

    // Don't close the given http.Server|https.Server but just unmount the
    // WebSocket server.
    this._wsServer.close();
  }

  _onConnection(socket) {
    // If there are no listeners, reject the request.
    if (this.listenerCount("connectionrequest") === 0) {
      logger.error("_onRequest() | no listeners for \"connectionrequest\" event, " +
        "rejecting connection request");
      throw new Error("no listeners for \"connectionrequest\" event");
    }

    let replied = false;

    try {
      console.log("query :",socket.handshake.query);
      // Emit 'connectionrequest' event.
      this.emit("connectionrequest",
        {
          query: socket.handshake.query,
          socket: socket
        },
        // accept() function.
        () => {
          if (replied) {
            logger.warn("_onRequest() | cannot call accept(), connection request already replied");
            return;
          }
          replied = true;
          // Create a new Protoo WebSocket transport.
          const transport = new WebSocketIOTransport(this._wsServer, socket);
          logger.debug("_onRequest() | accept() called");
          return transport;
        },
        // reject() function.
        (code, reason) => {
          if (replied) {
            logger.warn("_onRequest() | cannot call reject(), connection request already replied");
            return;
          }

          if (code instanceof Error) {
            code = 500;
            reason = String(code);
          } else if (reason instanceof Error) {
            reason = String(reason);
          }

          replied = true;
          code = code || 403;
          reason = reason || "Rejected";

          logger.debug("_onRequest() | reject() called [code:%s | reason:\"%s\"]", code, reason);
        });
    } catch (error) {
      logger.error(String(error));
    }
  }
}

module.exports = WebSocketIOServer;
