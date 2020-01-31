from .models import Document
from flask import Blueprint, render_template
from flask_security import login_required

bp = Blueprint('main', __name__)


@bp.route('/')
@login_required
def index():
    docs = Document.query.all()
    return render_template('index.html', docs=docs)


@bp.route('/<string:id>')
@login_required
def document(id):
    return render_template('document.html', id=id, doc='["~#iL",[]]')
