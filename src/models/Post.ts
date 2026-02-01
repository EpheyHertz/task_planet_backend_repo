import mongoose, { Document, Schema } from 'mongoose';

// Image subdocument interface
export interface IImageDocument {
  url: string;
  publicId: string;
}

// Comment subdocument interface
export interface ICommentDocument {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  username: string;
  text: string;
  createdAt: Date;
}

// Post document interface
export interface IPostDocument extends Document {
  _id: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  authorUsername: string;
  authorProfilePicture?: string;
  content?: string;
  images: IImageDocument[];
  likes: {
    count: number;
    users: string[]; // usernames
  };
  comments: ICommentDocument[];
  isEdited: boolean;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const imageSchema = new Schema<IImageDocument>(
  {
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const commentSchema = new Schema<ICommentDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

const postSchema = new Schema<IPostDocument>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorUsername: {
      type: String,
      required: true,
    },
    authorProfilePicture: {
      type: String,
      default: '',
    },
    content: {
      type: String,
      trim: true,
      maxlength: [2000, 'Post content cannot exceed 2000 characters'],
    },
    images: {
      type: [imageSchema],
      default: [],
    },
    likes: {
      count: {
        type: Number,
        default: 0,
      },
      users: {
        type: [String], // array of usernames
        default: [],
      },
    },
    comments: {
      type: [commentSchema],
      default: [],
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure at least content or images is provided
postSchema.pre('save', function () {
  if (!this.content && this.images.length === 0) {
    throw new Error('Post must have either content or at least one image');
  }
});

// Index for efficient feed queries
postSchema.index({ createdAt: -1 });

const Post = mongoose.model<IPostDocument>('Post', postSchema);

export default Post;
