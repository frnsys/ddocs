import React from 'react';
import Paper from './Paper';
import Document from './components/Document';
import {render} from 'react-dom';
import io from 'socket.io-client';
import Swarm from './Swarm';

const socket = io();
socket.on('connect', () => {
  let swarm = new Swarm(socket, DOCUMENT_ID);

  let doc;
  if (DOCUMENT) {
    console.log('Loading existing')
    doc = Paper.load(USER, DOCUMENT_ID, DOCUMENT, swarm);
  } else {
    console.log('Creating new');
    doc = Paper.new(USER, DOCUMENT_ID, swarm);
  }

  let main = document.getElementById('document');
  render(<Document doc={doc} id={swarm.id} />, main);
});
