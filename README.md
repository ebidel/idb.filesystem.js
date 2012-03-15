idbfiler.js
===========

idbfiler.js is JavaScript library (polyfill) implementation of the HTML5 [Filesystem API][1].
It is intended for browsers that do not support the API natively.

The library works by using [IndexedDB][2] as its underlying storage layer. Essentially,
this means that any browser supporting IndexedDB also supports the Filesystem API!
All you need to do is make the Filesystem API calls. The rest is magic.

Supported Browsers
------------------

* Firefox 14a1+

Unlisted browsers and/or versions (e.g. earlier versions of Firefox) that
which IndexedDB will liekly work; I just haven't tested them.

[1]: http://dev.w3.org/2009/dap/file-system/pub/FileSystem/
[2]: https://developer.mozilla.org/en/IndexedDB

Getting started
===============

I highly recommended that you familiarize yourself with the HTML5 Filesystem API.
I've written a book on the topic, ["Using the HTML5 Filesystem API"](http://shop.oreilly.com/product/0636920021360.do), and there is also a great article on HTML5 Rocks
that walks you through all of the different methods and capabilities:

1. [Exploring the FileSystem APIs](http://www.html5rocks.com/tutorials/file/filesystem/)

Usage
-----

Blah
