// @flow

/**
 * An asynchronous WebSocket client.
 */
export default class WebSocketClient {

    /* private members */
    _socket: WebSocket;
    _closeEvent: ?CloseEvent;
    
    // The following data structures enable the asynchronous operation 
    // of receive() and _setupListenersOnConnect().
    _receiveCallbacksQueue: Array<{ resolve: (data: any) => void, reject: (reason: any) => void }>;
    _receiveDataQueue: Array<any>;
    
    constructor() {
        this._reset();
    }

    /* public properties */
    
    /**
     * Whether a connection is currently active.
     */
    get connected(): boolean {
        // Checking != null also checks against undefined.
        return this._socket != null && this._socket.readyState === WebSocket.OPEN;
    }
    
    /**
     * The number of messages available to receive.
     */
    get dataAvailable(): number {
        return this._receiveDataQueue.length;
    }

    /**
     * Sets up a TCP connection to specified host and port. Resolves when the 
     * connection is established.
     * Can be called again to reconnect, to the same or even a different url.
     */
    async connect(url: string, protocols?: string): Promise<void> {
        await this.disconnect();
        this._reset();

        this._socket = new WebSocket(url, protocols);
        this._socket.binaryType = 'arraybuffer';

        await this._setupListenersOnConnect();
    }

    /**
     * Send data through the websocket.
     */
    send(data: any) {
        if (!this.connected) {
            throw this._closeEvent || new Error('Not connected.');
        }
        
        this._socket.send(data);
    }

    /**
     * Asynchronously receive data from the websocket.
     * Resolves immediately if there is buffered, unreceived data.
     * Otherwise, resolves with the next rececived message, 
     * or rejects if disconnected.
     */
    async receive(): Promise<any> {
        if (this._receiveDataQueue.length !== 0) {
            return this._receiveDataQueue.shift();
        }

        if (!this.connected) {
            throw this._closeEvent || new Error('Not connected.');
        }

        const receivePromise: Promise<any> = new Promise((resolve, reject) => {
            this._receiveCallbacksQueue.push({ resolve, reject });
        });

        return await receivePromise;
    }

    /**
     * Initiates the close handshake if there is an active connection.
     * Returns a promise that will never reject.
     * The promise resolves once the WebSocket is closed.
     * @param {*} code 
     * @param {*} reason 
     */
    async disconnect(code?: number, reason?: string): Promise<?CloseEvent> {
        if (!this.connected) {
            return this._closeEvent;
        }

        return await new Promise((resolve, reject) => {
            // It's okay to call resolve/reject multiple times in a promise.
            const callbacks = { 
                resolve: dummy => {
                    // Make sure this object always stays in the queue
                    // until callbacks.reject() (which is resolve) is called.
                    this._receiveCallbacksQueue.push(callbacks);
                },
                
                reject: resolve
            };
            
            this._receiveCallbacksQueue.push(callbacks);
            // After this, we will imminently get a close event.
            // Therefore, this promise will resolve.
            this._socket.close(code, reason);
        });
    }

    /**
     * Sets up the event listeners, which do the bulk of the work.
     * @private
     */
    async _setupListenersOnConnect(): Promise<void> {
        const socket = this._socket;

        await new Promise((resolve, reject) => {

            const handleMessage: EventListener = event => {
                const messageEvent: MessageEvent = ((event: any): MessageEvent);
                // The cast was necessary because Flow's libdef's don't contain
                // a MessageEventListener definition.

                if (this._receiveCallbacksQueue.length !== 0) {
                    this._receiveCallbacksQueue.shift().resolve(messageEvent.data);
                    return;
                }
                
                this._receiveDataQueue.push(messageEvent.data);
            };

            const handleOpen: EventListener = event => {
                socket.addEventListener('message', handleMessage);
                socket.addEventListener('close', event => { 
                    this._closeEvent = ((event: any): CloseEvent);
                    
                    // Whenever a close event fires, the socket is effectively dead.
                    // It's impossible for more messages to arrive.
                    // If there are any promises waiting for messages, reject them.
                    while (this._receiveCallbacksQueue.length !== 0) {
                        this._receiveCallbacksQueue.shift().reject(this._closeEvent);
                    }
                });
                resolve();
            };

            socket.addEventListener('error', reject);
            socket.addEventListener('open', handleOpen);
        });
    }
    
    /**
     * @private
     */
    _reset() {
        this._receiveDataQueue = [];
        this._receiveCallbacksQueue = [];
        this._closeEvent = null;
    }
}
