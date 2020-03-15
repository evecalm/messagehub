import { IRouteParam, IContext as IComposieContext } from 'composie';
/** event callbacks map */
export interface IEvtCallbacks {
    [k: string]: ICallback[];
}
/** message request */
export interface IMessageRequest {
    /** request id */
    readonly id: number;
    /** request type */
    readonly type: 'request';
    /** message channel (aka custom event name) */
    readonly channel: string;
    /** message data which will be sent to the other side */
    readonly data: any;
    /** object to transfer */
    readonly transfers?: any[];
}
/** message response */
export interface IMessageResponse {
    /** request id */
    readonly id: number;
    /** request type */
    readonly type: 'response';
    /** is response successful */
    readonly resolved: boolean;
    /** request channel(custom event name) */
    readonly channel: string;
    /** responded data */
    readonly data: any;
    /**
     * original message event
     *  see https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent for details
     */
    readonly event: Event;
}
/** message union */
export declare type IMessage = IMessageRequest | IMessageResponse;
/** request context for middleware */
export interface IContext extends IComposieContext {
    /** request id, should not modify it */
    readonly id: number;
    /** request type  */
    readonly type: 'request';
    /**
     * original message event
     *  see https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent for details
     */
    readonly event: MessageEvent;
    /** response to the other side, this store the result you want to respond */
    response: any;
}
/** event callback */
export interface ICallback {
    (response: any): any;
}
/** middleware */
export interface IMiddleware {
    (ctx: IContext, next?: Function): any;
}
/** constructor init params for worker */
export interface IMsgInitWorker {
    type: 'worker';
    peer?: Worker;
}
/** constructor init params for frame */
export interface IMsgInitIframe {
    type: 'frame';
    peer: Window;
    targetOrigin?: string;
}
/** constructor init params */
export declare type IMsgInit = IMsgInitWorker | IMsgInitIframe;
/**
 * MessageHub Class
 */
export default class MessageHub {
    private count;
    private context;
    private peer;
    private type;
    private isWorker;
    private targetOrigin;
    private evtsCbs;
    private promisePairs;
    private composie;
    private isReady;
    constructor(options: IMsgInit);
    /**
     * wait for peer ready
     *  use it especially work with iframe
     * return a promise
     */
    ready(): Promise<MessageHub>;
    /**
     * add global middleware
     * @param cb middleware
     */
    use(cb: IMiddleware): this;
    /**
     * add router
     * @param routers router map
     */
    route(routers: IRouteParam): any;
    /**
     * add router
     * @param channel channel name
     * @param cbs channel handlers
     */
    route(channel: string, ...cbs: IMiddleware[]): any;
    /**
     * request other side for a response
     * @param channel channel name
     * @param data params to the channel
     * @param transfers object array want to transfer
     */
    fetch(channel: string, data?: any, transfers?: any[]): Promise<any>;
    /**
     * listen event from other side
     * @param channel channel name
     * @param cb callback function
     */
    on(channel: string, cb: ICallback): void;
    /**
     * remove event listener
     * @param channel channel name
     * @param cb callback function
     */
    off(channel: string, cb?: ICallback): void;
    /**
     * emit event that will be listened from on
     * @param channel channel name
     * @param data params
     * @param transfers object array want to transfer
     */
    emit(channel: string, data?: any, transfers?: any[]): void;
    destroy(): void;
    /**
     * create context used by middleware
     * @param evt message event
     */
    protected createContext(evt: MessageEvent): IContext;
    /**
     * listen original message event
     * @param evt message event
     */
    protected onMessage(evt: MessageEvent): void;
    /** respond fetch request */
    private respond;
    /** resolve fetch request */
    protected resolveFetch(msg: IMessage): true | undefined;
    /**
     * validate origin in cross frame communicate is match
     * @param origin origin url
     */
    protected isValidateOrigin(origin: any): boolean;
    protected postMessage(message: IMessage, needResp: true): Promise<any>;
    protected postMessage(message: IMessage, needResp?: false): void;
}