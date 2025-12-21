import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Heart, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useCommunityPosts, useCreatePost, useToggleLike, useDeletePost } from "@/hooks/useCommunity";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Community() {
  const { user } = useAuth();
  const { data: posts, isLoading } = useCommunityPosts();
  const createPost = useCreatePost();
  const toggleLike = useToggleLike();
  const deletePost = useDeletePost();
  const [newPost, setNewPost] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    try {
      await createPost.mutateAsync(newPost.trim());
      setNewPost("");
      toast.success("Post shared!");
    } catch {
      toast.error("Failed to create post");
    }
  };

  if (!user) {
    return (
      <div className="container py-16 text-center">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-display font-bold mb-2">Join the Community</h2>
        <p className="text-muted-foreground mb-6">Sign in to share updates and connect with others.</p>
        <Link to="/auth"><Button>Sign In</Button></Link>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2">Community Feed</h1>
        <p className="text-muted-foreground">Share updates, ask questions, and celebrate wins!</p>
      </div>

      {/* Create Post */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Textarea
              placeholder="Share an update... Did you get shortlisted? Have questions about an opportunity?"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={500}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">{newPost.length}/500</span>
              <Button type="submit" disabled={!newPost.trim() || createPost.isPending}>
                <Send className="h-4 w-4 mr-2" />
                Post
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Posts */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="h-4 w-24 bg-muted rounded" />
              </CardHeader>
              <CardContent><div className="h-16 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      ) : !posts?.length ? (
        <Card className="text-center py-12">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
          <p className="text-muted-foreground">Be the first to share something!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="group">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {(post.profile?.full_name?.[0] || post.profile?.email?.[0] || "U").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{post.profile?.full_name || "Anonymous"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {post.user_id === user.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => deletePost.mutate(post.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap mb-3">{post.content}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("gap-2 text-muted-foreground", post.user_liked && "text-destructive")}
                  onClick={() => toggleLike.mutate({ postId: post.id, isLiked: !!post.user_liked })}
                >
                  <Heart className={cn("h-4 w-4", post.user_liked && "fill-current")} />
                  {post.likes_count || 0}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
