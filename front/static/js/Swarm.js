import Peer from 'simple-peer';

class Swarm {
  constructor(socket, swarmId) {
    this.id = socket.id;
    this.peers = {};
    this._connecting = {};
    this._handlers = {};

    // Tell server to tell
    // other peers we're here
    socket.emit('peer:intro', {
      id: swarmId,
      peerId: this.id
    });

    // New peer joined,
    // initiate connection
    socket.on('peer:joined', (data) => {
      const peerId = data.id;
      console.log(`Peer joined ${peerId}`);
      const peer = new Peer({ initiator: true, objectMode: true });
      peer.on('signal', (data) => {
        socket.emit('peer:offer', {
          fromId: this.id,
          peerId: peerId,
          signal: data
        });
      });

      this.addPeer(peerId, peer);
    });

    // Received offer from peer,
    // prep connection and send response
    socket.on('peer:offer', (data) => {
      console.log(`Received offer from ${data.peerId}`);
      const peerId = data.peerId;
      const peer = new Peer({ objectMode: true });
      peer.on('signal', (data) => {
        socket.emit('peer:response', {
          fromId: this.id,
          peerId: peerId,
          signal: data
        });
      });
      peer.signal(data.signal);
      this.addPeer(peerId, peer);
    });

    // Received response from peer,
    // use their signal to complete connection
    socket.on('peer:response', (data) => {
      console.log(`Received response from ${data.peerId}`);
      if (this._connecting[data.peerId]) {
        this._connecting[data.peerId].signal(data.signal);
      }
    });
  }

  addPeer(id, peer) {
    this._connecting[id] = peer;

    peer.on('connect', () => {
      console.log(`Connected to peer ${id}`);
      // peer.send(`hello from ${this.id}`);

      delete this._connecting[id];
      this.peers[id] = peer;

      (this._handlers['connect'] || []).forEach((fn) => {
        fn(id, peer);
      });
    });
    peer.on('close', (data) => {
      console.log(`Disconnected from peer ${id}`);
      delete this.peers[id];
    });
    peer.on('error', (err) => {
      console.log(`Error from peer ${id}`);
      console.log(err);
    });
    // peer.on('data', (data) => {
    //   console.log(data);
    // });
  }

  broadcast(data) {
    Object.values(this.peers).forEach((peer) => {
      peer.send(data);
    });
  }

  on(event, fn) {
    if (!(event in this._handlers)) {
      this._handlers[event] = [];
    }
    this._handlers[event].push(fn);
  }
}

export default Swarm;
