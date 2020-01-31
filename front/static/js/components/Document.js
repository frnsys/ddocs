import Peer from './Peer';
import Editor from './Editor';
import Comments from './Comments';
import Highlight from './Highlight';
import InlineEditable from './InlineEditable';
import React, {Component} from 'react';

function commentForCaret(comments, start, end) {
  return comments.find((c) => c.start <= start && c.end >= end);
}

class Doc extends Component {
  constructor(props) {
    super(props);
    this.state = {
      scrollTop: 0,
      focusedComment: null,
      doc: props.doc,
      peers: props.doc.peers
    };
    this.editor = React.createRef();

    props.doc.on('updated', (doc) => this.setState({ doc }));
    props.doc.on('updatedPeers', (peers) => this.setState({ peers }));
  }

  onScroll(scrollTop) {
    this.setState({ scrollTop });
  }

  onSelect(caretPos, caretIdx) {
    // find focused comment, if any
    let comments = Object.values(this.state.doc.comments);
    let focusedComment = comments.find((c) => c.start <= caretIdx.start && c.end >= caretIdx.end);

    this.setState({
      caretPos: caretPos,
      caretIdx: caretIdx,
      addNewComment: !focusedComment && caretIdx.start != caretIdx.end,
      focusedComment: focusedComment ? focusedComment.id : null
    });

    this.state.doc.setSelection(this.props.id, caretPos, caretIdx);
  }

  render() {
    let text = this.state.doc.text;
    let peers = Object.values(this.state.peers).filter((p) => p.id !== this.props.id && p.pos);
    let activeComments = Object.values(this.state.doc.comments).filter((c) => !c.resolved);

    let caretTop = this.state.caretPos ? this.state.caretPos.start.top : 0;
    let addComment = <Comments top={caretTop} focused={true} thread={[]} add={(_, body) => {
      if (body) {
        let { start, end } = this.state.caretIdx;
        this.state.doc.addComment(this.props.id, null, body, start, end);
        this.editor.current.focus();
      }
    }} />;

    return <div id='doc'>
      <div className='doc-header'>
        <InlineEditable
          className='doc-title'
          value={this.state.doc.title}
          onEdit={(title) => this.state.doc.title = title} />
        <div>{Object.keys(this.state.peers).length} peers</div>
      </div>
      <div id='editor'>
        <div className='doc-editor'>
          <div className='doc-overlay' style={{top: -this.state.scrollTop}}>
            {activeComments.map((c) => {
              let focused = c.id === this.state.focusedComment;
              return <Comments
                key={c.id}
                top={caretTop}
                focused={focused}
                doc={this.state.doc}
                add={(id, body) => this.state.doc.addComment(this.props.id, id, body)}
                resolve={() => this.state.doc.resolveComment(c.id)}
                {...c} />
            })}
            {this.state.addNewComment && addComment}
          </div>
          <div className='doc-editor-constrained'>
            <div className='doc-overlay' style={{position: 'absolute', top: -this.state.scrollTop}}>
              {activeComments.map((c) => {
                return <Highlight key={c.id} text={text} start={c.start} end={c.end} color='blue' />;
              })}
              {peers.map((p) => <Peer key={p.id} peer={p} text={text} />)}
            </div>
            <Editor
              ref={this.editor}
              text={this.state.doc.text}
              diffs={this.state.doc.diffs}
              onScroll={this.onScroll.bind(this)}
              onSelect={this.onSelect.bind(this)}
              onEdit={(edits) => this.state.doc.editText(edits)} />
          </div>
        </div>
      </div>
    </div>;
  }
}

export default Doc;
