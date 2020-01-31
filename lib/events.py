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


@socketio.on('joined')
@authenticated_only
def joined(msg):
    room = msg['id']
    join_room(room)
    emit('peer:joined', {'peer': current_user.email}, room=room, include_self=False)


@socketio.on('disconnect')
def disconnected():
    for room in rooms():
        leave_room(room)
        emit('peer:left', {'peer': current_user.email}, room=room, include_self=False)


@socketio.on('doc:change')
@authenticated_only
def change(msg):
    room = msg['id']
    emit('doc:change', {'change': msg['change']}, room=room, include_self=False)


@socketio.on('doc:save')
@authenticated_only
def save(msg):
    room = msg['id']
    emit('doc:change', {'change': msg['change']}, room=room, include_self=False)

