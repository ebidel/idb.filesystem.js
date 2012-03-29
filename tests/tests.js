function onError(e) {
  ok(false, 'unexpected error ' + e.name);
  start();
};

module('window methods', {
  setup: function() {
    if (document.location.protocol == 'file:') {
      ok(false, 'These tests need to be run from a web server over http://.');
    }
  },
  teardown: function() {

  }
});

/*test("check constructors can't be seen by global scope", 7, function() {
  // Shouldn't be able to call constructors on these interfaces:
  ok(window.FileEntry === undefined, 'window.FileEntry not defined');
  ok(window.DiretoryEntry === undefined, 'window.DiretoryEntry not defined');
  ok(window.Entry === undefined, 'window.Entry not defined');
  ok(window.DirectoryReader === undefined, 'window.DirectoryReader not defined');
  ok(window.FileWriter === undefined, 'window.FileWriter not defined');
  ok(window.DOMFileSystem === undefined, 'window.DOMFileSystem not defined');
  ok(window.idb === undefined, 'idb was exposed to global scope');
});*/

test('requestFileSystem', 10, function() {
  ok(window.requestFileSystem, 'window.requestFileSystem defined');
  equal(window.TEMPORARY, 0);
  equal(window.PERSISTENT, 1);

  stop();
  window.requestFileSystem(TEMPORARY, 1024*1024, function(fs) {
    equal(fs.name, 'http_' + location.host.replace(':', '_') + ':Temporary');
    ok(fs === fs.root.filesystem, 'fs.root.filesystem === fs');
    equal(fs.root.fullPath, '/', 'full path is /');
    equal(fs.root.isFile, false, 'root is not a FileEntry');
    equal(fs.root.isDirectory, true, 'root is a DirectoryEntry');
    equal(fs.root.name, '');
    start();
  }, onError);

  stop();
  window.requestFileSystem(3000, 1024*1024, function(fs) {
    ok(false, 'incorrect storage type accepted');
  }, function(e) {
    equal(e.name, 'INVALID_MODIFICATION_ERR', 'incorrect storage type used');
    start();
  });
});

test('resolveLocalFileSystemURL', 2, function() {
  ok(window.resolveLocalFileSystemURL, 'window.resolveLocalFileSystemURL defined');

  stop();
  window.resolveLocalFileSystemURL('/', function(entry) {
    ok(false);
  }, function() {
    ok(true, 'window.resolveLocalFileSystemURL() correctly threw not implemented error');
    start();
  });
});

module('Entry', {
  setup: function() {
    var self = this;
    stop();
    window.requestFileSystem(TEMPORARY, 1024*1024, function(fs) {
      self.fs = fs;
      start();
    }, onError);
  },
  teardown: function() {

  }
});

test('verify properties/methods exist', 9, function() {
  var fs = this.fs;

  ok(fs.root.hasOwnProperty('name'), 'Entry.name defined');
  ok(fs.root.hasOwnProperty('fullPath'), 'Entry.fullPath defined');
  ok(fs.root.hasOwnProperty('filesystem'), 'Entry.filesystem defined');
  ok(typeof fs.root.getParent == 'function', 'Entry.getParent() defined');
  ok(typeof fs.root.getMetadata == 'function', 'Entry.getMetadata() defined');
  ok(typeof fs.root.copyTo == 'function', 'Entry.copyTo() defined');
  ok(typeof fs.root.moveTo == 'function', 'Entry.moveTo() defined');
  ok(typeof fs.root.remove == 'function', 'Entry.remove() defined');
  ok(typeof fs.root.toURL == 'function', 'Entry.toURL() defined');
});

test('toURL()', 1, function() {
  try {
    var url = this.fs.root.toURL();
  } catch(e) {
    ok(true, 'toURL() correctly threw not implemented error');
  }
});

module('DirectoryEntry', {
  setup: function() {
    var self = this;
    stop();
    window.requestFileSystem(TEMPORARY, 1024*1024, function(fs) {
      self.fs = fs;
      start();
    }, onError);
  },
  teardown: function() {

  }
});

