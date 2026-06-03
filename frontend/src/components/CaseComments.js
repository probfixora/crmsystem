import React, { useState, useEffect, useRef } from 'react';
import { edgeFetch, EDGE } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { MessageSquare, Send, Loader2, Reply, ChevronDown, ChevronUp } from 'lucide-react';

const roleColors = {
  admin:             { bg: '#eef2ff', color: '#4f46e5' },
  sales:             { bg: '#ecfdf5', color: '#059669' },
  banking:           { bg: '#fffbeb', color: '#b45309' },
  inventory:         { bg: '#f0f9ff', color: '#0369a1' },
  installation:      { bg: '#fdf4ff', color: '#9333ea' },
  field_installation:{ bg: '#fdf4ff', color: '#9333ea' },
  electrical:        { bg: '#fff1f2', color: '#be123c' },
  subsidy:           { bg: '#f0fdfa', color: '#0d9488' },
};

// ── Comment type config ───────────────────────────────────────────────────────
const COMMENT_TYPES = [
  { id: 'note',    label: 'Note',    bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
  { id: 'handoff', label: 'Handoff', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  { id: 'issue',   label: 'Issue',   bg: '#fff1f2', color: '#be123c', border: '#fecdd3' },
  { id: 'update',  label: 'Update',  bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
];
const getTypeConfig = (t) => COMMENT_TYPES.find(c => c.id === t) || COMMENT_TYPES[0];

const timeAgo = (date) => {
  const secs = Math.floor((Date.now() - new Date(date)) / 1000);
  if (secs < 60)    return 'just now';
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// ── Single comment card (recursive for threaded replies) ──────────────────────
const CommentCard = ({ comment, depth = 0, onReply, replyingToId, replyText, setReplyText, onPostReply, posting }) => {
  const [showReplies, setShowReplies] = useState(true);
  const rc  = roleColors[comment.role] || { bg: '#f1f5f9', color: '#475569' };
  const tc  = getTypeConfig(comment.comment_type || 'note');
  const replies = comment.replies || [];

  return (
    <div style={{ marginLeft: depth > 0 ? '20px' : 0 }}>
      {/* Left threading line for replies */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {depth > 0 && (
          <div style={{ width: '2px', background: '#e2e8f0', borderRadius: '1px', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1 }}>
          {/* Comment card */}
          <div style={{
            background: depth === 0 ? '#f8fafc' : '#fff',
            border: `1px solid ${depth === 0 ? '#f1f5f9' : '#e2e8f0'}`,
            borderRadius: '10px', padding: '9px 11px', marginBottom: '6px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                {/* Author badge */}
                <span style={{ fontSize: '11px', fontWeight: 700, color: rc.color, background: rc.bg, padding: '1px 7px', borderRadius: '20px' }}>
                  {comment.author}
                </span>
                {/* Role pill */}
                <span style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', textTransform: 'capitalize' }}>
                  {comment.role}
                </span>
                {/* Comment type pill — always shown for clarity */}
                <span style={{ fontSize: '10px', fontWeight: 700, color: tc.color, background: tc.bg, border: `1px solid ${tc.border}`, padding: '1px 7px', borderRadius: '20px' }}>
                  {tc.label}
                </span>
              </div>
              <span style={{ fontSize: '10.5px', color: '#cbd5e1', flexShrink: 0 }}>{timeAgo(comment.createdAt || comment.created_at)}</span>
            </div>
            <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.5, margin: '0 0 6px 0' }}>{comment.text}</p>

            {/* Reply + show/hide threads buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => onReply(comment.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}
              >
                <Reply style={{ width: '11px', height: '11px' }} /> Reply
              </button>
              {replies.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowReplies(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}
                >
                  {showReplies ? <ChevronUp style={{ width: '11px', height: '11px' }} /> : <ChevronDown style={{ width: '11px', height: '11px' }} />}
                  {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </button>
              )}
            </div>

            {/* Inline reply composer for this comment */}
            {replyingToId === comment.id && (
              <form
                onSubmit={(e) => onPostReply(e, comment.id)}
                style={{ display: 'flex', gap: '6px', marginTop: '8px' }}
              >
                <input
                  autoFocus
                  type="text"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder={`Replying to ${comment.author}…`}
                  style={{
                    flex: 1, padding: '6px 10px', fontSize: '12px',
                    border: '1px solid #6366f1', borderRadius: '7px',
                    outline: 'none', fontFamily: 'inherit', color: '#0f172a',
                    boxShadow: '0 0 0 3px rgba(99,102,241,0.1)',
                  }}
                />
                <button
                  type="submit" disabled={posting || !replyText.trim()}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '30px', height: '30px', borderRadius: '7px', border: 'none',
                    background: posting || !replyText.trim() ? '#e2e8f0' : '#6366f1',
                    cursor: posting || !replyText.trim() ? 'not-allowed' : 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {posting
                    ? <Loader2 style={{ width: '12px', height: '12px', color: '#94a3b8', animation: 'spin 0.8s linear infinite' }} />
                    : <Send style={{ width: '12px', height: '12px', color: '#fff' }} />
                  }
                </button>
              </form>
            )}
          </div>

          {/* Threaded replies */}
          {showReplies && replies.map((reply, i) => (
            <CommentCard
              key={reply.id || i}
              comment={reply}
              depth={depth + 1}
              onReply={onReply}
              replyingToId={replyingToId}
              replyText={replyText}
              setReplyText={setReplyText}
              onPostReply={onPostReply}
              posting={posting}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Build threaded tree from flat list ───────────────────────────────────────
const buildThreadTree = (flat) => {
  const byId = {};
  const roots = [];
  // Index all by id
  for (const c of flat) byId[c.id] = { ...c, replies: [] };
  // Attach replies to parents
  for (const c of flat) {
    if (c.parent_id && byId[c.parent_id]) {
      byId[c.parent_id].replies.push(byId[c.id]);
    } else {
      roots.push(byId[c.id]);
    }
  }
  return roots;
};

// ── Main CaseComments component ──────────────────────────────────────────────
const CaseComments = ({ caseId }) => {
  const [comments, setComments]       = useState([]);
  const [text, setText]               = useState('');
  const [commentType, setCommentType] = useState('note');
  const [loading, setLoading]         = useState(true);
  const [posting, setPosting]         = useState(false);
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText]       = useState('');
  const bottomRef                     = useRef(null);

  const fetchComments = async () => {
    try {
      const data = await edgeFetch(EDGE.workflow, { action: 'get_comments', caseId });
      setComments(data || []);
    } catch {
      // silently ignore — comments are optional
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (caseId) fetchComments(); }, [caseId]); // eslint-disable-line

  // Post a new top-level comment
  const handlePost = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    try {
      const comment = await edgeFetch(EDGE.workflow, {
        action: 'add_comment',
        caseId,
        text,
        comment_type: commentType,
      });
      setComments(prev => [comment, ...prev]);
      setText('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {
      toast.error('Could not post comment.');
    } finally {
      setPosting(false);
    }
  };

  // Post a threaded reply
  const handlePostReply = async (e, parentId) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setPosting(true);
    try {
      const comment = await edgeFetch(EDGE.workflow, {
        action: 'add_comment',
        caseId,
        text: replyText,
        comment_type: 'note',
        parent_id: parentId,
      });
      // Refresh full list to get proper threaded order
      const updated = await edgeFetch(EDGE.workflow, { action: 'get_comments', caseId });
      setComments(updated || []);
      setReplyText('');
      setReplyingToId(null);
      toast.success('Reply posted.');
    } catch {
      toast.error('Could not post reply.');
    } finally {
      setPosting(false);
    }
  };

  const handleReply = (commentId) => {
    setReplyingToId(prev => prev === commentId ? null : commentId);
    setReplyText('');
  };

  const threadedComments = buildThreadTree(comments);

  return (
    <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
        <MessageSquare style={{ width: '14px', height: '14px', color: '#6366f1' }} />
        <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>Team Notes</span>
        {comments.length > 0 && (
          <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '1px 7px', borderRadius: '20px' }}>
            {comments.length}
          </span>
        )}
      </div>

      {/* Comment list */}
      <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0', marginBottom: '10px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '16px' }}>
            <Loader2 style={{ width: '16px', height: '16px', color: '#cbd5e1', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : threadedComments.length === 0 ? (
          <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>
            No notes yet — be the first to add one
          </p>
        ) : (
          threadedComments.map((c, i) => (
            <CommentCard
              key={c.id || i}
              comment={c}
              depth={0}
              onReply={handleReply}
              replyingToId={replyingToId}
              replyText={replyText}
              setReplyText={setReplyText}
              onPostReply={handlePostReply}
              posting={posting}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Comment type selector */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '8px', flexWrap: 'wrap' }}>
        {COMMENT_TYPES.map(ct => (
          <button
            key={ct.id}
            type="button"
            onClick={() => setCommentType(ct.id)}
            style={{
              fontSize: '11px', fontWeight: 700,
              padding: '3px 10px', borderRadius: '20px',
              border: `1px solid ${commentType === ct.id ? ct.border : '#e2e8f0'}`,
              background: commentType === ct.id ? ct.bg : '#f8fafc',
              color: commentType === ct.id ? ct.color : '#94a3b8',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {ct.label}
          </button>
        ))}
      </div>

      {/* Post form */}
      <form onSubmit={handlePost} style={{ display: 'flex', gap: '6px' }}>
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={`Add a ${commentType}…`}
          disabled={posting}
          style={{
            flex: 1, padding: '8px 12px', fontSize: '12.5px',
            border: '1px solid #e2e8f0', borderRadius: '8px',
            outline: 'none', fontFamily: 'inherit', color: '#0f172a',
            background: posting ? '#f8fafc' : '#fff',
          }}
          onFocus={e  => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
          onBlur={e   => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
        />
        <button
          type="submit"
          disabled={posting || !text.trim()}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '34px', height: '34px', borderRadius: '8px', border: 'none',
            background: posting || !text.trim() ? '#e2e8f0' : '#6366f1',
            cursor: posting || !text.trim() ? 'not-allowed' : 'pointer',
            flexShrink: 0, transition: 'background 0.15s',
          }}
        >
          {posting
            ? <Loader2 style={{ width: '13px', height: '13px', color: '#94a3b8', animation: 'spin 0.8s linear infinite' }} />
            : <Send style={{ width: '13px', height: '13px', color: posting || !text.trim() ? '#94a3b8' : '#fff' }} />
          }
        </button>
      </form>
    </div>
  );
};

export default CaseComments;
