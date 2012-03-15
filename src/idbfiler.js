/*
Copyright 2012 - Eric Bidelman

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Author: Eric Bidelman (ebidel@gmail.com)
*/

'use strict';

(function(exports) {

// Bomb out if the Filesystem API is available natively.
if (exports.requestFileSystem || exports.webkitRequestFileSystem) {
  return;
}

exports.indexedDB = exports.indexedDB || exports.mozIndexedDB ||
                    exports.msIndexedDB;
exports.BlobBuilder = exports.BlobBuilder || exports.MozBlobBuilder ||
                      exports.MSBlobBuilder;
exports.TEMPORARY = 0;
exports.PERSISTENT = 1;

// Prevent errors in browsers that don't support FileError.
// TODO: FF 13+ supports DOM4 Events (DOMError). Use them instead?
if (exports.FileError === undefined) {
  var FileError = function() {};
  FileError.prototype.prototype = Error.prototype;
}

FileError.INVALID_MODIFICATION_ERR = 9;
FileError.NOT_FOUND_ERR  = 1;

function MyFileError(obj) {
  this.code = obj.code;
  this.name = obj.name;
}
MyFileError.prototype = FileError.prototype;

var INVALID_MODIFICATION_ERR = new MyFileError({
      code: FileError.INVALID_MODIFICATION_ERR,
      name: 'INVALID_MODIFICATION_ERR'});
var NOT_IMPLEMENTED_ERR = new MyFileError({code: 1000,
                                           name: 'Not implemented'});
var NOT_FOUND_ERR = new MyFileError({code: FileError.NOT_FOUND_ERR,
                                     name: 'Not found'});

var fs_ = null;
var idb = {};
idb.db = null;
var FILE_STORE = 'entries';

/**
 * Interface to wrap the native File interface.
 *
 * This interface is necessary for creating zero-length (empty) files,
 * something the Filesystem API allows you to do. Unfortunately, File's
 * constructor cannot be called directly, making it impossible to instantiate
 * an empty File in JS.
 *
 * @param {Object} opts Initial values.
 * @constructor
 */
function MyFile(opts) {
  var blob_ = null;
  var self = this;

  this.size = opts.size || 0;
  this.name = opts.name || '';
  this.type = opts.type || '';
  //this.slice = Blob.prototype.slice; // Doesn't work with structured clones.

  this.__defineGetter__('blob_', function() {
    return blob_;
  });

  // Need some black magic to correct the object's size/name/type based on the
  // blob that is saved.
  this.__defineSetter__('blob_', function(val) {
    blob_ = val;
    self.size = blob_.size;
    self.name = blob_.name;
    self.type = blob_.type;
  });
}
MyFile.prototype.constructor = MyFile; 
//MyFile.prototype.slice = Blob.prototype.slice;

/**
 * Interface to writing a Blob/File.
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/file-writer.html#the-filewriter-interface
 *
 * @param {FileEntry} fileEntry The FileEntry associated with this writer.
 * @constructor
 */
function FileWriter(fileEntry) {
  var position_ = 0;
  var length_ = 0;
  var fileEntry_ = fileEntry;

  this.__defineGetter__('position', function() {
    return position_;
  });

  this.__defineGetter__('length', function() {
    return length_;
  });

  this.write = function(blob) {

    if (!blob) {
      throw Error('Expected blob argument to write.'); 
      return;
    }

    var self = this;

    // Set the blob we're writing on this file entry so we can recall it later.
    fileEntry_.file_.blob_ = blob;

    // Call onwritestart if it was defined.
    if (self.onwritestart) {
      self.onwritestart();
    }

    // TODO: throw an error if onprogress, onwrite, onabort are defined.

    idb.put(fileEntry_, function(entry) {
      if (self.onwriteend) {
        // Set writer.position/write.length to same.
        position_ = entry.file_.size;
        length_ = position_;
        self.onwriteend();
      }
    }, this.onerror);
  };
}

FileWriter.prototype = {
  seek: function(offset) {
    throw NOT_IMPLEMENTED_ERR;
  },
  truncate: function(size) {
    throw NOT_IMPLEMENTED_ERR;
  }
}

/**
 * Interface for listing a directory's contents (files and folders).
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/pub/FileSystem/#idl-def-DirectoryReader
 *
 * @constructor
 */
function DirectoryReader() {}

DirectoryReader.prototype = {
  readEntries: function(successCallback, opt_errorCallback) {
    if (!successCallback) {
      throw Error('Expected successCallback argument.');
    }
    idb.getAllEntries(successCallback, opt_errorCallback);
  }
};

/**
 * Interface representing entries in a filesystem, each of which may be a File
 * or DirectoryEntry.
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/pub/FileSystem/#idl-def-Entry
 *
 * @constructor
 */
function Entry() {}

Entry.prototype = {
  name: null,
  fullPath: null,
  filesystem: null,
  copyTo: function() {
    
  },
  getMetadata: function() {
    
  },
  getParent: function() {
    
  },
  moveTo: function() {
    
  },
  remove: function(successCallback, opt_errorCallback) {
    if (!successCallback) {
      throw Error('Expected successCallback argument.');
    }
    idb.delete(this.fullPath, function() {
      successCallback();
    }, opt_errorCallback);
  },
  toURL: function() {
    throw NOT_IMPLEMENTED_ERR;
  },
};

/**
 * Interface representing a file in the filesystem.
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/pub/FileSystem/#the-fileentry-interface
 *
 * @constructor
 * @extends {Entry}
 */
function FileEntry(opt_fileEntry) {
  var file_ = null;

  this.__defineGetter__('file_', function() {
    return file_;
  });

  this.__defineSetter__('file_', function(val) {
    file_ = val;
  });

  this.__defineGetter__('isFile', function() {
    return true;
  });

  this.__defineGetter__('isDirectory', function() {
    return false;
  });

  // Create this entry from properties from an existing FileEntry.
  if (opt_fileEntry) {
    this.file_ = opt_fileEntry.file_;
    this.name = opt_fileEntry.name;
    this.fullPath = opt_fileEntry.fullPath;
    this.filesystem = opt_fileEntry.filesystem;
  }
}
FileEntry.prototype = new Entry();
FileEntry.prototype.constructor = FileEntry; 
FileEntry.prototype.createWriter = function(callback) {
  // TODO: figure out if there's a way to dispatch onwrite event. Only call
  // onwritend/onerror are called in FileEntry.write().
  callback(new FileWriter(this));
};
FileEntry.prototype.file = function(successCallback, opt_errorCallback) {
  if (!successCallback) {
    throw Error('Expected successCallback argument.');
  }

  if (this.file_ == null) {
    if (opt_errorCallback) {
      opt_errorCallback(NOT_FOUND_ERR);
    } else {
      throw NOT_FOUND_ERR;
    }
    return;
  }

  // If we're returning a zero-length (empty) file, return the fake file obj.
  // Otherwise, return the native File object that we've stashed.
  var file = this.file_.blob_ == null ? this.file_ : this.file_.blob_;

  // Add Blob.slice() to this wrapped object. Currently won't work :(
  /*if (!val.slice) {
    val.slice = Blob.prototype.slice; // Hack to add back in .slice().
  }*/
  successCallback(file);
};

/**
 * Interface representing a directory in the filesystem.
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/pub/FileSystem/#the-directoryentry-interface
 *
 * @constructor
 * @extends {Entry}
 */
function DirectoryEntry() {
  this.__defineGetter__('isFile', function() {
    return false;
  });

  this.__defineGetter__('isDirectory', function() {
    return true;
  });
}
DirectoryEntry.prototype = new Entry();
DirectoryEntry.prototype.constructor = DirectoryEntry; 
DirectoryEntry.prototype.createReader = function() {
  return new DirectoryReader();
};
DirectoryEntry.prototype.getDirectory = function() {};

DirectoryEntry.prototype.getFile = function(path, options, successCallback,
                                            opt_errorCallback) {
  idb.get(path, function(fileEntry) {
    if (options.create === true && options.exclusive === true && fileEntry) {
      // If create and exclusive are both true, and the path already exists,
      // getFile must fail.
      // TODO: call opt_errorCallback
    } else if (options.create === true && !fileEntry) {
      path = fixFullPath_(path);

      // If create is true, the path doesn't exist, and no other error occurs,
      // getFile must create it as a zero-length file and return a corresponding
      // FileEntry.
      var fileEntry = new FileEntry();
      fileEntry.name = path.split('/').pop(); // Just need filename.
      fileEntry.fullPath = path; // TODO(ericbidelman): set this correctly
      fileEntry.filesystem = fs_;
      fileEntry.file_ = new MyFile({size: 0, name: fileEntry.name}); // TODO: create a zero-length file and attach it (fileEntry.file_=file).

      idb.put(fileEntry, successCallback, opt_errorCallback);

    } else if (options.create === true && fileEntry) {
      // IDB won't save methods, so we need re-create the FileEntry.
      successCallback(new FileEntry(fileEntry));
    } else if (options.create === false && !fileEntry) {
      // If create is not true and the path doesn't exist, getFile must fail.
      // TODO: call opt_errorCallback
      if (opt_errorCallback) {
        opt_errorCallback(INVALID_MODIFICATION_ERR);
        return;
      }

    } else if (options.create === false && fileEntry && fileEntry.isDirectory) {
      // If create is not true and the path exists, but is a directory, getFile
      // must fail.
      // TODO: call opt_errorCallback
    } else {
      // Otherwise, if no other error occurs, getFile must return a FileEntry
      // corresponding to path.

      // IDB won't' save methods, so we need re-create the FileEntry.
      successCallback(new FileEntry(fileEntry));
    } 
  }, opt_errorCallback);
};

DirectoryEntry.prototype.removeRecursively = function(successCallback,
                                                      opt_errorCallback) {
  if (!successCallback) {
    throw Error('Expected successCallback argument.');
  }

  idb.drop(function(e) {
    successCallback();
  }, opt_errorCallback);
};

/**
 * Interface representing a filesystem.
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/pub/FileSystem/#idl-def-LocalFileSystem
 *
 * @param {number} type Kind of storage to use, either TEMPORARY or PERSISTENT.
 * @param {number} size Storage space (bytes) the application expects to need.
 * @constructor
 */
function DOMFileSystem(type, size) {
  var str = type == exports.TEMPORARY ? 'Temporary' : 'Persistent';
  var name = (location.protocol + location.host).replace(/:/g, '_') + ':' + str;

  this.name = name;
  this.root = new DirectoryEntry();
  this.root.fullPath = '/';
  this.root.filesystem = this;
  this.root.name = '';
}
//DOMFileSystem.prototype = {};


function requestFileSystem(type, size, successCallback, opt_errorCallback) {
  if (type != exports.TEMPORARY && type != exports.PERSISTENT) {
    if (opt_errorCallback) {
      opt_errorCallback(INVALID_MODIFICATION_ERR);
      return;
    }
  }

  fs_ = new DOMFileSystem(type, size);
  idb.open(fs_.name, function(e) {
    successCallback(fs_);
  }, opt_errorCallback);
}

function resolveLocalFileSystemURL(url, callback, opt_errorCallback) {
  if (opt_errorCallback) {
    opt_errorCallback(NOT_IMPLEMENTED_ERR);
    return;
  }
}

// When saving an entry, the fullPath should always lead with a slash and never
// end with one (e.g. a directory). This method ensures path is legit.
function fixFullPath_(path) {
  var fullPath = path;
  if (fullPath[0] != '/') {
    fullPath = '/' + fullPath;
  }
  if (fullPath[fullPath.length - 1] == '/') {
    fullPath = fullPath.substring(0, fullPath.length - 1);
  }
  return fullPath;
}

// =============================================================================

idb.open = function(dbName, successCallback, opt_errorCallback) {
  var self = this;

//console.log(dbName)

  // TODO(erbidelman): FF 12.0a1 isn't likeing a name with a : in it.
  var request = exports.indexedDB.open(dbName.replace(':', '_'));//, 1 /*version*/);
  //var request = exports.indexedDB.open(dbName);//, 1 /*version*/);

  var init = function(e) {
    self.db = e.target.result;
    self.db.onerror = onError;
    if (!self.db.objectStoreNames.contains(FILE_STORE)) {
      //var store = self.db.createObjectStore(FILE_STORE, {keyPath: 'id', autoIncrement: true});
      var store = self.db.createObjectStore(FILE_STORE);//, {keyPath: 'id', autoIncrement: true});
    }
  };

  request.onerror = opt_errorCallback || onError;

  request.onupgradeneeded = function(e) {
    // First open was called or higher db version was used.
    logger.log('<p>onupgradeneeded: oldVersion:' + e.oldVersion +
               ' newVersion:' + e.newVersion + '</p>');
    init(e);
  };

  request.onsuccess = function(e) {
    var db = e.target.result;
    init(e);
//logger.log('<p>Database ready</p>');
    successCallback(e);
  };

  // TODO(ericbidelman): handle blocked case.
  request.onblocked = function(e) {
    console.log('blocked');
  };

  return request;
};

idb.drop = function(successCallback, opt_errorCallback) {
  if (!this.db) {
    return;
  }

  var dbName = this.db.name;

  var request = exports.indexedDB.deleteDatabase(dbName);
  request.onsuccess = function(e) {
    successCallback(e);
  };
  request.onerror = opt_errorCallback;

  this.db.close();
  this.db = null;

  //var request = window.indexedDB.open(dbName);
  //request.onerror = onError;

  /*request.onupgradeneeded = function(e) {
    var db = e.target.result;
    db.deleteObjectStore(FILE_STORE);
  };*/

  /*request.onsuccess = function(e) {
    //var db = e.target.result;
    var r = window.indexedDB.deleteDatabase(dbName);
console.log(r)
    r.onsuccess = function(e) {
console.log('here')
      logger.log('Database deleted!');
    };
    r.onblocked = function(e) {
console.log('blocked');
    };
  };*/
};

idb.get = function(fullPath, successCallback, opt_errorCallback) {
  if (!this.db) {
    return;
  }

  var tx = this.db.transaction([FILE_STORE], IDBTransaction.READ_ONLY);

  var request = tx.objectStore(FILE_STORE).get(fullPath);
  request.onsuccess = function(e) {
    successCallback(e.target.result);
  };
  request.onerror = opt_errorCallback;
};

idb.delete = function(fullPath, successCallback, opt_errorCallback) {
  if (!this.db) {
    return;
  }

  var tx = this.db.transaction([FILE_STORE], IDBTransaction.READ_WRITE);

  var request = tx.objectStore(FILE_STORE).delete(fullPath);
  request.onsuccess = function(e) {
    successCallback(/*e.target.result*/);
  };
  request.onerror = opt_errorCallback;
};

idb.put = function(entry, successCallback, opt_errorCallback) {
  if (!this.db) {
    return;
  }

  var self = this;

  var tx = this.db.transaction([FILE_STORE], IDBTransaction.READ_WRITE);

  var request = tx.objectStore(FILE_STORE).put(entry, entry.fullPath);
  request.onsuccess = function(e) {
    // TODO: Error is thrown if we pass the request event back instead.
    successCallback(entry);
  };
  request.onerror = opt_errorCallback;
};

idb.getAllEntries = function(successCallback, opt_errorCallback) {
  if (!this.db) {
    return;
  }

  var tx = this.db.transaction([FILE_STORE], IDBTransaction.READ_ONLY);

  var results = [];
  var request = tx.objectStore(FILE_STORE).openCursor();
  request.onsuccess = function(e) {
    var cursor = e.target.result;
    if (cursor) {
      var val = cursor.value;
      // IDB wont' save methods, so we need re-create entry.
      results.push(val.isFile ? new FileEntry(val) : new DirectoryEntry(val));
      cursor.continue();
    } else {
      successCallback(results);
    }
  };
  request.onerror = opt_errorCallback;
};

// Global error handler. Errors bubble from request, to transaction, to db.
function onError(e) {
  switch (e.target.errorCode) {
    case 12:
      logger.log('Error - Attempt to open database with a lower version than current.');
      break;
    default:
      logger.log('<p>errorCode: ' + e.target.errorCode + '</p>');
  }

  console.log(e, e.code, e.message);
}

// Clean up.
// TODO: decide if this is the best place for this. 
exports.addEventListener('beforeunload', function(e) {
  idb.db.close();
}, false);

exports.idb = idb;
exports.requestFileSystem = requestFileSystem;
exports.resolveLocalFileSystemURL = resolveLocalFileSystemURL;

// Export more stuff (to window) for unit tests to do their thing.
if (exports === window && exports.RUNNING_TESTS) {
  exports['Entry'] = Entry;
  exports['FileEntry'] = FileEntry;
  exports['DirectoryEntry'] = DirectoryEntry;
}

})(self); // Don't use window because we want to run in workers.
