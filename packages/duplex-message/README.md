<h1 align="center">Duplex-Message</h1>

<div align="center">
  <a href="https://github.com/oe/duplex-message/actions">
    <img src="https://github.com/oe/duplex-message/actions/workflows/main.yml/badge.svg" alt="github actions">
  </a>
  <a href="#readme">
    <img src="https://badgen.net/badge/Built%20With/TypeScript/blue" alt="code with typescript" height="20">
  </a>
  <a href="#readme">
    <img src="https://badge.fury.io/js/duplex-message.svg" alt="npm version" height="20">
  </a>
  <a href="https://www.npmjs.com/package/duplex-message">
    <img src="https://img.shields.io/npm/dm/duplex-message.svg" alt="npm downloads" height="20">
  </a>
</div>


<h5 align="center">A tinny(~2kb) utility that can simplify cross window / iframes / workers communications, and even with progress feedback support.</h5>

## 📝 Table of Contents
- [📝 Table of Contents](#-table-of-contents)
- [Features](#features)
- [Install](#install)
- [Example](#example)
- [Usage](#usage)
  - [PostMessageHub](#postmessagehub) for windows / iframes / workers messaging
    - [postMessageHub.emit](#postmessagehubemit)
    - [postMessageHub.on](#postmessagehubon)
    - [progress for PostMessageHub](#progress-for-postmessagehub)
    - [postMessageHub.off](#postmessagehuboff)
    - [postMessageHub.createDedicatedMessageHub](#postmessagehubcreatededicatedmessagehub)
    - [postMessageHub.createProxy](#postmessagehubcreateproxy)
  - [StorageMessageHub](#storagemessagehub) for windows' with same origin's messaging
    - [storageMessageHub.emit](#storagemessagehubemit)
    - [storageMessageHub.on](#storagemessagehubon)
    - [storageMessageHub.getPeerIdentifies](#storagemessagehubgetpeeridentifies)
    - [progress for storageMessageHub](#progress-for-storagemessagehub)
    - [storageMessageHub.off](#storagemessagehuboff)
  - [PageScriptMessageHub](#pagescriptmessagehub) for script with isolated js context messaging in same window
    - [pageScriptMessageHub.emit](#pagescriptmessagehubemit)
    - [pageScriptMessageHub.on](#pagescriptmessagehubon)
    - [progress for PageScriptMessageHub](#progress-for-pagescriptmessagehub)
    - [pageScriptMessageHub.off](#pagescriptmessagehuboff)
  - [Error](#error)

## Features
* **Simple API**: `on` `emit` `off` are all you need
* **Responsible**: `emit` will return a promise with the response from the other side
* **Progress feedback**: get response with progress feedback easily
* **Multi-scenario**: using it via `postMessage` 、 `storage` event or  customEvent on varied situations
* **Tinny**: less than 3kb gzipped(even smaller with tree-shaking), no external dependencies required
* **Consistency**: same api every where 
* **Typescript support**: this utility is written in typescript, has type definition inborn

It also has an electron version that can simplify IPC messaging, check [Simple-Electron-IPC
](https://github.com/oe/duplex-message/tree/master/packages/simple-electron-ipc) for more details.

## Install
using yarn
```sh
yarn add duplex-message
```

or npm
```sh
npm install duplex-message -S
```

## Example

The following example shows you how to use it to make normal window and its iframe communicate easily

in main window
```js
import { PostMessageHub } from "duplex-message"

const postMessageHub = new PostMessageHub()

// get child iframe's window, peerWin could be `self.parent` or `new Worker('./worker.js')`
const iframeWin = document.getElementById('child-iframe-1').contentWindow

// ----- listen messages from peer ----

// listen the message pageTitle from iframeWin, and respond it
postMessageHub.on(iframeWin, 'pageTitle', () => {
  return document.title
})
//  respond to message getHead from iframeWin2
postMessageHub.on(iframeWin, 'add', async (a, b) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(a + b)
    }, 1000)
  })
})

// listen multi messages by passing a handler map
postMessageHub.on(iframeWin, {
  // mock a download
  download (msg) {
    return new Promise((resolve, reject) => {
      let progress = 0
      const tid = setInterval(() => {
        if (progress >= 100) {
          clearInterval(tid)
          return resolve('done')
        }
        // send progress if msg has onprogress property
        msg.onprogress && msg.onprogress({progress: progress += 10})
      }, 200)
    })
  },
  method2() {}
})

// ---- send message to peer ---
// send a message to iframeWin1, and get the response by `.then`
postMessageHub.emit(iframeWin1, "fib", 10).then(resp => {
  console.log("fibonacci of 10 is", resp)
})

// sending a message not handled by the peer will catch an error
postMessageHub.emit(iframeWin1, "some-not-existing-method").then(resp => {
  console.log('response', resp) // this won't run
}).catch(err => {
  console.warn('error', err) // bang!
})
```

in iframe window

```js
import { PostMessageHub } from "duplex-message"

const postMessageHub = new PostMessageHub()
const peerWin = window.parent


// send a message to the parent and get its response
postMessageHub.emit(peerWin, "pageTitle").then(title => {
  console.log("page title of main thread", title)
})

// create a dedicated message hub, so you won't need to pass `peerWin` every time
const dedicatedMessageHub = postMessageHub.createDedicatedMessageHub(peerWin)

// send message to the parent, don't need the response
dedicatedMessageHub.emit("add", 1, 3).then(res => console.log(res))

dedicatedMessageHub.emit("download", {
  // pass onprogress so it can receive progress updates
  onprogress: (p) => console.log('progress', p)
}).then(res => console.log(res))


// calc fibonacci, respond by a return
dedicatedMessageHub.on("fib", async (num) => {
  // emit a message and wait its response
  const title = await dedicatedMessageHub.emit("pageTitle")
  console.log(title)
  return fib(num)
});


// use a recursive algorithm which will take more than half a minute when n big than 50
function fib(n) {
  if (n < 2) return n
  return fib(n - 1) + fib(n - 2)
}
```
## Usage

### PostMessageHub
`PostMessageHub` works in browser and use `postMessage` under the hood, it enable you:
1. communicate between multi **windows / iframes / workers / window.openers** easily at the same time
2. listen and respond messages with the same code.


When to use it:  
> 1. you have iframes / workers / windows opened by another window
> 2. you need to communicate between them.

`PostMessageHub` is a class, `new` an instance in every peer before using it 
```js
import { PostMessageHub } from "duplex-message"

const postMessageHub = new PostMessageHub()
```


#### postMessageHub.emit
Send a message to peer, invoking `methodName` registered on the peer via [`on`](#postmessagehubon) with all its arguments `args`:

```ts
postMessageHub.emit(peer: Window | Worker, methodName: string, ...args: any[]) => Promise<unknown>
```

This api return a promise, you can get response or catch the exception via it.

e.g.
```js
postMessageHub
  .emit(peerWindow, 'some-method', 'arg1', 'arg2', 'otherArgs')
  .then(res => console.log('success', res))
  .catch(err => console.warn('error', err))
```

Notice:
1. look into [Error](#error) when you catch an error
2. set `peer` to `self` if you want to send message from worker to outside
3. omit args if no args are required, e.g `postMessageHub.emit(peerWindow, 'some-method')`


#### postMessageHub.on
Listen messages sent from peer, it has following forms:
```ts
// register(listen)) one handler for methodName when message received from peer
postMessageHub.on(peer: Window | Worker | '*', methodName: string, handler: Function)
// register(listen)) multi handlers
postMessageHub.on(peer: Window | Worker | '*', handlerMap: Record<string, Function>)
// register only one handler to deal with all messages from peer
postMessageHub.on(peer: Window | Worker | '*', singleHandler: Function)
```

e.g.
```js
// listen multi messages from peerWindow  by passing a handler map
postMessageHub.on(peerWindow, {
  hi (name) {
    console.log(`name ${name}`)
    // response by return
    return `hi ${name}`
  },
  'some-method': function (a, b) {
    ...
  }
})

// listen 'some-other-method' from peerWindow with an async callback
postMessageHub.on(peerWindow, 'some-other-method', async function (a, b, c) {
  try {
    const result = await someAsyncFn(a, b, c)
    return result
  } catch (e) {
    throw e
  }
})

// listen all peers' 'some-common-method' with a same callback
postMessageHub.on('*', 'some-common-method', async function (a, b) {
  ...
})

// listen all messages to peerWindow2 with on callback (first arg is the methodName)
postMessageHub.on(peerWindow2, async function (methodName, ...args) {
  ...
})
```

Notice:
1. set `peer` to `self` if you want to listen messages in worker
2. set `peer` to a `Worker` instance(e.g `new Worker('./xxxx.js')`) if you want to listen its messages in a normal window context
3. the specified callback will be called if you listen same `methodName` in specified peer and `*`
4. if you want worker's messages handled by callbacks registered via peer `*` , **you must call `postMessageHub.on` with worker(e.g `postMessageHub.on(worker, {})`) to register worker due to worker's restrictions**


#### progress for PostMessageHub
If you need progress feedback when peer handling you request, you can do it by setting the first argument as an object and has a function property named `onprogress` when `emit` messages, and call `onprogress` in `on` on the peer's side.

e.g.
```js
// in normal window, send message to worker, get progress
postMessageHub.emit(workerInstance, 'download', {
 onprogress(p) {console.log('progress: ' + p.count)}
}).then(e => {
 console.log('success: ', e)
}).catch(err => {
  console.log('error: ' + err)
})

// in worker thread
// listen download from main window
workerMessageHub.on(self, {
  // download with progress support
  download: (msg) => {
    return new Promise((resolve, reject) => {
      let hiCount = 0
      const tid = setInterval(() => {
        if (hiCount >= 100) {
          clearInterval(tid)
          return resolve('done')
        }
        msg.onprogress({count: hiCount += 10})
      }, 200)
    })
  }
}

```

#### postMessageHub.off
Remove message handlers, if `methodName` presented, remove `methodName`'s listener, or remove the whole peer's listener

```ts
postMessageHub.off(peer: Window | Worker | '*', methodName?: string)
```

#### postMessageHub.createDedicatedMessageHub
Create a dedicated message-hub for specified peer, so that you won't need to pass peer every time:   

```ts
/**
* @param peer peer window to communicate with, or you can set it later via `setPeer`
* @param silent when peer not exists, keep silent instead of throw an error when call emit, on, off
*/
postMessageHub.createDedicatedMessageHub (peer?: IOwnPeer, silent?: boolean) => IDedicatedMessageHub

interface IDedicatedMessageHub {
  /** if you didn't set a peer when invoking createDedicatedMessageHub, then you can use `setPeer` to set it when it's ready*/
  setPeer: (peer: Window | Worker) => void;
  emit: (methodName: string, ...args: any[]) => Promise<unknown>;
  on: (methodName: string, handler: Function) => void;
  on: (handlerMap: Record<string, Function>) => void;
  off: (methodName?: string) => any;
}
```

e.g.
```js
// create without a peer
const dedicatedMessageHub = postMessageHub.createDedicatedMessageHub (null, true)

// this won't work, but won't throw an error neither
dedicatedMessageHub.on('a', () => {...})

dedicatedMessageHub.setPeer(someWorker)

dedicatedMessageHub.on('xx', () => {...})
dedicatedMessageHub.emit('some-method', 'xx', 'xxx').then(() => {...}).catch(() => {...})

```

#### postMessageHub.createProxy
Forward all messages from `fromWin` to `toWin` then forward `toWin`'s response to the `fromWin`, instead of handle messages by self

```ts
postMessageHub.createProxy(fromWin: Window | Worker, toWin: Window | Worker) 
```

e.g.
```ts
// forward all messages from `someWorker` to `someIframeWin`
postMessageHub.createProxy(someWorker, someIframeWin) 

```


There is a funny use case:  
If you got two iframes in your page, you can make them communicate directly by following code
```ts
postMessageHub.createProxy(frame1Win, frame2Win) // forward message from frame1Win to frame2Win
postMessageHub.createProxy(frame2Win, frame1Win) // forward message from frame2Win to frame1Win
```

### StorageMessageHub
`StorageMessageHub` works in browser and use `storage` event(trigger via changing localStorage) under the hood, it enable you to communicate between pages with the [same origin](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy), aka with the same `location.origin`(protocol + domain + port) in a simple way.

When to use it:
> 1. pages you want to share messages are with the same origin
> 2. they are not(all) managed(opened) by a same page

`StorageMessageHub` is a class, new an instance before using it:
```js
import { StorageMessageHub } from "duplex-message"

const storageMessageHub = new StorageMessageHub(options?: IStorageMessageHubOptions)

export interface IStorageMessageHubOptions {
  /** timeout number(millisecond as unit) when no response is received, default: 1000 milliseconds */
  timeout?: number
  /** localStorage key prefix to store message, default: $$xiu */
  keyPrefix?: string
  /** a customable identity that can make your self identified by others, will be used by StorageMessageHub.getPeerIdentifies  */
  identity?: any
}
```

Notice:  
> Web pages in browser with same origin are weak connected, they just share one localStorage area. Sending a message via localStorage just like sending a broadcast, there maybe no listener, or more than one listeners. So, a `timeout` is necessary in case of there is no listener can respond your messages, or they don't respond in time.

#### storageMessageHub.emit
Broadcast(or you can also send to specified peer) a message, invoking `methodName` registered on the peers via [`on`](#storageMessageHubbon) with all its arguments `args`, return a promise with result.


```ts
// broadcast a message to all peers
//    promise resolve when `first success` response received(
//      there may be more than one peers, they all will respond this message,
//      you will get the first success response,  rest responses will be discarded)
//    or you will catch an error
storageMessageHub.emit(methodName: string, ...args: any[]) => Promise<unknown>

// send message with more flexible config
storageMessageHub.emit(methodConfig: IStorageMessageHubEmit, ...args: any[]) => Promise<unknown>
interface IStorageMessageHubEmitConfig {
  /**
   * need all peers' responses
   * 
   *  if set true, the promise result will be an object, key is the peer's instance id, value is its response
   */
  needAllResponses?: boolean
  /**
   * peer's instance id, only send the message to `toInstance`
   *    instance id could get via storageMessageHub.getPeerIdentifies
   * 
   *  if `toInstance` is set, `needAllResponses` won't work any more
   */
  toInstance?: string
  /** specified another timeout(millisecond) for this message  */
  timeout?: number
  /** method name */
  methodName: string
}
```
Notice:
1. If you want to send message to specified peer, use to [storageMessageHub.getPeerIdentifies](#storageMessageHubgetPeerIdentifies) to get peer's instance id before sending.
2. look into [Error](#error) when you catch an error
3. arguments must be stringify-able, due to localStorage's restrictions

e.g.
```js
// broadcast that user has logout
storageMessageHub.emit('user-logout')

// send a message and get the first success response
storageMessageHub.emit('get-some-info').then(res => {
  console.log(res)
}).catch(err => { console.error(err)})

// get all response from all peers
//   the response's struct is { [instanceID]: {isSuccess, data} }
storageMessageHub.emit({
  methodName: 'get-some-info',
  needAllResponses: true,
})
.then(res => {
  console.log(res)
})
// you will catch an timeout error only when there is no other page
.catch(err => { console.error(err)})
```



#### storageMessageHub.on
Listen messages sent from peer, it has following forms:
```ts
// register(listen)) one handler for methodName when message received from main process
storageMessageHub.on(methodName: string, handler: Function)
// register(listen)) multi handlers
storageMessageHub.on(handlerMap: Record<string, Function>)
// register only one handler to deal with all messages from process
storageMessageHub.on(singleHandler: Function)
```
e.g.
```js
storageMessageHub.on('async-add', async function (a, b) {
  return new Promise((resolve, reject) => {
    resolve(a + b)
  })
})

storageMessageHub.on({
  'method1': function () {...},
  'method2': function (a, b, c) {...}
})

// listen all messages
anotherStorageMessageHub.on((methodName, ...args) => {
  ...
})
```

#### storageMessageHub.getPeerIdentifies
Get all peer's identify information. `instanceID` is used by the library when communicating, `identity` is customable when you creating instance, you may use `identity` to distinguish between instances.
> Be aware of that, you may get same `identity` if you open same page twice, but the `instanceID`s are always different and unique.

```ts
storageMessageHub.getPeerIdentifies() => Promise<Array<IPeerIdentity>>

interface IPeerIdentity {
  /** instance id, unique, auto generated */
  instanceID: string
  /** can be custom when new StorageMessageHub */
  identity?: any
}
```

e.g.
```js
storageMessageHub.getPeerIdentifies()
  .then(res => {
    console.log(res)
  })
  // you will catch an timeout error only when there is no other page
  .catch(err => console.error(err))
```

#### progress for storageMessageHub
If you need progress feedback when peer handling you request, you can do it by setting the first argument as an object and has a function property named `onprogress` when `emit` messages, and call `onprogress` in `on` on the peer's side.

e.g.
```js
// in normal window, send message to worker, get progress
//  you must get peer's instanceID via `storageMessageHub.getPeerIdentifies` before using it
storageMessageHub.emit({toInstance: 'kh9uxd11iyc-kh9uxd11iyc', methodName: 'download'}, {
 onprogress(p) {console.log('progress: ' + p.count)}
}).then(e => {
 console.log('success: ', e)
}).catch(err => {
  console.log('error: ' + err)
})

// listen download from another window that has instance id 'kh9uxd11iyc-kh9uxd11iyc'
anotherWindowStorageMessageHub.on({
  // download with progress support
  download: (msg) => {
    return new Promise((resolve, reject) => {
      let hiCount = 0
      const tid = setInterval(() => {
        if (hiCount >= 100) {
          clearInterval(tid)
          return resolve('done')
        }
        msg.onprogress({count: hiCount += 10})
      }, 200)
    })
  }
}
```

#### storageMessageHub.off
Remove message handlers, if `methodName` presented, remove `methodName`'s listener, or remove the whole peer's listener

```ts
storageMessageHub.off(methodName?: string)
```

### PageScriptMessageHub
`PageScriptMessageHub` works in browser and use `customEvent` under the hood, it enable you:
1. communicate between isolated javascript environment in same window context
2. listen and respond messages with the same code.


When to use it:  
> 1. when your javascript codes are isolated in same window context, e.g. chrome extension's content script with webpage's js code
> 2. you need to communicate between them.

`PageScriptMessageHub` is a class, `new` an instance in every peer before using it 
```js
import { PageScriptMessageHub } from "duplex-message"

const pageScriptMessageHub = new PageScriptMessageHub(options?: IPageScriptMessageHubOptions)

interface IPageScriptMessageHubOptions {
  /** custom event name, default: message-hub */
  customEventName?: string
}
```

#### pageScriptMessageHub.emit
Send a message to peer, invoking `methodName` registered on the peer via [`on`](#on) with all its arguments `args`:

```ts
// in renderer process
pageScriptMessageHub.emit(method: string, ...args: any[]) => Promise<unknown>
```

e.g.
```js
// in renderer process
pageScriptMessageHub
  .emit('stop-download')
  .then(res => console.log('success', res))
  .catch(err => console.warn('error', err))
```

Notice:
1. look into [Error](#error) when you catch an error
2. omit args if no args are required, e.g `pageScriptMessageHub.emit('some-method')`

#### pageScriptMessageHub.on
Listen messages sent from peer, it has following forms:

```ts
// register(listen)) one handler for methodName when message received from main process
pageScriptMessageHub.on(methodName: string, handler: Function)
// register(listen)) multi handlers
pageScriptMessageHub.on(handlerMap: Record<string, Function>)
// register only one handler to deal with all messages from process
pageScriptMessageHub.on(singleHandler: Function)
```

e.g.
```js

// in renderer process
pageScriptMessageHub.on('async-add', async function (a, b) {
  return new Promise((resolve, reject) => {
    resolve(a + b)
  })
})

pageScriptMessageHub.on({
  'method1': function () {...},
  'method2': function (a, b, c) {...}
})

// listen all messages from peer with one handler
anotherPageScriptMessageHub.on((methodName, ...args) => {
  ...
})
```


#### progress for PageScriptMessageHub
If you need progress feedback when peer handling you request, you can do it by setting the first argument as an object and has a function property named `onprogress` when `emit` messages, and call `onprogress` in `on` on the peer's side.

e.g.
```js
// listen download from peer
pageScriptMessageHub.on({
  // download with progress support
  download: (msg) => {
    return new Promise((resolve, reject) => {
      let hiCount = 0
      const tid = setInterval(() => {
        if (hiCount >= 100) {
          clearInterval(tid)
          return resolve('done')
        }
        msg.onprogress({count: hiCount += 10})
      }, 200)
    })
  }
}

// in the peer's code
peerPageScriptMessageHub.emit('download', {
 onprogress(p) {console.log('progress: ' + p.count)}
}).then(e => {
 console.log('success: ', e)
}).catch(err => {
  console.log('error: ' + err)
})
```

#### pageScriptMessageHub.off
Remove message handlers, if `methodName` presented, remove `methodName`'s listener, or remove the whole peer's listener

```ts
// in renderer process
pageScriptMessageHub.off(methodName?: string)
```

### Error
when you catch an error from `emit`, it conforms the following structure `IError`

```ts
/** error object could be caught via emit().catch(err) */
export interface IError {
  /** none-zero error code */
  code: EErrorCode
  /** error message */
  message: string
  /** error object if it could pass through via the message channel underground*/
  error?: Error
}

/** enum of error code */
export enum EErrorCode {
  /** handler on other side encounter an error  */
  HANDLER_EXEC_ERROR = 1,
  /** no corresponding handler found */
  HANDLER_NOT_EXIST = 2,
  /** target(peer) not found*/
  TARGET_NOT_FOUND = 3,
  /** message not responded in time */
  TIMEOUT = 4,
  /** message has invalid content, can't be sent  */
  INVALID_MESSAGE = 5,
  /** other unspecified error */
  UNKNOWN = 6,
}
```