const Promise = require('bluebird');

function fibo(n){
    if (n>1)
        return fibo(n-1) + fibo(n-2);
    return 1;
}

function wait(n){
    return Promise.delay(n *1000)
        .then(()=> `waited for ${n*1000} ms`);

}

function fail(n){
    throw new Error('Failed');
}

function suicide(n){
    // this is merely to exercise the behavior of the library
    // in the event of a worker process completely crashing.
    process.exit();
}


module.exports = {fibo: (n)=>Promise.resolve(fibo(n)),
                  wait: wait,
                fail: () => Promise.resolve().then(fail),
            suicide: suicide};