test('verify properties/methods exist', 8, function() {
  var fs = this.fs;

  ok(fs.root instanceof Entry, 'DirectoryEntry inherits from Entry');
  ok(fs.root.__proto__ === DirectoryEntry.prototype, 'fs.root is a DirectoryEntry');
  ok(typeof fs.root.getFile == 'function', 'DirectoryEntry.getFile() defined');
  ok(typeof fs.root.getDirectory == 'function', 'DirectoryEntry.getDirectory() defined');
  ok(typeof fs.root.createReader == 'function', 'DirectoryEntry.createReader() defined');
  ok(typeof fs.root.removeRecursively == 'function', 'DirectoryEntry.removeRecursively() defined');
  equal(fs.root.isFile, false, 'DirectoryEntry.isFile == false');
  equal(fs.root.isDirectory, true, 'DirectoryEntry.isDirectory == true');
});

test('read directory', 2, function() {
  var fs = this.fs;
  var entry = fs.root;

  try {
    entry.createReader().readEntries();
  } catch(e) {
    ok(true, 'createReader needs to be passed a success callback.');
  }

  stop();
  entry.createReader().readEntries(function(entries) {
    ok(entries.slice, 'returned entries is an array') // Verify we got an Array.
    start();
  }, onError);
});

test('getFile()', 2, function() {
  var fs = this.fs;
  var entry = fs.root;
  var FILE_NAME = 'idb_test_file_name' + Date.now();

  stop();
  entry.getFile(FILE_NAME, {create: false}, function(fileEntry) {
    ok(false, 'file existed');
    start();
  }, function(e) {
    ok(true, "{create: false} and file didn't exist");
    start();
  });

  var FILE_NAME2 = FILE_NAME + '_2';
  stop();
  entry.getFile(FILE_NAME2, {create: true}, function(fileEntry) {
    entry.getFile(fileEntry.fullPath, {create: false}, function(fileEntry2) {
      ok(true, fileEntry2.name + ' existed after creating it.');
      fileEntry2.remove(function() {
        start();
      });
    }, onError);
  }, onError);
});

test('add/remove file in directory', 4, function() {
  var fs = this.fs;
  var entry = fs.root;
  var FILE_NAME = 'idb_test_file_name' + Date.now();

  stop();
  entry.getFile(FILE_NAME, {create: true}, function(fileEntry) {
    ok(fileEntry.__proto__ === FileEntry.prototype, 'created file is a FileEntry');
    equal(fileEntry.isFile, true, '.isFile == true');
    equal(fileEntry.fullPath, '/' + FILE_NAME, "fullPath is correct");
    equal(fileEntry.name, FILE_NAME, "filename matches one set");
    fileEntry.remove(function() {
      start();
    });
  }, onError);
});

test('getDirectory()', 5, function() {
  var fs = this.fs;
  var entry = fs.root;
  var FOLDER_NAME = 'idb_test_folder_name' + Date.now();

  stop();
  entry.getDirectory(FOLDER_NAME, {create: false}, function(folderEntry) {
    ok(false, 'folder existed');
    start();
  }, function(e) {
    ok(true, "{create: false} and folder didn't exist");
    start();
  });

  var FOLDER_NAME2 = FOLDER_NAME + '_2';
  stop();
  entry.getDirectory(FOLDER_NAME2, {create: true}, function(folderEntry) {
    ok(folderEntry.__proto__ === DirectoryEntry.prototype, 'created entry is a DirectoryEntry');
    equal(folderEntry.isDirectory, true, '.isDirectory == true');
    equal(folderEntry.fullPath, '/' + FOLDER_NAME2, "fullPath is correct");
    equal(folderEntry.name, FOLDER_NAME2, "folder name matches one that was set");
    folderEntry.remove(function() {
      start();
    });
  }, onError);
});


