import cuid from 'cuid';
import Peer from 'simple-peer';
import Automerge from 'automerge';
import EventEmitter from 'events';

const SAVE_INTERVAL = 1000;
const COLORS = [
  '#1313ef',
  '#ef1321',
  '#24b554',
  '#851fd3',
  '#0eaff4',
  '#edc112',
  '#7070ff'
];

class Paper extends EventEmitter {
  constructor(user, id, doc, swarm) {
    super();
    this.id = id;
    this.doc = doc;
    this.diffs = [];
    this.user = user;
    this.swarm = swarm;

    // So Automerge can handle changes
    this.docSet = new Automerge.DocSet();
    this.docSet.setDoc(this.id, this.doc);

    // Log changes
    this._changesSinceSave = 0;
    this.docSet.registerHandler((docId, doc) => {
      // console.log(`[${docId}] ${JSON.stringify(doc)}`)
      this._changesSinceSave += 1;
    });

    // Automerge p2p connections
    this.peers = {};
    this.conns = {};
    swarm.on('connect', (id, peer) => {
      let color = COLORS[parseInt(id, 16) % COLORS.length];
      this.peers[id] = {
        id: id,
        name: id,
        color: color
      };
      this.emit('updatedPeers', this.peers);

      console.log(`Created Automerge connection for peer: ${id}`);
      this.conns[id] = new Automerge.Connection(this.docSet, (msg) => {
        peer.send(JSON.stringify({
          type: 'change',
          change: msg
        }));
      });
      this.conns[id].open();

      peer.on('data', (data) => {
        data = JSON.parse(data);
        switch (data.type) {
          case 'change':
            console.log(`New change from peer: ${id}`);
            this._applyChange(this.conns[id], data.change);
            break;
          case 'peer':
            this.peers[id].pos = data.pos;
            this.peers[id].idx = data.idx;
            this.emit('updatedPeers', this.peers);
            break;
          default:
            console.log(`Unrecognized peer message: ${data.type}`)
        }
      });
      peer.on('close', () => {
        this.conns[id].close();
        delete this.conns[id]
        delete this.peers[id];
        this.emit('updatedPeers', this.peers);
      });
    });

    setInterval(() => {
      if (this._changesSinceSave > 0) {
        console.log('Saving...');
        this.save();
        this._changesSinceSave = 0;
      }
    }, SAVE_INTERVAL);
  }

  static new(user, id, swarm) {
    let doc = Automerge.from({
        text: new Automerge.Text(),
        title: 'Untitled',
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
    fetch(`/${this.id}/state`, {
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
  }

  _applyChange(conn, change) {
    let prevDoc = this.doc;
    conn.receiveMsg(change);
    this.doc = this.docSet.getDoc(this.id);
    this._updateDoc(prevDoc, this.doc);
  }

  _updateDoc(prevDoc, newDoc) {
    let diff = Automerge.diff(prevDoc, newDoc);
    this.lastDiffs = diff.filter((d) => d.type === 'text');
    this.emit('updated', this);
  }

  setSelection(peerId, caretPos, caretIdx) {
    // Update peers about caret position
    this.swarm.broadcast(JSON.stringify({
      type: 'peer',
      pos: caretPos,
      idx: caretIdx
    }));
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

  addComment(threadId, body, start, end) {
    if (!body) return;
    this._createChange((changeDoc) => {
      let name = this.user;
      let commentId = cuid();
      let comment = {
        id: commentId,
        created: Date.now(),
        author: name,
        body: body
      };
      if (threadId) {
        changeDoc.comments[threadId].thread.push(comment);
      } else {
        threadId = cuid();
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
