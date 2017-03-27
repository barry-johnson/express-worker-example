# express-worker-example

Example code for calling a worker thread with express

Created to help someone with a [StackOverflow question](http://stackoverflow.com/questions/43016733/nodejs-hanlde-a-cpu-intensive-route).

Starts a server on port 3131. Starts two background worker processes than can handle responding to specific task requests.

Fire up a couple of different browsers and hit the following from two different windows. This performs an (intentionally) very inefficient calculation to find the 45th fibonacci number.

http://localhost:3131/fibo/45

Note that Chrome (but not Edge) will hold making a second call to the same URL until the first returns. Edge does not, I didn't check FF or Opera. If you want to test it in Chrome, just call it with different values, e.g. compute both the 45 and 46th fib:

http://localhost:3131/fibo/45
http://localhost:3131/fibo/46
