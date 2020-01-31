import functools
from flask import session
from flask_security import current_user
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect, rooms

socketio = SocketIO()

def authenticated_only(f):
    @functools.wraps(f)
    def wrapped(*args, **kwargs):
        if not current_user.is_authenticated:
            disconnect()
        else:
            return f(*args, **kwargs)
    return wrapped


@socketio.on('peer:intro')
@authenticated_only
def peer_intro(msg):
    room = msg['id']
    join_room(room)
    emit('peer:joined', {'id': msg['peerId']}, room=room, include_self=False)


@socketio.on('peer:offer')
@authenticated_only
def peer_offer(msg):
    peer_id = msg['peerId']
    emit('peer:offer', {'peerId': msg['fromId'], 'signal': msg['signal']}, room=peer_id)


@socketio.on('peer:response')
@authenticated_only
def peer_response(msg):
    peer_id = msg['peerId']
    emit('peer:response', {'peerId': msg['fromId'], 'signal': msg['signal']}, room=peer_id)


@socketio.on('disconnect')
def disconnected():
    for room in rooms():
        leave_room(room)
