var debug = require('debug')('worker');
var Promise = require('bluebird');
var _ = require('lodash');
var installedTasks = {};

debug(`Worker thread launched with "${require.main.filename}" pid=${process.pid}.`);

process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

Promise.onPossiblyUnhandledRejection(function(e, p) {
  console.warn('Possibly Unhandled Rejection at: Promise', p, 'error:', e);
});

process.on('warning', (warning) => {
  console.warn(warning.name);
  console.warn(warning.message);
  console.warn(warning.stack);
});

process.on('message',processMessage);

// handle the two types of messages: install or task
function processMessage(msg) {
    if (msg.task && msg.task !=='') {
        if (installedTasks[msg.task]){
            var startTime = new Date().getTime();
            installedTasks[msg.task](msg.params)
            .then(function(result){
                process.send({task: msg.task, taskId: msg.taskId, ranIn: (new Date().getTime() - startTime), result:result});
            })
            .catch(function(err){
                debug(`Worker completed ${msg.task} with errors pid=${process.pid}`);
                process.send({task: msg.task, taskId: msg.taskId, ranIn: (new Date().getTime() - startTime), error: {message: err.message, stack: err.stack}});
            });
        } else {
            debug(`No installed task for ${msg.task}`);
            process.send({task: msg.task, taskId: msg.taskId, error: {message: `No installed task for ${msg.task}`}});
        }
    } else if(msg.install && msg.install !==''){
        try{
            var M = require(msg.module);
            if (msg.useInstance){
                var m = new M();
                installedTasks[msg.install] = _.bind(m[msg.fn],m);
            } else {
                if (typeof(M[msg.fn]) !== 'function')
                    throw new Error(`{msg.module} doesn't expose a function ${msg.fn}`);
                installedTasks[msg.install] = M[msg.fn];
            }
            debug(`Installed ${msg.install} ${msg.useInstance?'on instance ':''}in worker. pid=${process.pid}`);
            process.send({install: msg.install, module: msg.module, fn: msg.fn, useInstance: msg.useInstance});
        } catch(e) {
            debug(`Error installing ${msg.install} in pid=${process.pid}: ${e.message}`,e.stack);
            process.send({install: msg.install, error:{message: e.message, stack:e.stack}});
        }
    } else {
        debug(`Unhandled message to worker pid=${process.pid}: `,msg);
    }
}

installedTasks.echo = function echo(params){
    return Promise.resolve(params);
};

installedTasks.ping = function ping(params){
    return Promise.resolve('pong');
};

installedTasks.time = function time(params){
    return Promise.resolve({ts:new Date().getTime()});
};

installedTasks.mem = function mem(params){
    return Promise.resolve(process.memoryUsage());
};
