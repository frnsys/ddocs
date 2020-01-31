from .datastore import db
from .models import Document
from flask import Blueprint, render_template, request, jsonify
from flask_security import login_required, current_user

bp = Blueprint('main', __name__)


@bp.route('/')
@login_required
def index():
    docs = Document.query.all()
    return render_template('index.html', docs=docs)


@bp.route('/<string:id>', methods=['GET', 'POST'])
@login_required
def document(id):
    if request.method == 'GET':
        user = current_user.email
        doc = Document.query.get(id)
        if doc is not None:
            doc = doc.data
        return render_template('document.html', id=id, doc=doc, user=user)
    else:
        doc = Document.query.get(id)
        data = request.json['doc']
        if doc is None:
            doc = Document(id=id, data=data)
        doc.data = data
        db.session.add(doc)
        db.session.commit()
        return jsonify(success=True)
