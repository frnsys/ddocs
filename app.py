from lib import create_app

app = create_app()

if __name__ == '__main__':
    app.socketio.run(app, host='0.0.0.0', port=5001, debug=True)
