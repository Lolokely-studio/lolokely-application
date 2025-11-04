import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { postService } from '../services/postService';
import { History, Copy, Calendar, Globe, MessageSquare, Sparkles, Eye, EyeOff } from 'lucide-react';

const PostHistory = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedPosts, setExpandedPosts] = useState({});

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await postService.getPosts();
      setPosts(response.posts || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load posts. Please try again.');
      console.error('Error loading posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (postId) => {
    setExpandedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLanguageName = (code) => {
    const languages = {
      'en': 'English',
      'fr': 'French',
      'es': 'Spanish',
      'de': 'German',
      'it': 'Italian'
    };
    return languages[code] || code;
  };

  if (loading) {
    return (
      <div className="min-h-screen py-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-foreground flex items-center gap-3">
                <History className="h-8 w-8 text-primary-600" />
                Post History
              </h1>
              <p className="mt-2 text-muted">
                View and manage all your generated social media posts.
              </p>
            </div>
            <Link
              to="/posts"
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-primary-500/25 bg-primary-500/10 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-primary-500/25 hover:border-primary-500/50"
            >
              <Sparkles className="h-4 w-4" />
              Generate New Post
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-red-600">
            {error}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-primary-500/25 bg-card p-12 text-center">
            <Sparkles className="mx-auto mb-4 h-16 w-16 text-primary-500/60" />
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              No Posts Yet
            </h3>
            <p className="text-muted">
              Start generating posts to see them here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {posts.map((post) => {
              const isExpanded = expandedPosts[post.id];
              // Handle both string (JSON) and array formats
              let variations = [];
              try {
                if (typeof post.generated_variations === 'string') {
                  variations = JSON.parse(post.generated_variations);
                } else if (Array.isArray(post.generated_variations)) {
                  variations = post.generated_variations;
                }
              } catch (e) {
                console.error('Error parsing variations:', e);
                variations = [];
              }

              return (
                <div
                  key={post.id}
                  className="rounded-2xl border border-primary-500/25 bg-card p-6 hover:border-primary-500/50 transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        {post.theme || 'Untitled Post'}
                      </h3>
                      {post.description && (
                        <p className="text-muted mb-3">{post.description}</p>
                      )}
                      
                      {/* Metadata Tags */}
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/25">
                          <Globe className="h-4 w-4 text-primary-600" />
                          <span className="text-sm font-medium text-foreground">{post.platform}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/25">
                          <MessageSquare className="h-4 w-4 text-primary-600" />
                          <span className="text-sm font-medium text-foreground">{post.tonality}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/25">
                          <span className="text-sm font-medium text-foreground">
                            {getLanguageName(post.language)}
                          </span>
                        </div>
                        {post.target_audience && (
                          <div className="px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/25">
                            <span className="text-sm font-medium text-foreground">
                              {post.target_audience}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/25">
                          <Calendar className="h-4 w-4 text-primary-600" />
                          <span className="text-sm text-muted">
                            {formatDate(post.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => toggleExpand(post.id)}
                      className="ml-4 p-2 rounded-xl hover:bg-primary-500/10 transition-colors"
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? (
                        <EyeOff className="h-5 w-5 text-foreground" />
                      ) : (
                        <Eye className="h-5 w-5 text-foreground" />
                      )}
                    </button>
                  </div>

                  {/* Selected Variation Preview */}
                  <div className="mb-4 rounded-xl border border-primary-500/25 bg-background p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-semibold text-foreground">Selected Post</h4>
                      <button
                        onClick={() => handleCopy(post.selected_variation)}
                        className="p-1 rounded-lg hover:bg-primary-500/10 transition-colors"
                        aria-label="Copy to clipboard"
                      >
                        <Copy className="h-4 w-4 text-muted hover:text-foreground" />
                      </button>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {post.selected_variation}
                    </p>
                  </div>

                  {/* Media Preview */}
                  {post.media_url && (
                    <div className="mb-4 rounded-xl overflow-hidden border border-primary-500/25">
                      {post.media_type === 'image' ? (
                        <img
                          src={post.media_url}
                          alt="Post media"
                          className="w-full object-cover"
                        />
                      ) : (
                        <video
                          src={post.media_url}
                          controls
                          className="w-full"
                        />
                      )}
                    </div>
                  )}

                  {/* Expanded View - All Variations */}
                  {isExpanded && variations.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-primary-500/25">
                      <h4 className="text-sm font-semibold text-foreground mb-3">
                        All Generated Variations ({variations.length})
                      </h4>
                      <div className="space-y-3">
                        {variations.map((variation, index) => {
                          // Handle both string and object formats
                          const variationText = typeof variation === 'string' 
                            ? variation 
                            : (variation?.text || variation?.variation || String(variation));
                          const isSelected = variationText === post.selected_variation;
                          
                          return (
                            <div
                              key={index}
                              className={`rounded-xl border p-4 ${
                                isSelected
                                  ? 'border-primary-500 bg-primary-500/10'
                                  : 'border-primary-500/25 bg-background'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-semibold text-foreground">
                                      Variation {index + 1}
                                    </span>
                                    {isSelected && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-600 border border-primary-500/25">
                                        Selected
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted whitespace-pre-wrap">
                                    {variationText}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleCopy(variationText)}
                                  className="ml-2 p-1 rounded-lg hover:bg-primary-500/10 transition-colors"
                                  aria-label="Copy to clipboard"
                                >
                                  <Copy className="h-4 w-4 text-muted hover:text-foreground" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PostHistory;