module('FileEntry', {
  setup: function() {
    var self = this;
    stop();
    window.requestFileSystem(TEMPORARY, 1024*1024, function(fs) {
      self.fs = fs;
      start();
    }, onError);
  },
  teardown: function() {

  }
});

test('verify properties/methods exist', 6, function() {
  var fs = this.fs;

  var fileEntry = new FileEntry();

  ok(fileEntry instanceof Entry, 'FileEntry inherits from Entry');
  ok(fileEntry.__proto__ === FileEntry.prototype, 'fileEntry is a FileEntry');
  ok(typeof fileEntry.createWriter == 'function', 'FileEntry.createWriter() defined');
  ok(typeof fileEntry.file == 'function', 'FileEntry.file() defined');
  equal(fileEntry.isFile, true, 'FileEntry.isFile == false');
  equal(fileEntry.isDirectory, false, 'FileEntry.isDirectory == true');
});

test('file()', 4, function() {
  var fs = this.fs;
  var entry = fs.root;
  var FILE_NAME = 'idb_test_file_name' + Date.now();

  try {
    var fileEntry = new FileEntry();
    fileEntry.file();
  } catch(e) {
    ok(true, 'success callback required.');
  }

  try {
    var fileEntry = new FileEntry();
    fileEntry.file(function(file) {
      ok(false);
    });
  } catch(e) {
    ok(true, 'FileEntry.file() threw NOT_FOUND_ERROR');
  }

  stop();
  entry.getFile(FILE_NAME, {create: true}, function(fileEntry) {
    fileEntry.file(function(file) {
      equal(file.size, 0, 'empty file.size == 0');
      equal(file.type, '', "empty file has type==''");
      fileEntry.remove(function() {
        start();
      });
    }, function(e) {
      ok(false, 'NOT_FOUND_ERROR');
      start();
    });
  }, onError);
});

test('FileWriter', 16, function() {
  var fs = this.fs;
  var entry = fs.root;
  var FILE_NAME = 'idb_test_file_name_writer' + Date.now();
  var BLOB_DATA = '123';
  var MIMETYPE = 'text/plain';

  // FileWriter shouldn't be an accessible constructor.
  ok(window.FileWriter === undefined, 'window.FileWriter is undefined');

  var fileEntry = new FileEntry();
  stop();
  fileEntry.createWriter(function(writer) {
    equal(writer.position, 0, 'writer.position is 0');
    equal(writer.length, 0, 'writer.length is 0');
    start();
  });

  var fileEntry2 = new FileEntry();
  stop();
  fileEntry2.createWriter(function(writer) {
    try {
      writer.write();
      start();
    } catch(e) {
      ok(true, 'Exception thrown for missing blob argument.');
      start();
    }
  });

  stop();
  entry.getFile(FILE_NAME, {create: true}, function(fileEntry) {
    fileEntry.createWriter(function(writer) {

      writer.onwritestart = function() {
        ok(true, 'onwritestart fired');
        ok(this === writer, 'this is writer object');
        equal(this.position, 0, '.position is 0');
        equal(this.length, 0, '.length is 0');
      };

      writer.onwriteend = function() {
        ok(true, 'onwriteend fired');
        equal(this.position, BLOB_DATA.length, '.position is correct after write');
        equal(this.length, BLOB_DATA.length, '.length is correct after write');

        fileEntry.file(function(file) {
          equal(file.type, MIMETYPE, 'file.type initially blank');
          equal(file.size, writer.length, 'file.size == writer.length');
          fileEntry.remove(function() {
            start();
          });
        });
      };

      fileEntry.file(function(file) {
        equal(file.type, '', 'file.type initially blank');
        equal(file.size, 0, 'file.size initially 0');
        equal(file.name, FILE_NAME, 'filename == ' + FILE_NAME);

        // Run the writes after this async function does its thing.
        var bb = new BlobBuilder();
        bb.append(BLOB_DATA);
        writer.write(bb.getBlob(MIMETYPE));
      });
    });
  }, onError);
});
