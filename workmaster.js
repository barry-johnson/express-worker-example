var debug = require('debug')('master');
const Promise = require('bluebird');
// make own Deferred so I don't have to see bluebird's deprecation notice...
function Deferred(){
    var d = this;
    d.promise = new Promise(function(resolve,reject){
        d.resolve = resolve;
        d.reject = reject;
    });
    return d;
}

var _ = require('lodash');
var fork = require('child_process').fork;

function WorkMaster(maxWorkers) {
    this.pendingInstalls = [];
    this.workerRestarts = 0;
    this.maxWorkers = maxWorkers;

    this.lastWorker = 0;    // use for simple round-robin distribution
    this.workCount = 0;  // a counter to keep track of req/resp
    this.workers = [];
    // used to keep track of active tasks passed to workers. Note that if the tasks are fully
    // CPU bound, a worker with more than one task will be slower to respond to later tasks as it
    // gets backed up, but it will at least be out of your main thread
    this.workerTasks = [];
    this.promisedWork = {};
}

WorkMaster.prototype.start = function startWorkers(applicationContext, options) {
    debug('Starting Worker Processes');

    for (let i=0; i < this.maxWorkers; i++){
        let t = i;
        let spawned = fork('./worker.js',{});
        spawned.on('message',this.handleWorkerMessage.bind(this));
        this.workerTasks[i] = [];
        spawned.on('exit', () => {
            // need to trigger failures for any work that had been farmed here...
            debug('A worker process crashed. Will reject all pending tasks and restart.');
            this.workerTasks[t].map((tid)=>{
                debug(`Will reject for ${tid} `);
                if (this.promisedWork[tid] !== undefined){
                    this.promisedWork[tid].reject(new Error('Worker process crashed'));
                    delete this.promisedWork[tid];
                }
            });
            this.workerRestarts++;
            debug('worker thread exited, restarting.');
            let respawned = fork('./worker.js',{});
            this.workerTasks[t] = [];
            if (this.pendingInstalls){
                this.pendingInstalls.map((m) => respawned.send(m));
            }
            this.workers[t] = respawned;

        });
        if (this.pendingInstalls){
            this.pendingInstalls.map((m) => spawned.send(m));
        }
        this.workers[i] = spawned;

    }
};

WorkMaster.prototype.handleWorkerMessage = function handleWorkerMessage(msg){

    if(msg.task && msg.task !== '') {
        var taskId = msg.taskId;
        if(msg.error){
            var err = new Error(msg.error.message);
            if(msg.error.stack && msg.error.stack !== '') {
                err.__origStack = err.stack;
                err.stack = msg.error.stack;
                err.__stackSource = `worker pid=${process.pid}`;
            }
            this.promisedWork[taskId].reject(msg.error);
        } else {
            this.promisedWork[taskId].resolve(msg.result);
        }
        delete this.promisedWork[taskId];
    } else if (msg.install && msg.install !== '') {
        // this is just the worker notifying that it did install
    } else {
        debug(`Unhandled message from worker: `,msg);
    }

};

WorkMaster.prototype.workByWorker = function workByWorker(taskName, params) {
    var d = new Deferred();
    var taskId = (this.workCount++).toString(36);
    this.lastWorker = (this.lastWorker === (this.maxWorkers-1)) ? 0 : this.lastWorker + 1;
    debug(`Sending ${taskName} task to worker thread. ${this.lastWorker}`);
    this.workerTasks[this.lastWorker].push(taskId);
    this.workers[this.lastWorker].send({taskId:taskId, task: taskName, params: params});
    this.promisedWork[taskId] = d;
    return d.promise;
};

WorkMaster.prototype.installWorkableTask = function installWorkableTask(taskTag, fromModule, theFunction, makeInstance){
    this.pendingInstalls.push({install:taskTag, module: fromModule, fn: theFunction, useInstace: makeInstance});
    // return a function here which actually calls the worker, something of a convenience. In app.js
    // the wait route uses this mechanism, while others routes just calls workByWorker directly
    return _.bind(this.workByWorker, this, taskTag);
};

module.exports = WorkMaster;
