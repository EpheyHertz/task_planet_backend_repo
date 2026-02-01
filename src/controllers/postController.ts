import { Response } from 'express';
import { validationResult } from 'express-validator';
import Post from '../models/Post';
import User from '../models/User';
import { AuthRequest } from '../types';
import { deleteImage } from '../config/cloudinary';

// Interface for uploaded file from multer-cloudinary
interface MulterFile {
  path: string;
  filename: string;
}

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
export const createPost = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        errors: errors.array(),
      });
      return;
    }

    const { content } = req.body;
    const files = req.files as MulterFile[] | undefined;

    // Validate at least one field is provided
    if (!content && (!files || files.length === 0)) {
      res.status(400).json({
        success: false,
        error: 'Post must have either content or at least one image',
      });
      return;
    }

    // Get user info
    const user = await User.findById(req.user?.id);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Process uploaded images
    const images = files?.map((file) => ({
      url: file.path,
      publicId: file.filename,
    })) || [];

    const post = await Post.create({
      author: user._id,
      authorUsername: user.username,
      authorProfilePicture: user.profilePicture,
      content,
      images,
    });

    res.status(201).json({
      success: true,
      data: post,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error creating post',
    });
  }
};

// @desc    Get all posts (paginated feed)
// @route   GET /api/posts
// @access  Public
export const getPosts = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const totalPosts = await Post.countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalPosts / limit);

    res.status(200).json({
      success: true,
      data: posts,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalPosts,
        hasMore: page < totalPages,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching posts',
    });
  }
};

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Public
export const getPost = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      res.status(404).json({
        success: false,
        error: 'Post not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching post',
    });
  }
};

// @desc    Like/Unlike a post
// @route   POST /api/posts/:id/like
// @access  Private
export const likePost = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      res.status(404).json({
        success: false,
        error: 'Post not found',
      });
      return;
    }

    const username = req.user?.username;
    if (!username) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
      return;
    }

    const hasLiked = post.likes.users.includes(username);

    if (hasLiked) {
      // Unlike - remove username from array
      post.likes.users = post.likes.users.filter((u) => u !== username);
      post.likes.count = Math.max(0, post.likes.count - 1);
    } else {
      // Like - add username to array
      post.likes.users.push(username);
      post.likes.count += 1;
    }

    await post.save();

    res.status(200).json({
      success: true,
      data: {
        likes: post.likes,
        liked: !hasLiked,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error liking post',
    });
  }
};

// @desc    Add comment to a post
// @route   POST /api/posts/:id/comment
// @access  Private
export const addComment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        errors: errors.array(),
      });
      return;
    }

    const { text } = req.body;

    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({
        success: false,
        error: 'Post not found',
      });
      return;
    }

    const user = await User.findById(req.user?.id);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    const newComment = {
      userId: user._id,
      username: user.username,
      text,
      createdAt: new Date(),
    };

    post.comments.push(newComment as any);
    await post.save();

    res.status(201).json({
      success: true,
      data: post.comments[post.comments.length - 1],
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error adding comment',
    });
  }
};

// @desc    Update a post
// @route   PUT /api/posts/:id
// @access  Private (owner only)
export const updatePost = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      res.status(404).json({
        success: false,
        error: 'Post not found',
      });
      return;
    }

    // Check if user owns the post
    if (post.author.toString() !== req.user?.id) {
      res.status(403).json({
        success: false,
        error: 'Not authorized to edit this post',
      });
      return;
    }

    const { content, imagesToDelete } = req.body;
    const files = req.files as MulterFile[] | undefined;

    // Parse imagesToDelete if it's a string (from form-data)
    let deleteList: string[] = [];
    if (imagesToDelete) {
      try {
        deleteList = typeof imagesToDelete === 'string' 
          ? JSON.parse(imagesToDelete) 
          : imagesToDelete;
      } catch {
        deleteList = Array.isArray(imagesToDelete) ? imagesToDelete : [imagesToDelete];
      }
    }

    // Delete specified images from Cloudinary
    if (deleteList.length > 0) {
      for (const publicId of deleteList) {
        await deleteImage(publicId);
        post.images = post.images.filter((img) => img.publicId !== publicId);
      }
    }

    // Add new uploaded images
    if (files && files.length > 0) {
      const newImages = files.map((file) => ({
        url: file.path,
        publicId: file.filename,
      }));
      post.images.push(...newImages);
    }

    // Update content
    if (content !== undefined) {
      post.content = content;
    }

    // Validate post still has content or images
    if (!post.content && post.images.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Post must have either content or at least one image',
      });
      return;
    }

    // Mark post as edited
    post.isEdited = true;
    post.editedAt = new Date();

    await post.save();

    res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error updating post',
    });
  }
};

// @desc    Delete an image from a post
// @route   DELETE /api/posts/:id/images/:publicId
// @access  Private (owner only)
export const deletePostImage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      res.status(404).json({
        success: false,
        error: 'Post not found',
      });
      return;
    }

    // Check if user owns the post
    if (post.author.toString() !== req.user?.id) {
      res.status(403).json({
        success: false,
        error: 'Not authorized to edit this post',
      });
      return;
    }

    const publicId = req.params.publicId as string;
    
    // Find and remove the image
    const imageIndex = post.images.findIndex((img) => img.publicId === publicId);
    if (imageIndex === -1) {
      res.status(404).json({
        success: false,
        error: 'Image not found in post',
      });
      return;
    }

    // Check if post will still have content
    if (!post.content && post.images.length === 1) {
      res.status(400).json({
        success: false,
        error: 'Cannot delete last image. Post must have content or images.',
      });
      return;
    }

    // Delete from Cloudinary
    await deleteImage(publicId);
    
    // Remove from post
    post.images.splice(imageIndex, 1);
    await post.save();

    res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error deleting image',
    });
  }
};

// @desc    Upload images (standalone endpoint)
// @route   POST /api/posts/upload
// @access  Private
export const uploadImages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const files = req.files as MulterFile[] | undefined;

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No images uploaded',
      });
      return;
    }

    const images = files.map((file) => ({
      url: file.path,
      publicId: file.filename,
    }));

    res.status(200).json({
      success: true,
      data: images,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error uploading images',
    });
  }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private (owner only)
export const deletePost = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      res.status(404).json({
        success: false,
        error: 'Post not found',
      });
      return;
    }

    // Check if user owns the post
    if (post.author.toString() !== req.user?.id) {
      res.status(403).json({
        success: false,
        error: 'Not authorized to delete this post',
      });
      return;
    }

    // Delete all images from Cloudinary
    for (const image of post.images) {
      await deleteImage(image.publicId);
    }

    await post.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error deleting post',
    });
  }
};
