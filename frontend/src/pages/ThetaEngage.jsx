import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Globe,
  Menu,
  X,
  Heart,
  MessageCircle,
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ImagePlus,
  Users,
  Plus,
  Lock,
  ArrowLeft,
  Shield,
  UserPlus,
  Search,
} from "lucide-react";
import useStore from "../store/useStore";
import { engageService, companyService } from "../services/api";
import { renderMarkdown } from "../utils/renderMarkdown";
import toast from "react-hot-toast";
import Sidebar from "../components/Sidebar";
import "./ThetaEngage.css";

const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

// Exported so SuperAdminPage can embed it without the page shell + sidebar
export const ThetaEngageContent = ({ embedded = false }) => {
  const { user } = useStore();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [commentingId, setCommentingId] = useState(null);
  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [groups, setGroups] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [postGroupId, setPostGroupId] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  const [profileUser, setProfileUser] = useState(null);

  const [triggeringSummary, setTriggeringSummary] = useState(false);

  const [companyFilter, setCompanyFilter] = useState('');
  const [companies, setCompanies] = useState([]);

  const loadGroups = async () => {
    try {
      const data = await engageService.getGroups();
      setGroups(data.groups || []);
    } catch (err) {
      console.error("Failed to load groups", err);
    }
  };

  const loadPosts = async (filter, companyId) => {
    const f = filter ?? activeFilter;
    const cid = companyId !== undefined ? companyId : companyFilter;
    try {
      let groupId = '';
      let userId = '';
      if (f && f !== 'all' && !f.startsWith('user:')) groupId = f;
      if (f && f.startsWith('user:')) userId = f.split(':')[1];
      const data = await engageService.getPosts(groupId, userId, cid);
      setPosts(data.posts || []);
    } catch (err) {
      console.error("Failed to load posts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
    loadPosts();
    const interval = setInterval(() => loadPosts(), 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadPosts(activeFilter, companyFilter);
  }, [activeFilter, companyFilter]);

  useEffect(() => {
    if (embedded) {
      companyService.listAll().then(data => setCompanies(Array.isArray(data) ? data : [])).catch(() => {});
    }
  }, [embedded]);

  const handleCreatePost = async () => {
    if (!newPost.trim() && !imageFile) return;
    setPosting(true);
    try {
      let imgUrl = '';
      if (imageFile) {
        setUploadingImage(true);
        const uploadRes = await engageService.uploadImage(imageFile);
        imgUrl = uploadRes.image_url || '';
        setUploadingImage(false);
      }
      await engageService.createPost(newPost.trim(), 'manual', imgUrl, postGroupId);
      setNewPost("");
      setImageFile(null);
      setImagePreview(null);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      await loadPosts();
      toast.success("Posted to Theta Engage!");
    } catch (err) {
      toast.error("Failed to create post");
    } finally {
      setPosting(false);
      setUploadingImage(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const openCreateGroup = async () => {
    setShowCreateGroup(true);
    setNewGroupName("");
    setSelectedMembers([]);
    setMemberSearch("");
    try {
      const data = await engageService.getUsers();
      setAllUsers((data.users || []).filter(u => u.id !== user?.id));
    } catch { setAllUsers([]); }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setCreatingGroup(true);
    try {
      const memberIds = [user.id, ...selectedMembers];
      await engageService.createGroup(newGroupName.trim(), memberIds);
      toast.success("Group created!");
      setShowCreateGroup(false);
      await loadGroups();
    } catch (err) {
      toast.error("Failed to create group");
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    try {
      await engageService.deleteGroup(groupId);
      setGroups(prev => prev.filter(g => g.id !== groupId));
      if (activeFilter === groupId) setActiveFilter("all");
      toast.success("Group deleted");
    } catch (err) {
      toast.error("Failed to delete group");
    }
  };

  const toggleMember = (uid) => {
    setSelectedMembers(prev =>
      prev.includes(uid)
        ? prev.filter(id => id !== uid)
        : [...prev, uid]
    );
  };

  const handleDelete = async (postId) => {
    try {
      await engageService.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success("Post deleted");
    } catch (err) {
      toast.error("Failed to delete post");
    }
  };

  const handleLike = async (postId) => {
    try {
      const data = await engageService.toggleLike(postId);
      setPosts((prev) => prev.map((p) => (p.id === postId ? data.post : p)));
    } catch (err) {
      toast.error("Failed to update like");
    }
  };

  const handleComment = async (postId) => {
    const text = (commentInputs[postId] || "").trim();
    if (!text) return;
    setCommentingId(postId);
    try {
      const data = await engageService.addComment(postId, text);
      setPosts((prev) => prev.map((p) => (p.id === postId ? data.post : p)));
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    } catch (err) {
      toast.error("Failed to add comment");
    } finally {
      setCommentingId(null);
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      const data = await engageService.deleteComment(postId, commentId);
      setPosts((prev) => prev.map((p) => (p.id === postId ? data.post : p)));
    } catch (err) {
      toast.error("Failed to delete comment");
    }
  };

  const toggleComments = (postId) => {
    setExpandedComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const viewMemberProfile = (userId, userName) => {
    setProfileUser({ id: userId, name: userName });
    setActiveFilter(`user:${userId}`);
  };

  const closeProfile = () => {
    setProfileUser(null);
    setActiveFilter("all");
  };

  const getGroupName = (groupId) => {
    const g = groups.find(gr => gr.id === groupId);
    return g ? g.name : 'Group';
  };

  const autoResize = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  const handleTriggerMonthlySummary = async () => {
    setTriggeringSummary(true);
    try {
      await engageService.triggerMonthlySummary();
      toast.success("Monthly summary is being generated — it'll appear shortly!");
      setTimeout(() => loadPosts(), 5000);
    } catch (err) {
      toast.error("Failed to trigger summary");
    } finally {
      setTriggeringSummary(false);
    }
  };

  const Outer = embedded ? 'div' : 'main';

  return (
    <>
      <Outer className={embedded ? undefined : 'te-main'}>
      {!embedded && (
        <div className="te-banner">
          <div className="te-banner-content">
            <div className="te-banner-text">
              <h1 className="te-title">Theta Engage</h1>
              <p className="te-subtitle">Your enterprise collaboration hub — connect, share insights, and drive project excellence</p>
            </div>
            <div className="te-banner-stats">
              <div className="te-stat-pill"><span className="te-stat-num">{posts.length}</span><span className="te-stat-label">Posts</span></div>
              <div className="te-stat-pill"><span className="te-stat-num">{groups.length}</span><span className="te-stat-label">Groups</span></div>
              <div className="te-stat-pill"><span className="te-stat-num">{[...new Set(posts.map(p => p.user_id))].length}</span><span className="te-stat-label">Members</span></div>
            </div>
          </div>
        </div>
      )}

      <div className="te-layout">
          {/* Feed Column */}
          <div className="te-feed-col">
            {profileUser && (
              <div className="te-profile-header">
                <button className="te-profile-back" onClick={closeProfile}><ArrowLeft size={16} /> Back to Feed</button>
                <div className="te-profile-info">
                  <div className="te-profile-avatar">{profileUser.name?.charAt(0).toUpperCase()}</div>
                  <div>
                    <h3 className="te-profile-name">{profileUser.name}</h3>
                    <p className="te-profile-sub">{posts.length} post{posts.length !== 1 ? 's' : ''} · {posts.reduce((a, p) => a + (p.likes?.length || 0), 0)} likes received</p>
                  </div>
                </div>
              </div>
            )}

            {!profileUser && (
              <div className="te-filter-tabs">
                <button className={`te-filter-tab ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}>
                  <Globe size={14} /> All Posts
                </button>
                {groups.map(g => (
                  <button key={g.id} className={`te-filter-tab ${activeFilter === g.id ? 'active' : ''}`} onClick={() => setActiveFilter(g.id)}>
                    <Lock size={12} /> {g.name}
                  </button>
                ))}
                {embedded && companies.length > 0 && (
                  <select
                    className="te-company-filter-select"
                    value={companyFilter}
                    onChange={e => setCompanyFilter(e.target.value)}
                  >
                    <option value="">All Companies</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {!profileUser && (
              <div className="te-compose">
                <div className="te-compose-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
                <div className="te-compose-body">
                  <textarea
                    ref={textareaRef}
                    className="te-compose-input"
                    placeholder={postGroupId ? `Post to ${getGroupName(postGroupId)}...` : "Share an update, insight, or AI summary with your team..."}
                    value={newPost}
                    onChange={(e) => { setNewPost(e.target.value); autoResize(e); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleCreatePost(); } }}
                    rows={1}
                  />
                  {imagePreview && (
                    <div className="te-compose-image-preview">
                      <img src={imagePreview} alt="Preview" />
                      <button className="te-compose-image-remove" onClick={removeImage} title="Remove image">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <div className="te-compose-actions">
                    <div className="te-compose-toolbar">
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/gif,image/webp"
                        className="te-hidden-input"
                        onChange={handleImageSelect}
                      />
                      <button className="te-toolbar-btn" onClick={() => imageInputRef.current?.click()} title="Add image">
                        <ImagePlus size={18} />
                      </button>
                      <select
                        className="te-group-select"
                        value={postGroupId}
                        onChange={(e) => setPostGroupId(e.target.value)}
                      >
                        <option value="">Public Post</option>
                        {groups.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                      <span className="te-compose-hint">Enter to post · Shift+Enter new line</span>
                    </div>
                    <button
                      className="te-post-btn"
                      onClick={handleCreatePost}
                      disabled={posting || (!newPost.trim() && !imageFile)}
                    >
                      {uploadingImage ? "Uploading..." : posting ? "Posting..." : <><Send size={14} /> Post</>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="te-loading">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="te-skeleton-card">
                    <div className="te-skeleton-header"><div className="te-skeleton-avatar" /><div className="te-skeleton-lines"><div /><div /></div></div>
                    <div className="te-skeleton-body" />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="te-empty">
                <Sparkles size={40} className="te-empty-icon" />
                <h3>No posts yet</h3>
                <p>Be the first to share an update with your team!</p>
              </div>
            ) : (
              <div className="te-feed">
                {posts.map((post) => {
                  const liked = post.likes?.some((l) => l.user_id === user?.id);
                  const isOwn = post.user_id === user?.id;
                  const commentsOpen = expandedComments[post.id];
                  const isAutoSummary = post.source === 'auto-monthly-summary';

                  return (
                    <div key={post.id} className={`te-card ${isAutoSummary ? 'te-card-ai-summary' : ''}`}>
                      <div className="te-card-header">
                        <div
                          className={`te-card-avatar ${isAutoSummary ? 'te-card-avatar-ai' : ''}`}
                          onClick={() => !isAutoSummary && viewMemberProfile(post.user_id, post.user_name)}
                          style={{ cursor: isAutoSummary ? 'default' : 'pointer' }}
                        >
                          {isAutoSummary ? <Sparkles size={16} /> : post.user_name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="te-card-meta">
                          <span className={`te-card-name ${!isAutoSummary ? 'te-clickable' : ''}`} onClick={() => !isAutoSummary && viewMemberProfile(post.user_id, post.user_name)}>
                            {post.user_name}
                          </span>
                          <span className="te-card-time">
                            {timeAgo(post.created_at)}
                            {post.group_id && <> · <Lock size={10} className="te-inline-icon" /> {getGroupName(post.group_id)}</>}
                          </span>
                        </div>
                        {isAutoSummary && (
                          <span className="te-badge-monthly"><Sparkles size={10} /> Monthly Summary</span>
                        )}
                        {post.source === "ai_chat" && (
                          <span className="te-badge-ai"><Sparkles size={10} /> AI Insight</span>
                        )}
                        {post.group_id && (
                          <span className="te-badge-group"><Lock size={10} /> Private</span>
                        )}
                        {(isOwn || user?.role === 'admin') && (
                          <button className="te-delete-btn" onClick={() => handleDelete(post.id)} title="Delete post">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      {post.content && <div className="te-card-content">{renderMarkdown(post.content)}</div>}

                      {post.image_url && (
                        <div className="te-card-image">
                          <img src={post.image_url} alt="Post attachment" loading="lazy" />
                        </div>
                      )}

                      <div className="te-card-actions">
                        <button className={`te-action-btn ${liked ? "te-liked" : ""}`} onClick={() => handleLike(post.id)}>
                          <Heart size={16} fill={liked ? "currentColor" : "none"} />
                          <span>{post.likes?.length || 0}</span>
                        </button>
                        <button className="te-action-btn" onClick={() => toggleComments(post.id)}>
                          <MessageCircle size={16} />
                          <span>{post.comments?.length || 0}</span>
                          {post.comments?.length > 0 && (commentsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                        </button>
                      </div>

                      {post.likes?.length > 0 && (
                        <div className="te-likes-list">
                          Liked by {post.likes.map((l) => l.user_name).join(", ")}
                        </div>
                      )}

                      {commentsOpen && (
                        <div className="te-comments">
                          {post.comments?.map((c) => (
                            <div key={c.id} className="te-comment">
                              <div className="te-comment-avatar">{c.user_name?.charAt(0).toUpperCase()}</div>
                              <div className="te-comment-body">
                                <div className="te-comment-header">
                                  <span className="te-comment-name">{c.user_name}</span>
                                  <span className="te-comment-time">{timeAgo(c.created_at)}</span>
                                  {(c.user_id === user?.id) && (
                                    <button className="te-comment-delete" onClick={() => handleDeleteComment(post.id, c.id)}>
                                      <Trash2 size={11} />
                                    </button>
                                  )}
                                </div>
                                <p className="te-comment-text">{c.content}</p>
                              </div>
                            </div>
                          ))}

                          <div className="te-comment-input-row">
                            <div className="te-comment-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
                            <input
                              className="te-comment-input"
                              placeholder="Write a comment..."
                              value={commentInputs[post.id] || ""}
                              onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter") handleComment(post.id); }}
                            />
                            <button
                              className="te-comment-send"
                              onClick={() => handleComment(post.id)}
                              disabled={commentingId === post.id || !(commentInputs[post.id] || "").trim()}
                            >
                              <Send size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="te-right-panel">
            <div className="te-panel-card">
              <div className="te-panel-header-row">
                <h3 className="te-panel-title"><Shield size={16} /> Your Groups</h3>
                <button className="te-create-group-btn" onClick={openCreateGroup} title="Create Group"><Plus size={14} /> New</button>
              </div>
              {groups.length === 0 ? (
                <p className="te-panel-empty-hint">No groups yet. Create one to start private conversations.</p>
              ) : (
                <div className="te-panel-groups">
                  {groups.map(g => (
                    <div key={g.id} className={`te-panel-group-item ${activeFilter === g.id ? 'active' : ''}`}>
                      <div className="te-panel-group-info" onClick={() => { setActiveFilter(g.id); loadPosts(g.id); setProfileUser(null); }}>
                        <Lock size={12} className="te-inline-icon" />
                        <span className="te-panel-group-name">{g.name}</span>
                        <span className="te-panel-group-count">{g.member_ids?.length || 0}</span>
                      </div>
                      {g.created_by === user?.id && (
                        <button className="te-group-delete-btn" onClick={() => handleDeleteGroup(g.id)} title="Delete group"><Trash2 size={12} /></button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="te-panel-card">
              <h3 className="te-panel-title"><Users size={16} /> Active Members</h3>
              <div className="te-panel-members">
                {[...new Map(posts.map(p => [p.user_id, p])).values()].slice(0, 8).map((p) => (
                  <div key={p.user_id} className="te-panel-member te-clickable" title={p.user_name} onClick={() => viewMemberProfile(p.user_id, p.user_name)}>
                    <div className="te-panel-member-avatar">{p.user_name?.charAt(0).toUpperCase()}</div>
                    <span className="te-panel-member-name">{p.user_name}</span>
                  </div>
                ))}
                {posts.length === 0 && <p className="te-panel-empty-hint">No activity yet</p>}
              </div>
            </div>

            <div className="te-panel-card te-panel-ai-card">
              <div className="te-panel-ai-icon"><Sparkles size={18} /></div>
              <h3 className="te-panel-title">AI-Powered Insights</h3>
              <p className="te-panel-desc">Monthly summaries are auto-posted from project data. Posts from the AI Advisor are tagged with an <strong>AI Insight</strong> badge.</p>
              {user?.role === 'admin' && (
                <button
                  className="te-trigger-summary-btn"
                  onClick={handleTriggerMonthlySummary}
                  disabled={triggeringSummary}
                  title="Manually trigger a monthly AI summary post"
                >
                  {triggeringSummary ? (
                    <><Sparkles size={13} className="te-spin" /> Generating...</>
                  ) : (
                    <><Sparkles size={13} /> Generate Summary Now</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </Outer>

      {showCreateGroup && (
        <div className="te-modal-overlay" onClick={() => setShowCreateGroup(false)}>
          <div className="te-modal" onClick={e => e.stopPropagation()}>
            <div className="te-modal-header">
              <h3><Shield size={18} /> Create New Group</h3>
              <button className="te-modal-close" onClick={() => setShowCreateGroup(false)}>&times;</button>
            </div>
            <div className="te-modal-body">
              <label className="te-modal-label">Group Name</label>
              <input
                className="te-modal-input"
                type="text"
                placeholder="e.g., Engineering Team"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                maxLength={50}
              />
              <label className="te-modal-label">Add Members</label>
              <div className="te-member-search">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                />
              </div>
              <div className="te-member-picker">
                {allUsers
                  .filter(u => u.id !== user?.id)
                  .filter(u => !memberSearch || u.name?.toLowerCase().includes(memberSearch.toLowerCase()) || u.email?.toLowerCase().includes(memberSearch.toLowerCase()))
                  .map(u => (
                    <label key={u.id} className={`te-member-item ${selectedMembers.includes(u.id) ? 'selected' : ''}`}>
                      <input type="checkbox" checked={selectedMembers.includes(u.id)} onChange={() => toggleMember(u.id)} />
                      <div className="te-member-item-avatar">{u.name?.charAt(0).toUpperCase()}</div>
                      <div className="te-member-item-info">
                        <span className="te-member-item-name">{u.name}</span>
                        <span className="te-member-item-email">{u.email}</span>
                      </div>
                    </label>
                  ))}
                {allUsers.filter(u => u.id !== user?.id).length === 0 && (
                  <p className="te-panel-empty-hint">No other users available</p>
                )}
              </div>
              {selectedMembers.length > 0 && (
                <p className="te-member-count">{selectedMembers.length} member{selectedMembers.length > 1 ? 's' : ''} selected</p>
              )}
            </div>
            <div className="te-modal-footer">
              <button className="te-modal-cancel" onClick={() => setShowCreateGroup(false)}>Cancel</button>
              <button className="te-modal-create" onClick={handleCreateGroup} disabled={creatingGroup || !newGroupName.trim()}>
                {creatingGroup ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Full standalone page with sidebar — used at /theta-engage route
const ThetaEngage = () => {
  const navigate = useNavigate();
  const { logout } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="dashboard-page">
      <button
        className="mobile-menu-button"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div
        className={`mobile-sidebar-overlay ${isMobileMenuOpen ? "open" : ""}`}
        onClick={() => setIsMobileMenuOpen(false)}
        role="button"
        tabIndex={0}
      />

      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      <ThetaEngageContent />
    </div>
  );
};

export default ThetaEngage;
