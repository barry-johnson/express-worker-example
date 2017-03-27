const express = require('express');
const app = express();
const debug = require('debug')('app');
const WorkMaster = require('./workmaster');

let master = new WorkMaster(2); // create two workers
master.installWorkableTask('fibo', './time-killers', 'fibo', false);

//  Compare the fibo vs wait routes below
const waitInAnotherProcess = master.installWorkableTask('wait', './time-killers', 'wait', false);
master.installWorkableTask('fail', './time-killers', 'fail', false);
master.installWorkableTask('suicide', './time-killers', 'suicide', false);
// there is no xyz exposed in time killers  - just to illustrate the error
master.installWorkableTask('xyz', './time-killers', 'xyz', false);
master.start();

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.get('/fibo/:n', function(req, res, next) {
    master.workByWorker('fibo',parseInt(req.params.n))
    .then(function (result){
        debug(`Fibo worked ${result}`);
        res.send({n: req.params.n, fibo: result});
    })
    .catch((err)=>{
        res.setHeader('content-type','application/json');
        res.send({err: err});
    });

});

app.get('/wait/:n', function(req, res, next) {
    waitInAnotherProcess(parseInt(req.params.n))
    .then(function (result){
        debug(`Wait worked ${result}`);
        res.send({n: req.params.n, wait: result});
    })
    .catch((err)=>{
        res.setHeader('content-type','application/json');
        res.send({err: err});
    });

});


app.get('/fail', function(req, res, next) {
    master.workByWorker('fail',parseInt(req.params.n))
    .then(function (result){
        debug(`Fail didn't: ${result}`);
        res.send({n: req.params.n, fail: result});
    })
    .catch((err)=>{
        res.setHeader('content-type','application/json');
        res.send({err: err});
    });

});


app.get('/suicide', function(req, res, next) {
    master.workByWorker('suicide',parseInt(req.params.n))
    .then(function (result){
        debug(`Suicide worked ${result}`);
        res.send({n: req.params.n, suicide: result});
    })
    .catch((err)=>{
        res.setHeader('content-type','application/json');
        res.send({err: err});
    });

});

app.listen(3131, function () {
  console.log('Example app listening on port 3131!');
});