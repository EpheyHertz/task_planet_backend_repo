import { Router } from 'express';
import { body } from 'express-validator';
import {
  createPost,
  getPosts,
  getPost,
  likePost,
  addComment,
  deletePost,
  updatePost,
  deletePostImage,
  uploadImages,
} from '../controllers/postController';
import { protect } from '../middleware/authMiddleware';
import { upload } from '../config/cloudinary';

const router = Router();

// Validation rules
const createPostValidation = [
  body('content')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Content cannot exceed 2000 characters'),
];

const commentValidation = [
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Comment text is required')
    .isLength({ max: 500 })
    .withMessage('Comment cannot exceed 500 characters'),
];

// Routes
router.get('/', getPosts);
router.get('/:id', getPost);

// Create post with multiple images (up to 5)
router.post('/', protect, upload.array('images', 5), createPostValidation, createPost);

// Update post with new images
router.put('/:id', protect, upload.array('images', 5), updatePost);

// Upload images only
router.post('/upload', protect, upload.array('images', 5), uploadImages);

// Delete specific image from post
router.delete('/:id/images/:publicId', protect, deletePostImage);

// Like and comment
router.post('/:id/like', protect, likePost);
router.post('/:id/comment', protect, commentValidation, addComment);

// Delete post
router.delete('/:id', protect, deletePost);

export default router;
