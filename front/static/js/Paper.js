import crypto from 'crypto';
import Peer from 'simple-peer';
import Automerge from 'automerge';
import EventEmitter from 'events';

class Paper extends EventEmitter {
  constructor(user, id, doc, swarm) {
    super();
    this.id = id;
    this.doc = doc;
    this.diffs = [];

    // So Automerge can handle changes
    this.docSet = new Automerge.DocSet();
    this.docSet.setDoc(this.id, this.doc);

    // Log changes
    // this.docSet.registerHandler((docId, doc) => {
    //   console.log(`[${docId}] ${JSON.stringify(doc)}`)
    // });

    // Automerge p2p connections
    this.conns = {};
    swarm.on('connect', (id, peer) => {
      console.log(`Created Automerge connection for peer: ${id}`);
      this.conns[id] = new Automerge.Connection(this.docSet, (msg) => {
        peer.send(JSON.stringify(msg));
      });
      this.conns[id].open();

      this.join(user, user, '#ff0000');

      peer.on('data', (data) => {
        console.log(`New change from peer: ${id}`);
        this._applyChange(this.conns[id], data);
      });
      peer.on('close', () => {
        console.log('PEER LEFT!');
        this.conns[id].close();
        delete this.conns[id]
        this.leave(id);
      });
    });
  }

  static new(user, id, swarm) {
    let doc = Automerge.from({
        text: new Automerge.Text(),
        title: 'Untitled',
        peers: {},
        comments: {}
    });

    let paper = new Paper(user, id, doc, swarm);
    paper.save();
    return paper;
  }

  static load(user, id, init, swarm) {
    let doc = Automerge.load(init);
    return new Paper(user, id, doc, swarm);
  }

  save() {
    fetch(`/${this.id}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        doc: Automerge.save(this.doc)
      })
    })
      .then(res => res.json())
      .then((data) => {})
      .catch(err => { throw err });
  }

  get peers() {
    return this.doc.peers;
  }

  get nPeers() {
    return Object.keys(this.doc.peers).length;
  }

  get text() {
    return this.doc.text.toString();
  }

  get title() {
    return this.doc.title;
  }

  set title(title) {
    this._createChange((changeDoc) => {
      changeDoc.title = title;
    });
  }

  get comments() {
    return this.doc.comments;
  }

  _createChange(changeFn) {
    let prevDoc = this.doc;
    this.doc = Automerge.change(this.doc, changeFn);
    this.docSet.setDoc(this.id, this.doc);
    this._updateDoc(prevDoc, this.doc);
    this.save();
  }

  _applyChange(conn, change) {
    let prevDoc = this.doc;
    conn.receiveMsg(JSON.parse(change));
    this.doc = this.docSet.getDoc(this.id);
    this._updateDoc(prevDoc, this.doc);
  }

  _updateDoc(prevDoc, newDoc) {
    let diff = Automerge.diff(prevDoc, newDoc);
    this.lastDiffs = diff.filter((d) => d.type === 'text');
    this.emit('updated', this);
  }

  setSelection(peerId, caretPos, caretIdx) {
    // update peers about caret position
    this._createChange((changeDoc) => {
      changeDoc.peers[peerId].pos = caretPos;
      changeDoc.peers[peerId].idx = caretIdx;
    });
  }

  editText(edits) {
    this._createChange((changeDoc) => {
      edits.forEach((e) => {
        if (e.inserted) {
          changeDoc.text.insertAt(e.caret, ...e.changed);
        } else {
          for (let i=0; i<e.diff; i++) {
            changeDoc.text.deleteAt(e.caret);
          }
        }

        // update comment positions as well
        Object.values(changeDoc.comments).forEach((c) => {
          if (e.caret < c.start + 1) {
            if (e.inserted) {
              c.start++;
            } else {
              c.start--;
            }
          }

          if (e.caret < c.end) {
            if (e.inserted) {
              c.end++;
            } else {
              c.end--;
            }
          }
        });
      });
    });
  }

  join(id, name, color) {
    this._createChange((changeDoc) => {
      changeDoc.peers[id] = {
          id: id,
          name: name,
          color: color
      };
    });
  }

  leave(id) {
    this._createChange((changeDoc) => {
      delete changeDoc.peers[id];
    });
  }

  addComment(peerId, threadId, body, start, end) {
    if (!body) return;
    this._createChange((changeDoc) => {
      // TODO ideally this uses persistent id or sth
      let name = changeDoc.peers[peerId].name;
      let commentId = crypto.randomBytes(32).toString('hex');
      let comment = {
        id: commentId,
        created: Date.now(),
        author: name,
        body: body
      };
      if (threadId) {
        changeDoc.comments[threadId].thread.push(comment);
      } else {
        threadId = crypto.randomBytes(32).toString('hex');
        changeDoc.comments[threadId] = {
          id: threadId,
          start: start,
          end: end,
          resolved: false,
          thread: [comment]
        };
      }
    });
  }

  resolveComment(threadId) {
    this._createChange((changeDoc) => {
      changeDoc.comments[threadId].resolved = true;
    });
  }
}

export default Paper;
