import React from 'react';
import Paper from './Paper';
import Document from './components/Document';
import {render} from 'react-dom';
import io from 'socket.io-client';
import Swarm from './Swarm';

const socket = io();
socket.on('connect', () => {
  let swarm = new Swarm(socket, DOCUMENT_ID);

  fetch(`/${DOCUMENT_ID}/state`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    credentials: 'same-origin'
  })
    .then(res => res.json())
    .then((data) => {
      let doc;
      if (data.document) {
        doc = Paper.load(USER, DOCUMENT_ID, data.document, swarm);
      } else {
        console.log('Creating new');
        doc = Paper.new(USER, DOCUMENT_ID, swarm);
      }
      let main = document.getElementById('document');
      render(<Document doc={doc} id={swarm.id} />, main);
    })
    .catch(err => { throw err });
});
