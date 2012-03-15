idbfiler.js
=======

idbfiler.js is JavaScript library (polyfill) implementation of the HTML5 Filesystem API.
It is intended for browsers that do not support the API natively.

The library works by sitting on top of IndexedDB as a storage layer. Essentially,
this means that any browser supporting IndexedDB also supports the Filesystem API!
All you need to do is make the Filesystem API calls, and the rest is magic!

