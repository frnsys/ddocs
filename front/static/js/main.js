import io from 'socket.io-client';
import * as Automerge from 'automerge';

// Load or create document
let doc;
const docSet = new Automerge.DocSet();

if (!DOCUMENT) {
  doc = Automerge.from({
      text: new Automerge.Text(),
      title: 'Untitled',
      peers: {},
      comments: {}
  });
} else {
  doc = Automerge.load(DOCUMENT);
}
docSet.setDoc(DOCUMENT_ID, doc);

// Log changes
docSet.registerHandler((docId, doc) => {
  console.log(`[${docId}] ${JSON.stringify(doc)}`)
})

const conn = new Automerge.Connection(docSet, (msg) => {
  console.log(msg);
  socket.emit('doc:change', {
    id: DOCUMENT_ID,
    change: JSON.stringify(msg)
  });
});
conn.open();

const socket = io();
socket.on('connect', function() {
  console.log('CONNECTED');
  socket.emit('joined', {
    id: DOCUMENT_ID
  });
});

socket.on('peer:joined', function(data) {
  console.log(data);
});

socket.on('peer:left', function(data) {
  console.log('left:');
  console.log(data);
});

socket.on('doc:change', function(data) {
  console.log('Received changes');
  console.log(data);
  conn.receiveMsg(JSON.parse(data['change']));
  doc = docSet.getDoc(DOCUMENT_ID);

  // This will lead to redundant saves,
  // but...that's ok for now
  socket.emit('doc:save', {
    id: DOCUMENT_ID,
    doc: Automerge.save(doc)
  });
})

// TESTING
function change() {
  doc = Automerge.change(doc, doc => {
    doc.clientNum = (doc.clientNum || 0) + 1
  })
  docSet.setDoc(DOCUMENT_ID, doc)
}
window.testChange = change;
